# `/resume` Command Spec

## Scope

`/resume` lets a user restore a previous conversation for the current chat
route.

MVP commands:

```text
/sessions
/sessions 腾讯文档
/resume
/resume 腾讯文档
/resume 2
```

## Terms

- `session_key`: route identity, for example a WeCom direct-chat route.
- `session_id`: concrete historical generation under the route.
- `actor`: the current trusted command issuer from channel context.
- `current generation`: the active generation for the route.
- `historical generation`: a restorable prior generation under the same route.

## Safety Rules

- Only list sessions under the current inbound route.
- Resolve the current actor before listing or restoring.
- Direct chat and group chat must never mix.
- Organization/account must be part of the route.
- Do not return global recent sessions.
- Do not switch by display name alone.
- Do not let one user complete another user's picker.
- Do not report success unless read-back confirms the route points to the
  selected generation.

## Scope Inputs

`/sessions`, `/resume`, and `/resume N` require:

- trusted actor identity, such as `SenderId`;
- provider/channel;
- account id when the channel has multiple accounts;
- organization/workspace/team when the provider supports it;
- chat type, at least `direct`, `group`, or `thread`;
- current route `sessionKey`;
- stable conversation or thread identity when available.

For WeCom, the safe boundary is:

```text
SenderId
+ AccountId
+ OriginatingOrganization
+ ChatType
+ SessionKey
+ ConversationLabel only after route metadata confirms it
```

`SenderName` and `ConversationLabel` are display fields. They may improve
formatting, but they are not authorization by themselves.

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
发送 /resume 2 切换到第 2 个历史对话。
```

Do not enter implicit "reply 2" mode in MVP. Requiring the command prefix avoids
accidental control from normal chat messages.

In a group chat, the list is visible to the channel. Keep it compact and avoid
debug identifiers. Selection still requires an explicit `/resume N` command from
an authorized actor.

## `/resume N`

Algorithm:

1. Build the route scope from the current inbound message.
2. Build the actor scope from trusted channel context.
3. List current + historical generations for that actor and route.
4. Map `N` to the freshly computed displayed list item.
5. Validate selected `session_id` belongs to the actor-authorized route.
6. Restore `sessionId/sessionFile`.
7. Read back current route through Gateway/session API.
8. Reply success or fail closed.

## Error Responses

No sessions:

```text
当前聊天还没有可恢复的历史对话。
```

Missing actor:

```text
无法确认当前用户身份，已拒绝查看历史对话。
```

Missing route:

```text
无法确认当前聊天范围，已拒绝查看历史对话。
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

```text
/sessions 腾讯文档
/resume 腾讯文档
/resume 昨天
```

Query mode filters scoped sessions only. It may match:

- exact title/preview match;
- display date/time labels;
- last user message;
- last assistant message;
- derived title.

It does not use LLM semantic search, fuzzy dependencies, global search, or
cross-route lookup. `/resume <query>` is read-only: it shows filtered candidates
and tells the user to use `/resume N`; it never switches sessions directly.

## Acceptance Tests

- `/sessions` in one direct chat never lists another direct chat.
- `/sessions` in group chat never lists direct chat.
- `/sessions` fails closed when actor identity is missing.
- Two actors with similar display names do not see each other's direct-chat
  sessions.
- `/resume 2` switches to the selected generation.
- Bare `2` after `/resume` does not switch in MVP.
- After `/resume 2`, the next user message can reference the selected history.
- `/new` after `/resume 2` creates a fresh generation for the same route.
- Invalid numbers do not mutate route state.
- Read-back failure does not report success.
