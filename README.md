# OpenClaw Command Kit

OpenClaw Command Kit is a channel-agnostic extension plugin that provides native
OpenClaw chat commands for session history and resume.

The first target commands are:

- `/sessions`: list scoped conversation history.
- `/resume`: show resumable conversations for the current chat route.
- `/resume 2`: switch to the second conversation from the current scoped list.

This project is OpenClaw-specific and channel-agnostic. It is not a WeCom Side
Panel project, not a bridge-local session store, and not a universal session
manager for unrelated agents such as Claude Code or Codex CLI. It is a reusable
native OpenClaw extension plugin that works across WeCom, Telegram, Slack,
WebChat, Discord, and other channels without per-channel integration code.

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
- The command must resolve both the current actor and the current chat route
  before returning any session list.
- Natural language search such as `/resume 昨天` or `/resume 腾讯文档` should be
  phase 2, after exact route-scoped authorization is stable.

## Architecture

```
Channel Message Ingress (WeCom / Telegram / Slack / ...)
  |
  v
OpenClaw Core Dispatch
  |-- Checks extension plugin commands FIRST
  |
  v
[Extension Plugin: Command Handlers]
  |-- Receives PluginCommandContext { senderId, channel, to, accountId, ... }
  |-- Calls deriveScopes() to reverse-lookup RouteScope + ActorScope
  |
  v
[Core: Command Router] (channel-agnostic)
  |-- /sessions  --> [Core: Session History Service] --> [Core: Response Formatter]
  |-- /resume    --> [Core: Session History Service] --> [Core: Response Formatter]
  |-- /resume N  --> [Core: Restore Service] --> [Core: Response Formatter]
  |
  v
OpenClaw Core Dispatch (delivers reply back through same channel)
```

The repository has two layers:

1. **`packages/core/`** — Channel-agnostic core services. Zero OpenClaw or
   channel dependencies. Exported as `@openclaw-commands/core`.
2. **`packages/plugin/`** — OpenClaw Extension Plugin. Uses `plugin-sdk` to
   register `/sessions` and `/resume` commands, delegating to `core` services.
   Exported as `@openclaw-commands/plugin`.

## Installation

### Local Development

```bash
git clone <repo>
cd openclaw-command-kit
npm install
npm run build

# Symlink plugin package (contains package.json + openclaw.plugin.json) into OpenClaw extensions
ln -s $(pwd)/packages/plugin ~/.openclaw/extensions/openclaw-command-kit
```

Then add the plugin to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "allow": [
      "wecom",
      "openclaw-command-kit"
    ],
    "load": {
      "paths": [
        "/Users/yourname/.openclaw/extensions/openclaw-command-kit"
      ]
    },
    "entries": {
      "openclaw-command-kit": {
        "enabled": true
      }
    }
  }
}
```

Restart OpenClaw gateway for the plugin to load.

### npm Global Install

```bash
npm install -g @openclaw-commands/openclaw-command-kit
```

After install, add the plugin to `~/.openclaw/openclaw.json` `plugins.allow` and `plugins.load.paths` as shown above, then restart OpenClaw.

## Current References

- [TLDR](docs/tldr.md)
- [Agent task brief](docs/agent-task-brief.md)
- [Research notes](docs/research-notes.md)
- [Prior art and community research](docs/prior-art.md)
- [Command catalog](docs/command-catalog.md)
- [Resume command spec](docs/resume-command-spec.md)
- [Channel interaction and identity](docs/channel-interaction.md)
- [Architecture](docs/architecture.md)
- [Implementation plan](docs/implementation-plan.md)
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

This project abstracts that learning into an OpenClaw extension plugin. The end
state lives inside OpenClaw's own plugin system and Gateway session services,
not as a special WeCom side panel feature.
