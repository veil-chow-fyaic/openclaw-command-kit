# OpenClaw Command Kit

OpenClaw Command Kit is a channel-agnostic extension plugin that provides native
OpenClaw chat commands for session history and resume.

## Commands

| Command | Description |
|---------|-------------|
| `/sessions` | List current and historical sessions for the current chat route. |
| `/resume` | Show the session list (same as `/sessions`). |
| `/resume N` | Switch to the N-th session in the list. |

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
  |-- /sessions  --> SessionHistoryService --> ResponseFormatter
  |-- /resume    --> SessionHistoryService --> ResponseFormatter
  |-- /resume N  --> RestoreService        --> ResponseFormatter
  |
  v
OpenClaw Core Dispatch (delivers reply back through same channel)
```

## Installation

### Local Development

```bash
git clone <repo>
cd openclaw-command-kit
npm install
npm run build

# Symlink plugin into OpenClaw extensions
ln -s $(pwd)/packages/plugin ~/.openclaw/extensions/openclaw-command-kit
```

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "allow": ["wecom", "openclaw-command-kit"],
    "load": {
      "paths": ["/Users/yourname/.openclaw/extensions/openclaw-command-kit"]
    },
    "entries": {
      "openclaw-command-kit": { "enabled": true }
    }
  }
}
```

Restart OpenClaw gateway:

```bash
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

### Production / npm Global Install

```bash
npm install -g @openclaw-commands/openclaw-command-kit
```

Reference it in `~/.openclaw/openclaw.json` and restart the gateway as above.

## Build & Test

```bash
# Build all workspace packages
npm run build

# Run all tests
npm run test:run

# Type check without emitting
npm run lint
```

## Upgrading

After pulling or rebuilding:

1. Run `npm run build`
2. **Restart OpenClaw gateway** so the new compiled JS is loaded into the process.

## Documentation

- [TLDR](docs/tldr.md)
- [Architecture](docs/architecture.md)
- [Command catalog](docs/command-catalog.md)
- [Resume command spec](docs/resume-command-spec.md)
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

This project abstracts that learning into an OpenClaw extension plugin. The end
state lives inside OpenClaw's own plugin system and Gateway session services,
not as a special WeCom side panel feature.
