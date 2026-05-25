# Loop Agent Runbook: OpenClaw Native Session Commands

This document is the primary execution guide for `/unattended loop`. Read this first, then follow phase by phase. Do not skip phases.

## Start Here

1. Read `docs/implementation-plan.md` for architecture context.
2. Read `docs/security-contract.md` — every rule is mandatory.
3. Read `docs/agent-task-brief.md` for product requirements.
4. Read B-bridge reference: `../openclaw-session-bridge/app/adapters.py` (focus on `GatewayOpenClawAdapter` methods).
5. Your working directory: `/Users/fuyo-aic/Projects/openclaw-command-kit/`

## Phase Execution Order

### Phase 0: Gateway Client & Build
**Goal**: `gateway-client.ts` can call `sessions.list` and return typed results. Build passes.

**Tasks**:
- Implement `GatewayClient.sessionsList()` using `openclaw gateway call sessions.list --json`
- Implement `GatewayClient.chatHistory()` using `openclaw gateway call chat.history --json`
- Implement `GatewayClient.send()` using `openclaw gateway call send --json`
- Add timeout handling, JSON parsing, error normalization
- Write unit tests: timeout, JSON parse error, success

**Self-check**:
```bash
npm run build   # must pass
npx vitest run packages/core/tests/gateway-client.test.ts   # must pass
```

**Reference**: B-bridge `_gateway_call()` at `adapters.py:681`.

---

### Phase 1: Scope Resolution
**Goal**: Actor and route scope resolve with fail-closed behavior.

**Tasks**:
- Implement `actor-scope-resolver.ts`: validate `senderId` non-empty
- Implement `route-scope-resolver.ts`: validate `sessionKey` + `chatType` non-empty
- Unit tests for valid, missing, and edge cases

**Self-check**:
- Missing `senderId` -> returns null
- Missing `sessionKey` -> returns null
- `chatType: "single"` normalizes to `"direct"`
- `chatType: "chatroom"` normalizes to `"group"`

---

### Phase 2: /sessions (Read-Only)
**Goal**: `/sessions` lists scoped sessions.

**Tasks**:
- Implement `session-history-service.ts`:
  - Call `gatewayClient.sessionsList()`
  - Filter by route scope (account, org, chatType, sessionKey matching)
  - Sort by `updatedAt` desc
  - Derive title/preview from transcript (port `_enrich_session_from_history` from B-bridge)
  - Expose display indexes only
- Implement `response-formatter.ts`:
  - Format Chinese text per `docs/command-catalog.md` examples
  - Empty list -> `当前聊天还没有可恢复的历史对话。`
- Wire `CommandRouter`:
  - Route `/sessions` -> `SessionHistoryService` -> `ResponseFormatter`

**Self-check**:
- `/sessions` in direct chat returns only that direct chat's sessions
- `/sessions` in group chat returns only that group's sessions
- Empty list shows correct message
- Raw session IDs are NOT in output

---

### Phase 3: /resume & /resume N
**Goal**: Restore works with read-back confirmation.

**Tasks**:
- Implement `restore-service.ts`:
  - Recompute scoped list
  - Map displayIndex -> sessionId
  - Validate selected session belongs to current route
  - Backup `sessions.json` (atomic copy)
  - Modify `sessions.json` route entry (port `_restore_route_generation` from B-bridge)
  - Read back via `chat.history`
  - Confirm `sessionId` matches
  - Return success/failure
- Update `CommandRouter`:
  - `/resume` -> show list + hint
  - `/resume N` -> call restore service
- Error responses per spec:
  - Invalid number: `没有第 N 个对话。请发送 /sessions 查看可选项。`
  - Route mismatch: `这个对话不属于当前聊天，已拒绝切换。`
  - Read-back failure: `OpenClaw 未确认切换完成，后续消息不会被标记为已切换。`

**Self-check**:
- `/resume 2` switches to 2nd item
- After switch, next message uses restored context
- `/new` after `/resume 2` creates fresh generation
- Invalid numbers do NOT mutate route state
- Read-back failure reports failure, not success
- `sessions.json` backup exists after every restore

**Reference**:
- B-bridge `_restore_route_generation()` at `adapters.py:728`
- B-bridge `_read_restored_session()` at `adapters.py:766`
- B-bridge `switch_session()` at `adapters.py:536` (notice it calls `_lookup_sessions` first to validate scope)

---

### Phase 4: Extension Plugin
**Goal**: Build the OpenClaw Extension Plugin (`packages/plugin/`) that bridges `plugin-sdk` to `core`.

**Tasks**:
- Create `packages/plugin/` package with `package.json`, `tsconfig.json`
- Implement `scope-deriver.ts`:
  - Input: `PluginCommandContext` (has `channel`, `senderId`, `to`, `accountId`, `messageThreadId`)
  - Calls `gateway.sessionsList()` to reverse-lookup `sessionKey`, `organization`, `chatType`
  - Matches by `deliveryContext.channel`, `deliveryContext.to`, `deliveryContext.accountId`
  - Builds `ActorScope` + `RouteScope` via core resolvers
  - Returns `{ actor, route }` or `null` (fail closed)
