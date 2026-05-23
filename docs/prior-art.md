# Prior Art And Community Research

Date: 2026-05-23

This project should not be built in isolation. The need for native session
history and resume commands already appears in OpenClaw's own ecosystem and in
community projects.

## Internal Prior Work

The most important local reference is:

- `/Users/fuyo-aic/projects/openclaw-session-bridge/docs/native-session-command-design.md`

That document came from the A/B Side Panel bridge work and is still valuable.
It proved the product requirement and clarified the command shape:

- `/sessions`: list resumable sessions under the current route.
- `/resume`: show a compact picker.
- `/resume N`: restore a selected historical generation.

Related repositories:

- A, WeCom Side Panel: https://github.com/veil-chow-fyaic/wecom-sidepanel-probe
- B, OpenClaw session bridge: https://github.com/veil-chow-fyaic/openclaw-session-bridge

These repositories are reference work, not runtime dependencies for this
project. The command kit should extract the general OpenClaw-native concepts
from B and avoid A-specific assumptions.

## OpenClaw Official And Near-Official Signals

### Control UI Feature Request

Issue:

- https://github.com/openclaw/openclaw/issues/10599

Summary:

- The issue requested a ChatGPT-like Control UI session history browser.
- It described existing transcripts under `~/.openclaw/agents/<agentId>/sessions/*.jsonl`.
- It noted that `/new` and `/reset` create/reset sessions while old transcripts
  remain on disk.
- It proposed list, preview, resume/restore, and optional search.
- It suggested restore could work by updating the session store to point back to
  an old `sessionId`.
- It was closed as `not planned`, so there is still product space for a focused
  command-layer implementation.

Relevance:

- Confirms the user need is real and not unique to our Side Panel work.
- Confirms the same low-level restore idea we validated in B.
- Does not provide a finished command implementation.

### Control UI Docs

Reference:

- https://docs.openclaw.ai/web/control-ui

Relevant capabilities:

- Control UI uses Gateway chat APIs including `chat.history`, `chat.send`,
  `chat.abort`, and `chat.inject`.
- Session configuration can be patched through `sessions.patch`.
- `chat.history` is rebuilt from durable session transcripts.

Relevance:

- Confirms the command kit should reuse Gateway/session primitives.
- The UI is useful as a behavior reference, but this project should not copy a
  dashboard UI.

### ACP Bridge

Reference:

- https://github.com/openclaw/openclaw/blob/main/docs.acp.md

Relevant capabilities:

- `openclaw acp` maps ACP sessions to Gateway sessions.
- ACP `listSessions` maps to Gateway `sessions.list`.
- `loadSession` can rebind an ACP session to a Gateway session key and replay
  stored history, though full tool/system reconstruction is partial.

Relevance:

- This is the closest official pattern for "client asks for session list, then
  loads an existing session".
- The command kit should reuse the same conceptual split: list first, load or
  restore second, then read back.

### Session Management Internals

Reference:

- https://deepwiki.com/openclaw/openclaw/2.4-session-management

Useful concepts:

- OpenClaw has session scoping modes such as `main`, `per-sender`, `global`,
  and `subagent`.
- A `sessionKey` is resolved for inbound messages.
- `sessions.json` maps session keys to current session entries.
- JSONL transcripts store the durable conversation history.
- Reset archives or rolls the active transcript rather than erasing history.

Relevance:

- The command kit must treat route scope and `sessionKey` as first-class.
- Listing and restore must happen after scope resolution, not by display label.

## Community Projects

These projects are useful references, but none fully replace the proposed native
chat command layer.

### Agent Sessions

References:

- https://www.reddit.com/r/openclaw/comments/1rfkxyb/viewing_searching_openclaw_session_history_with/
- https://agentskill.work/en/skills/jazzyalex/agent-sessions

What it provides:

- A local macOS session browser.
- Search/filter across multiple coding assistant histories, including OpenClaw.

Fit:

- Good reference for session search and preview UX.
- Not enough for native OpenClaw chat commands because it is an external app.

### PinchChat

Reference:

- https://www.reddit.com/r/openclaw/comments/1r2d27w/pinchchat_a_webchat_ui_built_for_openclaw/

What it provides:

- Alternative webchat UI with a session sidebar and token/tool-call display.

Fit:

- Good reference for history-sidebar UX.
- Not a replacement for `/resume` inside WeCom, Telegram, Slack, or other
  channel chats.

### ClawGPT

References:

- https://github.com/craihub/clawgpt
- https://www.reddit.com/r/openclaw/comments/1qxetmd/clawgpt_a_familiar_chat_ui_for_openclaw_with_message_editing_branching_model_switching_and_phone_sync/

What it provides:

- A familiar chat UI with chat history search and conversation branching.

Fit:

- Useful for understanding mainstream AI app expectations.
- It is still a separate UI, while this project is about native slash commands.

### Session History Skills

References:

- https://playbooks.com/skills/openclaw/skills/session-history
- https://myclaw.ai/skills/session-logs

What they provide:

- Search and browse utilities over JSONL session logs.

Fit:

- Useful for search implementation ideas.
- Must not become the authorization model. Query must run only after OpenClaw
  route scope is resolved.

## Conclusion

The community has already identified the same gap:

- users want ChatGPT-like session history;
- OpenClaw persists enough data to support it;
- existing UIs and tools can browse/search sessions;
- no obvious finished native slash-command flow exists for `/resume` in chat
  channels.

Therefore this project should continue, but it should stay small:

1. Reuse OpenClaw Gateway/session primitives.
2. Implement route-scoped `/sessions` and `/resume`.
3. Avoid new storage, duplicated indexes, or UI-heavy dashboard scope.
4. Treat external UI projects as UX references, not dependencies.

