# Agent Task Brief: OpenClaw Native Session Commands

Date: 2026-05-23
Last updated: 2026-06-09

> Current handoff note: read
> [Human Takeover Brief - 2026-06-09](human-takeover-brief-2026-06-09.md)
> before using this document for new work. This brief remains the original
> architecture and safety handoff, but it does not by itself reflect the later
> npm packages, implemented query/diagnostic commands, stale website lane, or
> current human acceptance gaps.

This is the primary handoff document for implementation agents. The linked
documents below provide detail and prior evidence, but this brief is the
coordination point: do not implement only from an older A/B bridge document, and
do not drop requirements that are summarized here.

## Mission

Build an OpenClaw-specific, channel-agnostic slash-command enhancement that lets
users list and resume prior OpenClaw conversations directly inside any supported
OpenClaw chat channel.

This is not a WeCom-only feature and not a general agent-session abstraction for
Claude Code, Codex CLI, Gemini CLI, or other agents. The target platform is
OpenClaw because OpenClaw has its own Gateway, route scope, session store,
transcripts, slash-command handling, and channel runtime model.

## Product Goal

OpenClaw already supports `/new` and `/reset`, but users also need the common AI
app workflow:

1. See recent conversation history.
2. Recognize each conversation by topic, time, and preview.
3. Resume one previous conversation.
4. Confirm the next message really enters that restored context.

The MVP command surface is:

```text
/sessions
/resume
/resume 2
```

Optional later commands:

```text
/sessions <query>
/resume <query>
/fork
/rename <title>
/pin
/archive
/whereami
```

## Non Goals

- Do not build a dashboard UI.
- Do not depend on WeCom Side Panel or A-side cloud code.
- Do not maintain a local user/contact/session mapping database.
- Do not create a generic abstraction across unrelated agents.
- Do not rely on display names as authorization.
- Do not expose raw `session_id` to ordinary users unless debug mode is enabled.
- Do not implement semantic search before exact route-scoped listing is correct.

## Key Principle

Session truth stays in OpenClaw.

The implementation may reuse OpenClaw Gateway RPCs, OpenClaw CLI code, internal
session utilities, and transcript files. It must not duplicate session state or
invent a parallel mapping layer.

## Non-Negotiable Handoff Rules

- Resolve the current actor before any session listing, search, or restore.
- Resolve the exact current OpenClaw route before any session listing, search,
  or restore.
- Treat actor scope and route scope as separate inputs that must both be valid.
- Scope first, then list or search. Never list global/recent sessions as a
  fallback.
- `/resume` is an explicit chat command flow, not a TUI picker. MVP requires
  `/resume N`; a bare `2` must not switch sessions.
- Success for `/resume N` requires read-back confirmation that the route now
  points to the selected generation.
- Confirmation messages must be sent by the OpenClaw channel runtime as
  OpenClaw, not inserted by a side panel or client as the human user.
- Core command semantics must remain channel-agnostic. Channel-specific session
  key construction lives in the plugin's `buildSessionKey()`, not in core.

## Prior Work To Read First

Read these before coding. If an older A/B document conflicts with this brief or
with the current repository specs, follow this brief and the current specs. The
old projects are reference implementations and safety evidence, not runtime
dependencies.

1. This repository:
   - [Quick Start](../01-getting-started/quickstart.md)
   - [Installation Guide](../01-getting-started/installation.md)
   - [Prior art](prior-art.md)
   - [Resume command spec](../02-commands/resume-command-spec.md)
   - [Channel interaction and identity](../03-design/channel-interaction.md)
   - [Command catalog](../02-commands/command-catalog.md)
   - [Architecture](../03-design/architecture.md)
   - [Roadmap](../03-design/roadmap.md)
2. Previous B-side design:
   - `/Users/fuyo-aic/Projects/openclaw-session-bridge/docs/native-session-command-design.md`
   - `/Users/fuyo-aic/Projects/openclaw-session-bridge/docs/wecom-scope-contract.md`
   - `/Users/fuyo-aic/Projects/openclaw-session-bridge/docs/wecom-channel-delivery.md`
   - `/Users/fuyo-aic/Projects/openclaw-session-bridge/docs/current-progress.md`
3. Previous A-side security notes:
   - `/Users/fuyo-aic/Projects/wecom-sidepanel-probe/docs/security-model.md`
   - `/Users/fuyo-aic/Projects/wecom-sidepanel-probe/docs/wecom-side-panel-pitfalls.md`
   - `/Users/fuyo-aic/Projects/wecom-sidepanel-probe/docs/b-side-handoff.md`
4. Previous A/B repositories:
   - A: https://github.com/veil-chow-fyaic/wecom-sidepanel-probe
   - B: https://github.com/veil-chow-fyaic/openclaw-session-bridge
5. OpenClaw references:
   - https://github.com/openclaw/openclaw/issues/10599
   - https://docs.openclaw.ai/web/control-ui
   - https://github.com/openclaw/openclaw/blob/main/docs.acp.md

## Architecture Target

