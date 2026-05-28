# Security Contract: OpenClaw Session Commands

This document is **non-negotiable**. Every implementation detail, test case, and manual verification step must satisfy every rule listed here. Violating any rule is a bug, regardless of convenience or performance.

## 1. Actor Isolation (跨用户边界)

**Rule 1.1: No actor, no action.**
If `ActorScope` cannot be resolved from the inbound message context, the command MUST fail closed immediately. No session listing, no search, no restore.

**Rule 1.2: Actor scope is separate from route scope.**
The actor identifies *who* issued the command. The route identifies *which conversation* can be listed or restored. These are separate inputs. Both must be valid.

**Rule 1.3: Session lists are private per actor.**
Two different `senderId` values must never see each other's sessions, even if they share the same `sessionKey`, `accountId`, `organization`, `ChatType`, or `ConversationLabel`.

**Rule 1.4: Cross-actor restore is blocked.**
When restoring `/resume N`, the selected session MUST belong to the current actor's authorized scope. If the session was originally created by a different actor, it must not be restorable by the current actor (unless OpenClaw's own route scope allows it, which is outside our control; our job is to enforce our own actor boundary).

**Rule 1.5: `SenderName` is display ONLY.**
Never use `SenderName` for authorization, identity matching, or scope resolution. Only `SenderId` (and optionally enterprise user id) is trusted.

## 2. Route Isolation (跨路由边界)

**Rule 2.1: No route, no action.**
If `RouteScope` cannot be resolved (missing `sessionKey` or `chatType`), fail closed immediately.

**Rule 2.2: Scoped listing only.**
`/sessions` and `/sessions <query>` MUST return only sessions that belong to the exact current route scope (`provider + accountId + organization + chatType + sessionKey`). Never fall back to global/recent session search.

**Rule 2.3: Cross-route leakage is blocked.**
A direct chat between User A and the bot must never list or restore sessions from a group chat that User A happens to be in. Different `sessionKey` = different route = different session universe.

**Rule 2.4: `ConversationLabel` is display ONLY.**
Never use `ConversationLabel` as a lookup key or authorization boundary. It is for human-readable titles only.

## 3. Restore Safety

**Rule 3.1: Numeric index maps to freshly computed scoped list.**
`/resume N` must recompute the scoped list at restore time and map `N` to that list. Never accept a raw `session_id` from the user command path.

**Rule 3.2: Bare numeric replies do NOT switch.**
A message containing only `2` (without `/resume` prefix) must NOT trigger session switching in MVP.

**Rule 3.3: Validate before mutate.**
Before modifying `sessions.json`, confirm the selected session belongs to the current actor + route scope.

**Rule 3.4: Backup before write.**
Always create an atomic backup of `sessions.json` before any mutation.

**Rule 3.5: Read-back confirmation required.**
After modifying `sessions.json`, call `chat.history` with `sessionKey` and confirm the returned `sessionId` matches the selected session. Do NOT report success until this confirmation passes.

**Rule 3.6: Cross-route selection is blocked.**
If a numeric index somehow points to a session outside the current route scope (e.g., stale list, race condition), the restore MUST be rejected with `route_mismatch`.

## 4. Command Parsing Safety

**Rule 4.1: Exact prefix matching.**
Only these forms are valid commands:
- `/sessions`
- `/sessions <query>` (read-only scoped filtering)
- `/resume`
- `/resume <query>` (read-only scoped filtering)
- `/resume N` (where N is a positive integer)

**Rule 4.2: No partial matches.**
`/session` (without `s`) is NOT a command. `/resumes` is NOT a command.

**Rule 4.3: No hidden arguments.**
`/resume 2 extra` must be treated as invalid, not as `/resume 2`.

**Rule 4.4: Query mode is read-only.**
`/resume <query>` MUST NOT restore or mutate session state, even when the query has exactly one match. It may only show filtered candidates and instruct the user to use `/resume N`.

## 5. Response Safety

**Rule 5.1: No raw session IDs in normal output.**
Ordinary users must never see raw `session_id` strings in command responses. Only display indexes (1, 2, 3...) are exposed.

**Rule 5.2: No debug info in production.**
Error messages must be user-friendly Chinese text. Stack traces, internal file paths, or RPC raw responses must not leak to end users.

## 6. Verification Checklist (Must Pass Before Delivery)

- [ ] Actor A in direct chat X cannot see Actor B's sessions in direct chat X
- [ ] Actor A in group chat Y cannot see Actor A's sessions in direct chat Z
- [ ] `/resume 2` after `/sessions` shows different list than after another user sent `/sessions`
- [ ] `/resume 999` on empty list returns `invalid_index`, does not mutate store
- [ ] Read-back failure returns `readback_failure`, does not report success
- [ ] `sessions.json` backup exists after every successful restore
- [ ] Raw session IDs do not appear in any `/sessions` or `/resume` response
- [ ] `/sessions <query>` and `/resume <query>` filter only after actor and route scope are resolved
- [ ] `/resume <query>` never mutates session state
