# Agent Task Brief: OpenClaw Native Session Commands

Date: 2026-05-23

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

## Prior Work To Read First

Read these before coding:

1. This repository:
   - [TLDR](tldr.md)
   - [Prior art](prior-art.md)
   - [Resume command spec](resume-command-spec.md)
   - [Architecture](architecture.md)
   - [Roadmap](roadmap.md)
2. Previous B-side design:
   - `/Users/fuyo-aic/projects/openclaw-session-bridge/docs/native-session-command-design.md`
3. Previous A/B repositories:
   - A: https://github.com/veil-chow-fyaic/wecom-sidepanel-probe
   - B: https://github.com/veil-chow-fyaic/openclaw-session-bridge
4. OpenClaw references:
   - https://github.com/openclaw/openclaw/issues/10599
   - https://docs.openclaw.ai/web/control-ui
   - https://github.com/openclaw/openclaw/blob/main/docs.acp.md

## Architecture Target

The implementation should live near OpenClaw's native slash-command handling,
close to existing commands such as `/new`, `/reset`, `/status`, and `/compact`.

Recommended internal modules:

```text
Command Router
  -> Route Scope Resolver
  -> Session History Service
  -> Restore Service
  -> Response Formatter
```

### Command Router

Parse only the command surface needed for the current phase:

- `/sessions`
- `/resume`
- `/resume <number>`

The router must not break existing OpenClaw commands.

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
  senderId?: string;
}
```

If route scope cannot be resolved, fail closed with a clear message.

### Session History Service

List current and historical generations under the exact route scope.

Each item should include:

- numeric index;
- title or derived title;
- updated time;
- last useful message preview;
- current marker;
- empty/restorable flags;
- hidden `sessionId` for internal restore.

Do not search globally before route scope is enforced.

### Restore Service

For `/resume N`:

1. Recompute the scoped list.
2. Map `N` to one item from that list.
3. Validate the selected session belongs to the current route.
4. Restore the active route to that session.
5. Read back through Gateway/session history.
6. Return success only after read-back confirms the restored session.

If OpenClaw has or adds a formal restore RPC, prefer that. Until then, reuse the
minimum proven OpenClaw-native store-level restore pattern and keep backups
before any mutable write.

### Response Formatter

Keep output compact and user-facing.

Example `/resume` response:

```text
可恢复的历史对话

当前：周威 · 刚刚 · 新对话

1. 腾讯文档发布不了
   5月23日 09:36 · 最后：看起来 gog 的 OAuth token 过期了...

2. B端切换验收 testing-b
   5月21日 19:31 · 最后：收到，测试正常

回复编号切换，例如：/resume 2
```

Example success:

```text
已切换到历史对话

对话：B端切换验收 testing-b
时间：5月21日 19:31

后续消息将进入这个上下文。
```

## Implementation Plan

### Phase 0: Confirm Upstream Shape

Deliverables:

- Locate OpenClaw slash-command parsing.
- Locate `/new` and `/reset` implementation.
- Locate Gateway session RPCs and transcript utilities.
- Locate channel runtime context shape.
- Decide whether MVP should be an OpenClaw upstream PR, local patch, or plugin.

Acceptance:

- A short implementation note points to concrete OpenClaw source files and test
  files.

### Phase 1: Read-Only `/sessions`

Deliverables:

- `/sessions` lists scoped resumable sessions.
- Output is sorted by latest activity.
- Empty or ambiguous scope fails closed.
- Direct chats, group chats, and channel route boundaries do not mix.

Acceptance:

- Unit tests cover command parsing, route scope, empty list, and scoped list.
- Manual test in at least one real channel returns only that route's sessions.

### Phase 2: `/resume` Picker

Deliverables:

- `/resume` returns the same scoped list with numeric selection hints.
- `/resume N` validates selection under the current route.
- Invalid numbers produce explicit errors.

Acceptance:

- Unit tests cover invalid input and stale numbering.
- The command never accepts a raw session id from a normal user path.

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

### Phase 4: Cross-Channel Validation

Deliverables:

- Validate route resolution beyond WeCom where feasible.
- Add channel-agnostic tests using synthetic route scopes.
- Document any channel that lacks enough route metadata.

Acceptance:

- The core logic does not contain WeCom-only assumptions.
- WeCom-specific fields are handled only by an adapter/resolver.

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

## Security Requirements

- Fail closed on missing route scope.
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
- Route scope isolation is covered by tests.
- Session restore is real and verified by follow-up context behavior.
- Documentation explains usage, limitations, architecture, and safety rules.
- No WeCom Side Panel dependency or local session mapping pool remains.