The implementation is an OpenClaw Extension Plugin using the `plugin-sdk`
`registerCommand()` API. This places the commands alongside existing native
commands such as `/new`, `/reset`, `/status`, and `/compact` without modifying
OpenClaw source code.

Recommended internal modules:

```text
Command Router
  -> Actor Scope Resolver
  -> Route Scope Resolver
  -> Session History Service
  -> Restore Service
  -> Response Formatter
```

### Reference Alignment

The previous Side Panel bridge proved the product semantics:

- a current user/actor must be known;
- a current chat route must be known;
- only sessions under that actor-authorized route can be listed;
- restore must update the real OpenClaw route focus;
- read-back must confirm the restored generation before success;
- user-visible confirmation must come from the OpenClaw channel path.

The native command implementation should carry these semantics forward without
copying the A-side Side Panel architecture, B-side HTTP API shape, or
bridge-local mapping stores.

### Command Router

Parse only the command surface needed for the current phase:

- `/sessions`
- `/resume`
- `/resume <number>`

The router must not break existing OpenClaw commands.

### Actor Scope Resolver

Resolve the current command issuer from trusted inbound channel context before
listing or restoring sessions.

For WeCom, useful fields include:

- `SenderId`
- `SenderName`
- `AccountId`
- `OriginatingOrganization`

Actor scope is not the same as route scope. The actor identifies who is allowed
to issue the command and who owns any future pending picker state. The route
identifies which OpenClaw conversation can be listed or restored.

If actor identity cannot be resolved, fail closed with a clear message. Do not
fall back to display name matching.

Recommended common shape:

```ts
interface ActorScope {
  provider: string;
  accountId?: string;
  organization?: string;
  senderId: string;
  senderDisplayName?: string;
}
```

### Route Scope Resolver

Resolve the current OpenClaw route from inbound channel context.

For WeCom, known useful fields include:

- `SessionKey`
- `AccountId`
- `OriginatingOrganization`
- `ChatType`
- `ConversationLabel`
- `SenderId`
- `SenderName`
- `CommandBody`

For other channels, map equivalent OpenClaw route/session fields into a common
shape:

```ts
interface RouteScope {
  provider: string;
  accountId?: string;
  organization?: string;
  chatType: "direct" | "group" | "thread" | "unknown";
  sessionKey: string;
  label?: string;
  conversationId?: string;
  threadId?: string;
}
```

If route scope cannot be resolved, fail closed with a clear message.

The safe authorization boundary is the combination of actor identity and route
identity. In WeCom terms, that means the current sender plus account,
organization, chat type, current conversation identity or resolved route label,
and the OpenClaw session key. Do not use `SenderName`, `ConversationLabel`, or
global OpenClaw search results as standalone authorization.

For WeCom, the inherited safe boundary from the A/B work is:

```text
SenderId or trusted enterprise user id
+ AccountId
+ OriginatingOrganization
+ ChatType
+ SessionKey
+ ConversationLabel only after OpenClaw route metadata confirms it
```

The actor alone is not enough. The route label alone is not enough. Two users,
organizations, accounts, direct chats, group chats, or threads with similar
labels must not leak sessions to each other.

### Session History Service

List current and historical generations under the actor-authorized exact route
scope.

Each item should include:

- numeric index;
- title or derived title;
- updated time;
- last useful message preview;
- current marker;
- empty/restorable flags;
- hidden `sessionId` for internal restore.

Do not search globally before route scope is enforced.

Numbered items are display indexes only. They must map to hidden session ids
inside the freshly computed scoped list and must never accept raw `session_id`
input from an ordinary user command path.

### Restore Service

For `/resume N`:

1. Recompute actor scope and route scope from the current inbound message.
2. Map `N` to one item from that list.
3. Validate the selected session belongs to the actor-authorized current route.
4. Restore the active route to that session.
5. Read back through Gateway/session history.
6. Return success only after read-back confirms the restored session.

If OpenClaw has or adds a formal restore RPC, prefer that. Until then, reuse the
minimum proven OpenClaw-native store-level restore pattern and keep backups
before any mutable write.

### Response Formatter

Keep output compact and user-facing.

OpenClaw channels are not TUI sessions. `/resume` should reply in the same chat
with a numbered list and require an explicit command prefix for selection.
MVP must not interpret a bare `2` as a selection.

If a future channel supports buttons or ephemeral interactions, use those only
after the same actor and route scopes are resolved. Pending interaction state, if
introduced later, must be keyed by actor plus route and must expire quickly.

Example `/resume` response:

```text
可恢复的历史对话

当前：周威 · 刚刚 · 新对话

1. 腾讯文档发布不了
   看起来 gog 的 OAuth token 过期了... · 5月23日 09:36

2. B端切换验收 testing-b
   收到，测试正常 · 5月21日 19:31

发送 /resume 2 切换到第 2 个历史对话。
```

Example success:

```text
已切换到历史对话

对话：B端切换验收 testing-b
时间：5月21日 19:31

最近聊到了：
你：testing-b 这个分支测试怎么样
OpenClaw：收到，测试正常

后续消息将进入这个上下文。
```

Example fail-closed responses:

