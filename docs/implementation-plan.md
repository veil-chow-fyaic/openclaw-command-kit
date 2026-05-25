# Implementation Plan: OpenClaw Native Session Commands

Date: 2026-05-25
Status: Implemented — Extension Plugin architecture

---

## 1. Project Context & Constraints

### 1.1 What This Project Is
- Build `/sessions`, `/resume`, `/resume N` as native-feeling chat commands for OpenClaw
- Channel-agnostic at core, WeCom-first in delivery
- Reuse OpenClaw Gateway/session primitives; NO duplicate storage
- Security-first: actor scope + route scope must both resolve before any list/restore

### 1.2 What This Project Is NOT
- NOT a WeCom Side Panel feature
- NOT a generic session manager for Claude Code / Codex CLI / Gemini CLI
- NOT a dashboard UI
- NOT a bridge-local mapping JSON service

### 1.3 Hard Constraints Discovered from Codebase Analysis

| Constraint | Evidence | Impact |
|---|---|---|
| OpenClaw `plugin-sdk` exposes `registerCommand()` | `openclaw/plugin-sdk/plugins/types` exports `OpenClawPluginApi.registerCommand()` | Extension plugins CAN register new slash commands that bypass LLM and are evaluated before built-in commands |
| `PluginCommandContext` lacks `sessionKey` and `organization` | Type definition only has `senderId`, `channel`, `to`, `accountId`, `from`, `messageThreadId` | Must reverse-lookup route metadata via `sessions.list` RPC |
| OpenClaw sessions stored at `~/.openclaw/agents/<agentId>/sessions/` | B-bridge `GatewayOpenClawAdapter` reads/writes `sessions.json` | Proven restore strategy exists |
| Gateway RPCs available via CLI | `openclaw gateway call <method> --json` | Can call `sessions.list`, `chat.history`, `send` from TypeScript |
| OpenClaw source repo NOT cloned locally | Only compiled `dist/` in `/opt/homebrew/lib/node_modules/openclaw/` | Upstream PR is out of scope for this iteration; must work as extension plugin |

### 1.4 Prior Proven Implementation
The B-bridge (`/Users/fuyo-aic/Projects/openclaw-session-bridge/app/adapters.py`) already implements the EXACT algorithm we need:

1. `_auto_wecom_scope_record()` — builds route scope from WeCom binding
2. `_lookup_sessions()` — lists scoped sessions via `sessions.list` RPC
3. `_restore_route_generation()` — modifies `sessions.json` to point route to historical generation
4. `_read_restored_session()` — read-back confirmation via `chat.history` RPC
5. `_enrich_session_from_history()` — derives title/preview from transcript

This is our reference implementation. We port the logic to TypeScript, keep the same safety semantics, and ship it as an OpenClaw extension plugin.

---

## 2. Architecture Decision

### 2.1 Discovery: `plugin-sdk` Command Registration

Initial analysis assumed OpenClaw command registration was build-time hardcoded and channel plugins could not inject new slash commands. However, the `openclaw/plugin-sdk` exposes an **`OpenClawPluginApi.registerCommand()`** API that allows extension plugins to register commands which:

- Bypass LLM processing entirely
- Are matched and executed before built-in commands
- Receive a `PluginCommandContext` containing `senderId`, `channel`, `to`, `accountId`, etc.
- Return a `PluginCommandResult` that OpenClaw delivers back through the same channel

**This means a channel-agnostic extension plugin is possible without modifying OpenClaw source code.**

### 2.2 Chosen Architecture: Core Library + OpenClaw Extension Plugin

The repository ships two layers:

1. **`packages/core/`** — Channel-agnostic core services (scope resolution, session listing, restore, formatting). Zero OpenClaw or channel dependencies.
2. **`packages/plugin/`** — OpenClaw Extension Plugin that uses `plugin-sdk` to register `/sessions` and `/resume` commands, internally delegating to `core` services.

