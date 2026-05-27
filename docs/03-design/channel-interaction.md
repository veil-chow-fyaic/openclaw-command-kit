# Channel Interaction And Identity

## Purpose

`/resume` is a chat-channel command, not a TUI picker. OpenClaw must know both
who sent the command and which channel route the command came from before it
shows or restores any session history.

The command should therefore resolve two scopes:

- `ActorScope`: the current human or system actor allowed to issue the command.
- `RouteScope`: the current OpenClaw conversation route whose generations may
  be listed or restored.

Both scopes are required. If either is missing or ambiguous, fail closed.

## Actor Scope

Actor identity is used for command authorization, audit, and pending-selection
isolation. It must come from trusted OpenClaw channel context, not from free-form
message text.

```ts
interface ActorScope {
  provider: string;
  accountId?: string;
  organization?: string;
  senderId: string;
  senderDisplayName?: string;
}
```

For WeCom, useful fields include:

- `SenderId`;
- `SenderName`;
- `AccountId`;
- `OriginatingOrganization`;
- trusted channel metadata that identifies the current enterprise member.

Do not authorize by `SenderName` or display label alone. The same visible name
can exist under different operators, organizations, or accounts.

## Route Scope

Route scope identifies the OpenClaw chat route whose current and historical
generations can be shown.

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

For WeCom, the safe boundary is the combination of:

```text
actor sender id
+ account id
+ organization
+ chat type
+ current conversation identity or resolved route label
+ OpenClaw session key
```

The actor alone is not enough. The display label alone is not enough. A global
recent-session search is never a fallback.

## Selection Flow

MVP uses explicit commands only:

```text
/resume
/resume 2
```

`/resume` returns a numbered list in the same chat. It does not create an
implicit "reply with 2" mode. This avoids accidental switches from normal chat
messages and avoids one user completing another user's picker in group chats.

Recommended `/resume` response:

```text
可恢复的历史对话

当前：周威 · 刚刚 · 新对话

1. 腾讯文档发布不了
   看起来 gog 的 OAuth token 过期了... · 5月23日 09:36

2. B端切换验收 testing-b
   收到，测试正常 · 5月21日 19:31

发送 /resume 2 切换到第 2 个历史对话。
```

For group chats, keep the output short enough for a shared channel and require
the command prefix for selection:

```text
发送 /resume 2 切换。仅回复 2 不会触发切换。
```

If a later phase adds buttons or short-lived pending selections, the pending
state must be keyed by:

```text
provider + accountId + organization + route sessionKey + senderId + command id
```

It must expire quickly, and another sender must not be able to complete it.

## Reply Ownership

OpenClaw should reply through the active channel runtime as OpenClaw, not by
asking the user-side client to insert text as the human user.

For WeCom this means the confirmation must come from the OpenClaw/Y-side WeCom
channel path. Do not use a Side Panel or browser bridge to fake the chat message
from the enterprise user's account.

## Restore Confirmation

`/resume N` must recompute the current scoped list, map `N` to a scoped
generation, restore the route, read back the active route through Gateway or
session history, then reply success.

Success response:

```text
已切换到历史对话

对话：B端切换验收 testing-b
时间：5月21日 19:31

最近聊到了：
你：testing-b 这个分支测试怎么样
OpenClaw：收到，测试正常

后续消息将进入这个上下文。
```

If read-back fails, do not send a success message.

## Required Tests

- Two direct chats with the same display label but different actors, accounts,
  or organizations do not see each other's sessions.
- A group chat never lists direct-chat generations with a similar label.
- Missing actor identity returns a scoped error and no sessions.
- Missing route identity returns a scoped error and no sessions.
- `/resume` does not enable bare numeric replies in MVP.
- Any future pending picker is isolated by actor and route.
- `/resume N` from an unauthorized actor does not mutate route state.