- Implement `command-handlers.ts`:
  - `handleSessions()`, `handleResume()`, `handleResumeByIndex()`
  - Each calls `deriveScopes()` first, fails closed if null
- Implement `index.ts` (plugin entry point):
  - Exports `OpenClawPluginDefinition`
  - `register(api)` calls `api.registerCommand()` for `sessions` and `resume`
- Set up `tsconfig.json` with `paths` mapping to `openclaw/plugin-sdk` types
- Unit tests for `scope-deriver.ts` (mock `gateway.sessionsList`)

**Self-check**:
- `npm run build` succeeds for both `core` and `plugin`
- All unit tests pass (core + plugin)
- `scope-deriver.ts` correctly reconstructs WeCom session key from `sessions.list`
- Unsupported channels return `null` gracefully
- Plugin exports valid `OpenClawPluginDefinition`

**CRITICAL BOUNDARY**:
- Do NOT modify compiled OpenClaw in `/opt/homebrew/...`
- Do NOT modify user-local extensions in `~/.openclaw/extensions/`
- Do NOT create `packages/wecom-adapter/` or any WeCom-specific package
- The plugin is channel-agnostic; WeCom specifics only exist in `buildSessionKey()` as a channel-aware key formatter

---

### Phase 5: Cross-Channel Validation
**Goal**: Core + plugin have zero WeCom imports; tests use synthetic scopes.

**Tasks**:
- Verify `packages/core/` has zero WeCom-specific imports
- Verify `packages/plugin/` has zero WeCom-specific imports (only generic `buildSessionKey()`)
- Add synthetic route scope tests
- Document required context fields per channel
- Verify `SenderName` / `ConversationLabel` are not used for auth in core or plugin

**Self-check**:
- `grep -ri "wecom" packages/core/src/` should only match generic strings like provider name in tests
- `grep -ri "wecom" packages/plugin/src/` should only match generic provider name in `buildSessionKey`

---

## Critical Safety Reminders

1. **Actor first, route second, then list/restore.** Never reverse the order.
2. **Scoped list is computed fresh every time.** Do not cache or reuse a previous `/sessions` result for `/resume N`.
3. **Numeric index only.** Never accept raw `session_id` from user input.
4. **Backup before mutate.** `sessions.json` is the source of truth. Corrupting it breaks OpenClaw.
5. **Read-back confirms success.** Do not return success message until `chat.history` confirms.
6. **No external repo modifications.** Never touch `~/.openclaw/extensions/`, `/opt/homebrew/lib/node_modules/openclaw/`, or any repo outside `openclaw-command-kit/`.

## Common Traps

| Trap | Why It Happens | How To Avoid |
|---|---|---|
| Using `SenderName` for auth | It looks like a human identifier | Only use `SenderId` |
| Using `ConversationLabel` for scope | It looks like a chat name | Only use `SessionKey` + `ChatType` |
| Accepting bare `2` as switch | Feels like a natural UI | Reject it; require `/resume 2` |
| Returning global sessions as fallback | Empty scoped list feels wrong | Return empty message; do not fall back |
| Reporting success before read-back | Store write succeeded | Wait for `chat.history` confirmation |
| Forgetting backup | `sessions.json` write seems safe | Always backup before any mutation |
| Modifying WeCom extension monitor | Seems like the right integration point | Use `plugin-sdk` `registerCommand()` instead; do NOT touch `~/.openclaw/extensions/wecom/` |
| Creating WeCom-specific adapter package | WeCom is the first test channel | Keep everything in the channel-agnostic plugin; no `packages/wecom-adapter/` |

## File Reference Index

| Purpose | Path |
|---|---|
| Agent brief (source of truth) | `docs/agent-task-brief.md` |
| Security rules (mandatory) | `docs/security-contract.md` |
| Implementation plan | `docs/implementation-plan.md` |
| Command examples | `docs/command-catalog.md` |
| Architecture doc | `docs/architecture.md` |
| B-bridge reference impl | `../openclaw-session-bridge/app/adapters.py` |
| B-bridge models | `../openclaw-session-bridge/app/models.py` |
| Core package entry | `packages/core/src/index.ts` |
| Plugin package entry | `packages/plugin/src/index.ts` |
| Plugin scope deriver | `packages/plugin/src/scope-deriver.ts` |
| Plugin command handlers | `packages/plugin/src/command-handlers.ts` |

## Definition of Done

The loop is done when ALL of these pass:
- [x] `npm run build` succeeds
- [x] `npx vitest run` passes all tests
- [ ] `/sessions` lists scoped sessions in a real OpenClaw channel
- [ ] `/resume` shows picker with numeric hints in a real OpenClaw channel
- [ ] `/resume N` restores and confirms via read-back in a real OpenClaw channel
- [x] Core has no WeCom-specific imports
- [x] Actor + route scope isolation has unit tests
- [x] Cross-route leakage is tested and blocked
- [x] Security contract checklist passes
- [x] Extension plugin builds and exports valid `OpenClawPluginDefinition`
- [x] No modification to OpenClaw source code or compiled `dist/`
- [x] No modification to user-local channel extensions (`~/.openclaw/extensions/`)