**Why this works:**
- OpenClaw loads extension plugins from `~/.openclaw/extensions/` (or via npm global + `openclaw.extensions` in `package.json`)
- Once loaded, `registerCommand` makes the command available in **every channel** OpenClaw supports (WeCom, Telegram, Slack, Discord, WebChat, etc.)
- No per-channel adapter code is required
- No modification to OpenClaw source code or compiled `dist/` is required
- Plugin is independently packageable and distributable via npm

### Component Diagram

```
Channel Message Ingress (WeCom / Telegram / Slack / ...)
  |
  v
OpenClaw Core Dispatch
  |-- Checks extension plugin commands FIRST
  |
  v
[Extension Plugin: Command Handlers]
  |-- Receives PluginCommandContext { senderId, channel, to, accountId, ... }
  |-- Calls deriveScopes() to reverse-lookup RouteScope + ActorScope
  |
  v
[Core: Command Router] (channel-agnostic)
  |-- /sessions  --> [Core: Session History Service] --> [Core: Response Formatter]
  |-- /resume    --> [Core: Session History Service] --> [Core: Response Formatter]
  |-- /resume N  --> [Core: Restore Service] --> [Core: Response Formatter]
  |
  v
OpenClaw Core Dispatch (delivers reply back through same channel)
```

### Core Services (channel-agnostic, reusable across all channels)

```
packages/core/src/
  types.ts                     # ActorScope, RouteScope, ResumeListItem, CommandResult
  gateway-client.ts            # Typed wrapper for `openclaw gateway call`
  actor-scope-resolver.ts      # Validate ActorScope; fail-closed
  route-scope-resolver.ts      # Validate RouteScope; fail-closed
  session-history-service.ts   # List scoped sessions via Gateway RPC
  restore-service.ts           # Restore route generation + read-back confirm
  response-formatter.ts        # Format chat-friendly Chinese reply text
  command-router.ts            # Parse /sessions, /resume, /resume N; route to services
  index.ts                     # Public API surface
```

### Extension Plugin (`packages/plugin/`)

```
packages/plugin/src/
  index.ts                     # Plugin entry point: registerCommand() calls
  scope-deriver.ts             # Reverse-lookup ActorScope + RouteScope from PluginCommandContext
  command-handlers.ts          # /sessions, /resume, /resume N handlers
```

The plugin is a thin glue layer. It:
1. Receives `PluginCommandContext` from OpenClaw
2. Derives full scopes via `sessions.list` reverse-lookup (since `PluginCommandContext` lacks `sessionKey` and `organization`)
3. Delegates to `core` services
4. Returns `{ text: ... }` for OpenClaw to deliver

No channel-specific code exists in either `core` or `plugin`.

---

## 3. Task Breakdown

### Phase 0: Scaffold & Tooling
**Goal**: Set up the monorepo structure, TypeScript config, and OpenClaw Gateway client.

**Tasks**:
1. Initialize `packages/core/` as a TypeScript package
2. Set up shared tsconfig, build script, and test runner (vitest)
3. Implement `gateway-client.ts`:
   - Wrapper around `openclaw gateway call <method> --json --params ...`
   - Methods: `sessionsList(params)`, `chatHistory(params)`, `send(params)`
   - Timeout handling, JSON parsing, error normalization
4. Define `types.ts` with interfaces from spec:
   - `ActorScope`, `RouteScope`, `ResumeListItem`, `SessionSummary`
5. Add `.gitignore`, `package.json` workspace root config

**Acceptance**:
- `npm run build` succeeds
- `gateway-client.ts` can successfully call `sessions.list` and return typed result
- Unit test: gateway client handles JSON parse errors and timeouts

**Input**: Nothing (greenfield)
**Output**: `packages/core/src/{gateway-client,types}.ts` + build infra

---

### Phase 1: Scope Resolution
**Goal**: Implement actor and route scope resolution with fail-closed behavior.

**Tasks**:
1. Implement `actor-scope-resolver.ts`:
   - Input: generic channel context (provider, senderId, accountId, org)
   - Output: `ActorScope` or `null` (fail closed)
   - Validation: `senderId` must be non-empty
