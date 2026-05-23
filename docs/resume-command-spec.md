# `/resume` Command Spec

## Scope

`/resume` lets a user restore a previous conversation for the current chat
route.

MVP commands:

```text
/sessions
/resume
/resume 2
```

## Terms

- `session_key`: route identity, for example a WeCom direct-chat route.
- `session_id`: concrete historical generation under the route.
- `current generation`: the active generation for the route.
- `historical generation`: a restorable prior generation under the same route.

## Safety Rules

- Only list sessions under the current inbound route.
- Direct chat and group chat must never mix.
- Organization/account must be part of the route.
- Do not return global recent sessions.
- Do not switch by display name alone.
- Do not report success unless read-back confirms the route points to the
  selected generation.

## `/sessions`

Inputs:

- current message context;
- optional count argument, default 5, max 10 for MVP.

Output:

- current conversation summary;
- numbered history list;
- hint to use `/resume N`.

Formatting constraints:

- ordinary users should see title, time, and preview;
- do not show raw ids by default;
- show no more than 5 items by default;
- keep message short enough for chat.

## `/resume`

Without arguments, same output as `/sessions` plus stronger instruction:

```text
回复 /resume 2 切换到第 2 个历史对话。
```

Do not enter implicit "reply 2" mode in MVP. Requiring the command prefix avoids
accidental control from normal chat messages.

## `/resume N`

Algorithm:

1. Build the route scope from the current inbound message.
2. List current + historical generations for that route.
3. Map `N` to the displayed list item.
4. Validate selected `session_id` belongs to the route.
5. Restore `sessionId/sessionFile`.
6. Read back current route through Gateway/session API.
7. Reply success or fail closed.

## Error Responses

No sessions:

```text
当前聊天还没有可恢复的历史对话。
```

Invalid number:

```text
没有第 7 个对话。请发送 /sessions 查看可选项。
```

Route mismatch:

```text
这个对话不属于当前聊天，已拒绝切换。
```

Read-back failure:

```text
OpenClaw 未确认切换完成，后续消息不会被标记为已切换。
```

## Query Mode

Phase 2 only:

```text
/resume 腾讯文档
/resume 昨天
```

Query mode must filter scoped sessions only. It may rank by:

- exact title/preview match;
- recent time;
- last user message;
- last assistant message;
- derived title.

Do not use LLM semantic search for authorization. Semantic search is ranking
only after exact route scope is already enforced.

## Acceptance Tests

- `/sessions` in one direct chat never lists another direct chat.
- `/sessions` in group chat never lists direct chat.
- `/resume 2` switches to the selected generation.
- After `/resume 2`, the next user message can reference the selected history.
- `/new` after `/resume 2` creates a fresh generation for the same route.
- Invalid numbers do not mutate route state.
- Read-back failure does not report success.
