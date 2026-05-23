# OpenClaw Command Kit

OpenClaw Command Kit is a planning and implementation workspace for filling
missing native OpenClaw chat commands.

The first target is session history and resume:

- `/sessions`: list scoped conversation history.
- `/resume`: show resumable conversations for the current chat route.
- `/resume 2`: switch to the second conversation from the current scoped list.

This project is OpenClaw-specific and channel-agnostic. It is not a WeCom Side
Panel project, not a bridge-local session store, and not a universal session
manager for unrelated agents such as Claude Code or Codex CLI. It should become
a reusable native OpenClaw command layer that can work across WeCom, Telegram,
Slack, WebChat, Discord, and other channels whenever OpenClaw has enough route
metadata.

## TLDR

- OpenClaw already has `/new`, `/reset`, `/status`, `/compact`, `/think`,
  `/verbose`, `/usage`, `/restart`, and `/activation`.
- OpenClaw also has `openclaw sessions` and Gateway session RPCs such as
  `sessions.list`, `sessions.preview`, `sessions.describe`, `sessions.resolve`,
  `sessions.reset`, `sessions.get`, and `chat.history`.
- The missing user-facing layer is a safe native command flow for history list,
  selection, and verified session restore.
- `/resume` is the recommended primary command name because it matches user
  intent better than `/switch-session`.
- MVP should be numeric and scoped: `/sessions`, `/resume`, `/resume 2`.
- Natural language search such as `/resume 昨天` or `/resume 腾讯文档` should be
  phase 2, after exact route-scoped authorization is stable.

## Current References

- [TLDR](docs/tldr.md)
- [Agent task brief](docs/agent-task-brief.md)
- [Research notes](docs/research-notes.md)
- [Prior art and community research](docs/prior-art.md)
- [Command catalog](docs/command-catalog.md)
- [Resume command spec](docs/resume-command-spec.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)

## Non-goals

- Do not duplicate OpenClaw session storage.
- Do not maintain per-user or per-contact mapping JSON.
- Do not depend on A-side Side Panel code.
- Do not turn this into a cross-agent abstraction for Claude Code, Codex CLI,
  Gemini CLI, or other runtimes with different session semantics.
- Do not expose raw `session_id` to ordinary users unless they request a debug
  mode.
- Do not perform global fuzzy session search before route scope is enforced.

## Relationship To Existing Work

The `openclaw-session-bridge` project proved the route-level session list,
new-session, switch, and confirmation semantics through A/B HTTP APIs.

Important prior work:

- Native command design from B:
  `/Users/fuyo-aic/projects/openclaw-session-bridge/docs/native-session-command-design.md`
- A, WeCom Side Panel:
  https://github.com/veil-chow-fyaic/wecom-sidepanel-probe
- B, OpenClaw session bridge:
  https://github.com/veil-chow-fyaic/openclaw-session-bridge

This project abstracts that learning into native OpenClaw command design. The
end state should live closer to OpenClaw slash-command handling and Gateway
session services, not as a special WeCom side panel feature.