2. Implement `route-scope-resolver.ts`:
   - Input: generic channel context (provider, chatType, sessionKey, accountId, org, label)
   - Output: `RouteScope` or `null` (fail closed)
   - Validation: `sessionKey` and `chatType` must be non-empty
3. Provide generic resolvers that validate the common shape.
4. Unit tests for generic resolvers with synthetic scopes

**Acceptance**:
- Missing `senderId` -> returns null -> replies "无法确认当前用户身份..."
- Missing `sessionKey` -> returns null -> replies "无法确认当前聊天范围..."
- WeCom direct chat vs group chat produce different `chatType`
- Two identical display labels with different actors do not resolve to same scope

**Input**: Phase 0 output
**Output**: `packages/core/src/*-resolver.ts`, tests

---

### Phase 2: Session History Service (Read-Only `/sessions`)
**Goal**: Implement `/sessions` command that lists scoped, resumable sessions.

**Tasks**:
1. Implement `session-history-service.ts`:
   - `listSessions(actorScope, routeScope)` -> `ResumeListItem[]`
   - Calls `gatewayClient.sessionsList({ agentId, limit, search })`
   - Filters results by route scope (account, org, chatType, sessionKey matching)
   - Expands historical generations from JSONL transcript files (port from B-bridge `_expand_session_generations`)
   - Sorts by `updatedAt` desc
   - Hides raw `sessionId`; exposes only display index
2. Implement `response-formatter.ts`:
   - `formatSessionList(items, currentItem)` -> Chinese text block per spec
   - Includes current session header, numbered list, hint line
3. Wire `CommandRouter` to route `/sessions` -> `SessionHistoryService` -> `ResponseFormatter`
4. Unit tests for filtering, sorting, formatting

**Acceptance**:
- `/sessions` returns only sessions matching the provided route scope
- Empty list replies "当前聊天还没有可恢复的历史对话。"
- Missing actor/route scope fails closed with correct error text
- Output is compact, no raw session ids, no debug info

**Input**: Phase 1 output
**Output**: Working `/sessions` routing in core

---

### Phase 3: Restore Service (`/resume` & `/resume N`)
**Goal**: Implement session restore with read-back confirmation.

**Tasks**:
1. Implement `restore-service.ts`:
   - `buildResumeList(actorScope, routeScope)` -> same as `/sessions` list
   - `restoreSession(actorScope, routeScope, displayIndex)` -> `RestoreResult`
   - Algorithm:
     a. Recompute scoped list
     b. Map `displayIndex` to `sessionId`
     c. Validate selected session belongs to authorized route
     d. Backup `sessions.json` (atomic copy)
     e. Modify `sessions.json` route entry: update `sessionId` + `sessionFile`
     f. Read back via `chat.history` with `sessionKey`
     g. Confirm `sessionId` in read-back matches selected
     h. Return success/failure
   - Port B-bridge logic: `_restore_route_generation()`, `_read_restored_session()`, `_atomic_write_json_with_backup()`
2. Update `CommandRouter`:
   - `/resume` (no arg) -> show same list as `/sessions` + stronger hint
   - `/resume N` (numeric) -> call restore service
3. Add error responses:
   - Invalid number: "没有第 N 个对话。请发送 /sessions 查看可选项。"
   - Route mismatch: "这个对话不属于当前聊天，已拒绝切换。"
   - Read-back failure: "OpenClaw 未确认切换完成，后续消息不会被标记为已切换。"
4. Unit tests for restore validation, backup, read-back

**Acceptance**:
- `/resume 2` switches to the 2nd item in the scoped list
- After switch, next user message references restored context
- `/new` after `/resume 2` creates fresh generation for same route
- Invalid numbers do NOT mutate route state
- Read-back failure reports failure, NOT success
- Cross-route session selection is blocked

**Input**: Phase 2 output
**Output**: Working `/resume` and `/resume N` routing in core

