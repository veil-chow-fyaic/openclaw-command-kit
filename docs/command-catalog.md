# Command Catalog

This catalog separates recommended MVP commands from later candidates.

## MVP Commands

### `/sessions`

Read-only command.

Purpose:

- Show conversations available for the current route.
- Let the user understand what can be resumed.

Example:

```text
/sessions
```

Response:

```text
可恢复的历史对话

当前：周威 · 刚刚 · 新对话

1. 腾讯文档发布不了
   5月23日 09:36 · 最后：gog 的 OAuth token 过期了...

2. B端切换验收 testing-b
   5月21日 19:31 · 最后：收到，测试正常

发送 /resume 2 切换。仅回复 2 不会触发切换。
```

### `/resume`

Selection helper.

Purpose:

- Show the same list as `/sessions`.
- Tell the user how to switch.
- Require an explicit `/resume N` command instead of bare numeric replies.

Example:

```text
/resume
```

### `/resume N`

Switch command.

Purpose:

- Restore the Nth conversation from the current scoped list.
- Confirm through Gateway/session read-back.

Example:

```text
/resume 2
```

Success:

```text
已切换到历史对话

对话：B端切换验收 testing-b
时间：5月21日 19:31

后续消息将进入这个上下文。
```

## Phase 2 Commands

### `/sessions <query>`

Filter the scoped list by title, summary, preview, and time.

Examples:

```text
/sessions 腾讯文档
/sessions testing-b
/sessions 昨天
```

### `/resume <query>`

Try to resolve a query to one scoped conversation.

Rules:

- If exactly one strong match exists, ask for confirmation or switch directly
  depending on config.
- If multiple matches exist, show a numbered list.
- If no match exists, say so and do not mutate route state.

## Later Candidates

### `/fork`

Start a fresh conversation from a summarized handoff of the current one.

This is useful when long chats degrade but the user does not want to lose key
context. This should not be MVP because it needs summarization policy.

### `/rename <title>`

Rename the current session title/label.

Useful for history UX, but lower priority than resume.

### `/pin` and `/archive`

Session organization commands. Defer until OpenClaw has clear native metadata
support and UI conventions.

### `/whereami`

Debug command showing current route/session identity:

- channel;
- account;
- organization;
- chat type;
- route key;
- current session id.

This is useful for operators but should not be shown as a normal-user feature.

## Naming Decision

Recommended primary name: `/resume`.

Reasons:

- It describes what the user wants.
- It avoids the technical term `session_id`.
- It does not collide conceptually with model/org/mode switching.
- It pairs naturally with `/new`.

Avoid making `/switch-session` the public command. It is accurate for engineers
but too technical for everyday chat users.