```text
无法确认当前用户身份，已拒绝查看历史对话。
```

```text
无法确认当前聊天范围，已拒绝查看历史对话。
```

```text
OpenClaw 未确认切换完成，后续消息不会被标记为已切换。
```

## Implementation Plan

### Phase 0: Confirm Upstream Shape

Deliverables:

- Locate OpenClaw slash-command parsing.
- Locate `/new` and `/reset` implementation.
- Locate Gateway session RPCs and transcript utilities.
- Locate channel runtime context shape.
- Confirm `plugin-sdk` exposes `registerCommand()` API for extension plugins.
- Verify `PluginCommandContext` shape and which route fields are available vs
  missing (notably `sessionKey` and `organization` are absent).

Acceptance:

- A short implementation note points to concrete OpenClaw source files and test
  files.
- The note explains which current repository docs and prior A/B docs were used,
  and how their responsibilities map into the native command implementation.
- The note explicitly records whether a formal restore RPC exists. If it does
  not, it names the chosen OpenClaw-native restore path and backup strategy.
- Architecture decision recorded: Extension Plugin via `plugin-sdk`
  `registerCommand()`, not upstream PR or monitor interceptor.

### Phase 1: Read-Only `/sessions`

Deliverables:

- `/sessions` lists scoped resumable sessions.
- Output is sorted by latest activity.
- Missing actor, empty route, or ambiguous scope fails closed.
- Direct chats, group chats, and channel route boundaries do not mix.

Acceptance:

- Unit tests cover command parsing, actor scope, route scope, empty list, and
  scoped list.
- Tests cover same or similar display labels under different actors, accounts,
  organizations, chat types, and threads.
- Manual test in at least one real channel returns only that route's sessions.

### Phase 2: `/resume` Picker

Deliverables:

- `/resume` returns the same scoped list with numeric selection hints.
- `/resume N` validates selection under the current route.
- Invalid numbers produce explicit errors.
- Bare numeric replies such as `2` do not trigger switching in MVP.

Acceptance:

- Unit tests cover invalid input and stale numbering.
- The command never accepts a raw session id from a normal user path.
- Any future pending picker is keyed by actor plus route, so another user cannot
  complete someone else's selection.

### Phase 3: Real Restore

Deliverables:

- `/resume N` restores the selected historical generation.
- Restore performs read-back confirmation before reporting success.
- Failure messages distinguish route mismatch, missing transcript, restore
  failure, and read-back failure.

Acceptance:

- After `/resume N`, a follow-up user message uses the selected historical
  context.
- After `/new`, a follow-up user message does not see prior conversation
  context.
- Tests protect against cross-route leakage.

### Phase 4: Extension Plugin + Cross-Channel Validation

Deliverables:

- Build `packages/plugin/` as an OpenClaw Extension Plugin.
- Implement `scope-deriver.ts` to reverse-lookup route metadata from
  `sessions.list` (since `PluginCommandContext` lacks `sessionKey` and
  `organization`).
- Register `/sessions` and `/resume` via `plugin-sdk` `registerCommand()`.
- Add channel-agnostic tests using synthetic route scopes.
- Document any channel that lacks enough route metadata.

Acceptance:

- The core logic does not contain WeCom-only assumptions.
- The plugin contains only generic `buildSessionKey()` channel-aware formatting,
  not WeCom-specific business logic.
- Plugin builds and exports a valid `OpenClawPluginDefinition`.
- No modification to OpenClaw source code or user-local extensions.

### Phase 5: Query Search

Deliverables:

- `/sessions <query>` filters authorized scoped sessions.
- `/resume <query>` either picks an exact result or shows a numbered list.

Acceptance:

- Search runs only after route scope filtering.
- Ambiguous search never switches automatically.

## Test Strategy

Minimum test layers:

- command parser tests;
- actor scope resolver tests;
- route scope resolver tests;
- session list filtering tests;
- restore validation tests;
- read-back confirmation tests;
- regression tests for cross-user, cross-contact, cross-organization, and
  direct-vs-group isolation.

Manual verification must include:

1. `/new` creates a real new context.
2. `/resume` lists history under the current route.
3. `/resume N` restores a chosen historical session.
4. A follow-up message proves the restored context is real.
5. Another route cannot see or resume the session.
6. Another actor in the same or a similar route cannot complete the same
   selection or see unauthorized sessions.

## Security Requirements

- Fail closed on missing route scope.
- Fail closed on missing actor identity.
- Treat session lists as private data.
- Do not authorize by display label.
- Do not globally search all transcripts before scoping.
- Do not store duplicate session ownership mappings.
- Keep backups before mutable session store writes.
- Do not report success until OpenClaw read-back confirms the restored state.

## Definition Of Done

The task is complete when:

- `/sessions`, `/resume`, and `/resume N` work in a real OpenClaw channel.
- The implementation is channel-agnostic at the core layer.
- Actor scope and route scope isolation are covered by tests.
- Session restore is real and verified by follow-up context behavior.
- Documentation explains usage, limitations, architecture, and safety rules.
- No WeCom Side Panel dependency or local session mapping pool remains.