---

### Phase 4: Extension Plugin (`packages/plugin/`)
**Goal**: Build the OpenClaw Extension Plugin that bridges `plugin-sdk` to `core`.

**Tasks**:
1. Create `packages/plugin/` package with `package.json`, `tsconfig.json`
2. Implement `scope-deriver.ts`:
   - Input: `PluginCommandContext` (has `channel`, `senderId`, `to`, `accountId`, `messageThreadId`)
   - Calls `gateway.sessionsList()` to reverse-lookup `sessionKey`, `organization`, `chatType`
   - Matches by `deliveryContext.channel`, `deliveryContext.to`, `deliveryContext.accountId`
   - Builds `ActorScope` via `resolveActorScope()`
   - Builds `RouteScope` via `resolveRouteScope()` with reconstructed `sessionKey`
   - Returns `{ actor, route }` or `null` (fail closed)
3. Implement `command-handlers.ts`:
   - Wraps `SessionCommandHandlers` class
   - `handleSessions()`, `handleResume()`, `handleResumeByIndex()`
   - Each calls `deriveScopes()` first, fails closed if null
4. Implement `index.ts` (plugin entry point):
   - Exports `OpenClawPluginDefinition`
   - `register(api)` calls `api.registerCommand()` for `sessions` and `resume`
5. Set up `tsconfig.json` with `paths` mapping to `openclaw/plugin-sdk` types
6. Unit tests for `scope-deriver.ts` (mock `gateway.sessionsList`)

**Acceptance**:
- `npm run build` succeeds for both `core` and `plugin`
- All unit tests pass (core + plugin)
- `scope-deriver.ts` correctly reconstructs WeCom session key from `sessions.list`
- Unsupported channels return `null` gracefully
- Plugin exports valid `OpenClawPluginDefinition`

**Input**: Phase 3 output
**Output**: `packages/plugin/` built and tested

---

### Phase 5: Query Search (Optional / Deferred)
**Goal**: Implement `/sessions <query>` and `/resume <query>`.

**Tasks**:
1. Extend command parser to accept optional query argument
2. Filter scoped sessions by title, preview, last message, time
3. `/resume <query>`: if exactly one strong match, switch; if multiple, show list; if none, error

**Acceptance**:
- Search runs ONLY after route scope filtering
- Ambiguous results never auto-switch

**Input**: Phase 4 output
**Output**: Query mode support

---

## 4. Key File Locations

| Purpose | Path |
|---|---|
| Agent Task Brief (source of truth) | `/Users/fuyo-aic/Projects/openclaw-command-kit/docs/agent-task-brief.md` |
| Resume Command Spec | `/Users/fuyo-aic/Projects/openclaw-command-kit/docs/resume-command-spec.md` |
| Channel Interaction Spec | `/Users/fuyo-aic/Projects/openclaw-command-kit/docs/channel-interaction.md` |
| Architecture Doc | `/Users/fuyo-aic/Projects/openclaw-command-kit/docs/architecture.md` |
| B-bridge reference impl | `/Users/fuyo-aic/Projects/openclaw-session-bridge/app/adapters.py` |
| B-bridge models | `/Users/fuyo-aic/Projects/openclaw-session-bridge/app/models.py` |
| OpenClaw session store dir | `~/.openclaw/agents/main/sessions/` |
| OpenClaw sessions.json | `~/.openclaw/agents/main/sessions/sessions.json` |

---

## 5. Security Checklist (Non-Negotiable)

- [x] Actor scope resolves BEFORE any session list or restore
- [x] Route scope resolves BEFORE any session list or restore
- [x] `SenderName` / `ConversationLabel` are display ONLY, never authorization
- [x] Numeric index maps to freshly computed scoped list, never raw `session_id`
- [x] Bare numeric replies (`2`) do NOT trigger switching
- [x] Global session search is NEVER used as fallback
- [x] Restore mutates `sessions.json` only after validating session belongs to route
- [x] Backup created before any `sessions.json` write
- [x] Read-back via `chat.history` confirms switch before reporting success
- [x] Cross-actor, cross-account, cross-org, direct-vs-group isolation tested

