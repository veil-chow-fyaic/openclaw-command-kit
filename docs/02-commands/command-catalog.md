# Command Catalog

## Available Commands (MVP)

These commands are implemented and ready to use.

---

### `/commands`

**Purpose:** Show the OpenClaw Command Kit commands available in the current
plugin.

**Scope:** Read-only. Does not inspect or mutate session state.

**Usage:**

```text
/commands
```

**Example Response:**

```text
可用命令

/commands
  查看当前可用命令。
  用法：/commands

/sessions
  列出当前聊天可恢复的历史对话。
  用法：/sessions

/resume
  查看可恢复对话列表，并提示如何切换。
  用法：/resume

/resume N
  切换到第 N 个历史对话。
  用法：/resume 2

会话命令只作用于当前聊天范围，不显示原始 session id。
```

**What it does:**

1. Returns the static OpenClaw Command Kit command catalog.
2. Avoids session lookup and route reverse-lookup because no private session
   data is needed.
3. Keeps discovery usable in channels that do not provide a slash-command popup.

**Constraints:**

- Only exact `/commands` is handled.
- Does not manage custom commands or plugin loading.
- Does not show account ids, organizations, route keys, or raw session ids.

---

### `/sessions`

**Purpose:** List current and historical conversations for the current chat route.

**Scope:** Read-only. Never modifies session state.

**Usage:**

```text
/sessions
```

**Example Response:**

```text
可恢复的历史对话

当前：周威 · 刚刚

1. 腾讯文档发布不了
   gog 的 OAuth token 过期了... · 5月23日 09:36

2. B端切换验收 testing-b
   收到，测试正常 · 5月21日 19:31

发送 /resume 2 切换到第 2 个历史对话。
```

**What it does:**

1. Resolves the current actor and route scope from the inbound message.
2. Calls OpenClaw Gateway `sessions.list` to get active sessions.
3. Scans local transcript backups (`.jsonl.reset.*`, `.jsonl.deleted.*`) for historical generations matching the route label.
4. Merges active + historical, deduplicates by `sessionId`, sorts by `updatedAt` descending.
5. Assigns display indexes (1, 2, 3...).
6. Formats a compact numbered list.

**Constraints:**

- Only shows sessions belonging to the exact current route (`provider + accountId + organization + chatType + sessionKey`).
- Never falls back to global search.
- Hides raw `sessionId` values; only display indexes are shown.

**Error Responses:**

| Condition | Response |
|-----------|----------|
| No history | `当前聊天还没有可恢复的历史对话。` |
| Missing actor | `无法确认当前用户身份，已拒绝查看历史对话。` |
| Missing route | `无法确认当前聊天范围，已拒绝查看历史对话。` |

---

### `/resume`

**Purpose:** Show the session list (same as `/sessions`) with a stronger hint to use `/resume N`.

**Scope:** Read-only.

**Usage:**

```text
/resume
```

**What it does:**

Identical to `/sessions`, but the final line emphasizes how to switch:

```text
发送 /resume 2 切换到第 2 个历史对话。
```

**Why it exists:**

- `/sessions` answers "what can I resume?"
- `/resume` answers "how do I resume?"

---

### `/resume N`

**Purpose:** Switch to the N-th conversation in the current scoped list.

**Scope:** Mutates `sessions.json` to point the current route to a historical generation.

**Usage:**

```text
/resume 2
```

**Example Success Response:**

```text
已切换到历史对话

对话：B端切换验收 testing-b
时间：5月21日 19:31

最近聊到了：
你：testing-b 这个分支测试怎么样
OpenClaw：收到，测试正常

后续消息将进入这个上下文。
```

**Algorithm:**

1. Recompute the scoped list (same as `/sessions`).
2. Map `N` to the corresponding item.
3. Validate the selected session still belongs to the current actor + route.
4. Create an atomic backup of `sessions.json`.
5. Copy the historical transcript file (`.reset.`) to `.jsonl` if needed.
6. Update the route entry in `sessions.json` with the new `sessionId` and `sessionFile`.
7. Read back via `chat.history` RPC to confirm the route now points to the selected session.
8. Reply success or failure.

**Constraints:**

- `N` must be a positive integer (`1`, `2`, ...).
- Bare numeric replies (e.g. sending just `2`) do **not** trigger switching.
- The command prefix `/resume` is required.

**Error Responses:**

| Condition | Response |
|-----------|----------|
| Invalid number | `用法：/resume N（N 为对话编号）` |
| Index out of range | `没有第 7 个对话。请发送 /sessions 查看可选项。` |
| Route mismatch | `这个对话不属于当前聊天，已拒绝切换。` |
| Store not found | `OpenClaw 会话存储未找到。` |
| Read-back failure | `OpenClaw 未确认切换完成，后续消息不会被标记为已切换。` |

---

## Planned Commands (Phase 2+)

These are not yet implemented.

### `/sessions <query>`

Filter the scoped list by title, summary, preview, or time.

```text
/sessions 腾讯文档
/sessions testing-b
/sessions 昨天
```

### `/resume <query>`

Resolve a query to one scoped conversation.

```text
/resume 腾讯文档
```

Rules:

- If exactly one strong match exists, switch directly or ask for confirmation.
- If multiple matches exist, show a numbered list.
- If no match exists, report failure without mutating state.

### `/fork`

Start a fresh conversation from a summarized handoff of the current one.

Useful when long chats degrade but the user does not want to lose key context.

### `/rename <title>`

Rename the current session title/label.

### `/pin` and `/archive`

Session organization commands. Deferred until OpenClaw has native metadata support.

### `/whereami`

Operator diagnostic command showing:

- channel
- account
- organization
- chat type
- route key
- current session id

Not shown as a normal-user feature.

---

## Naming Rationale

**Primary command: `/resume`**

- Describes what the user wants to do.
- Avoids technical terms like `session_id` or `switch-session`.
- Does not collide with model/org/mode switching concepts.
- Pairs naturally with `/new`.