---

## 6. Test Strategy

### Unit Tests (Vitest)
- Command parser: `/sessions`, `/resume`, `/resume 2`, `/resume invalid`
- Actor resolver: valid, missing senderId, missing accountId
- Route resolver: valid, missing sessionKey, direct vs group
- Session history: empty list, scoped list, cross-scope filtering
- Restore service: valid restore, invalid index, route mismatch, read-back failure
- Response formatter: output format, max length, no raw ids
- Scope deriver: missing senderId/to, WeCom match, no match, unsupported channel, threadId conversion

### Manual Verification (WeCom)
1. Send `/new` -> confirm new context
2. Have a conversation -> confirm transcript saved
3. Send `/sessions` -> confirm list shows scoped sessions only
4. Send `/resume N` -> confirm switch + confirmation message
5. Send follow-up message -> confirm it uses restored context
6. Send `/new` -> confirm fresh generation
7. From DIFFERENT chat route -> confirm cannot see previous route's sessions

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenClaw Gateway RPC behavior differs from B-bridge assumptions | Medium | High | Test `sessions.list` and `chat.history` output shape early in Phase 0 |
| `sessions.json` format changes in future OpenClaw versions | Low | High | Keep restore logic isolated; add version detection if possible |
| Plugin `registerCommand` API changes in future OpenClaw versions | Low | High | Pin `openclaw` peer dependency range; monitor changelog |
| Session listing is slow due to JSONL scanning | Medium | Medium | Cache generation summaries; limit scan depth |
| `PluginCommandContext` shape changes (fields removed) | Low | High | Fail closed; deriveScopes returns null if required fields missing |

---

## 8. Definition of Done

- [x] `/sessions` lists scoped sessions via core router
- [x] `/resume` shows picker with numeric hints
- [x] `/resume N` restores and confirms via read-back
- [x] Core logic has no WeCom-specific assumptions
- [x] Actor + route scope isolation has unit tests
- [x] Cross-route leakage is tested and blocked
- [x] Extension plugin (`packages/plugin/`) builds and exports valid `OpenClawPluginDefinition`
- [ ] Manual end-to-end verification in a real OpenClaw channel passes all 7 steps
- [x] No Side Panel dependency, no bridge-local mapping JSON
- [x] Response text matches spec examples (Chinese, compact, no raw ids)
- [x] No modification to OpenClaw source code or compiled `dist/`
- [x] No modification to user-local channel extensions (`~/.openclaw/extensions/`)

---

## 9. Installation & Distribution

### Local Install (Development)

```bash
cd packages/plugin
npm run build
ln -s $(pwd)/dist ~/.openclaw/extensions/openclaw-command-kit
# Or copy: cp -r dist ~/.openclaw/extensions/openclaw-command-kit
```

### npm Install (Production)

```bash
npm install -g @openclaw-commands/plugin
# OpenClaw auto-detects via `openclaw.extensions` in package.json
```

### Package Structure

```
openclaw-command-kit/
  package.json          # workspace root
  tsconfig.json         # shared tsconfig
  vitest.config.ts      # test runner
  packages/
    core/               # channel-agnostic session commands
      package.json      # @openclaw-commands/core
      tsconfig.json
      src/
      tests/
    plugin/             # OpenClaw Extension Plugin
      package.json      # @openclaw-commands/plugin
      tsconfig.json
      src/
      tests/
```

When the loop agent starts, give it:
1. This plan (`docs/implementation-plan.md`)
2. The agent task brief (`docs/agent-task-brief.md`)
3. Permission to read B-bridge code for reference (`../openclaw-session-bridge/app/adapters.py`)
4. Clear boundary: do NOT modify compiled OpenClaw in `/opt/homebrew/...`; do NOT modify user-local extensions in `~/.openclaw/extensions/`. This repo is a library + plugin, not a patch.
