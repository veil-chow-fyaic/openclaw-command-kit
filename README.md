# OpenClaw Command Kit

OpenClaw Command Kit is a channel-agnostic extension plugin that provides native
OpenClaw chat commands for session history and resume.

## Table of Contents

- [Commands](#commands)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Build & Test](#build--test)
- [Upgrading](#upgrading)
- [Non-goals](#non-goals)
- [Relationship To Existing Work](#relationship-to-existing-work)
- [License](#license)

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/sessions` | List current and historical sessions for the current chat route. | `/sessions` |
| `/resume` | Show the session list with usage hints. | `/resume` |
| `/resume N` | Switch to the N-th session in the list. | `/resume 2` |

**Example `/sessions` output:**

```text
可恢复的历史对话

当前：刚刚 · 新对话

1. 腾讯文档发布不了 · 5月23日 09:36
   gog 的 OAuth token 过期了...

2. B端切换验收 testing-b · 昨天 19:31
   收到，测试正常

发送 /resume 2 切换到第 2 个历史对话。
```

**Example `/resume 2` output:**

```text
已切换到历史对话

对话：B端切换验收 testing-b
时间：5月21日 19:31

最近聊到了：
你：testing-b 这个分支测试怎么样
OpenClaw：收到，测试正常

后续消息将进入这个上下文。
```

## Quick Start

5-minute setup for development:

```bash
# Clone and build
git clone <repo-url> openclaw-command-kit
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

Restart the gateway:

```bash
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

Verify by sending `/sessions` in any OpenClaw channel.

For full details, see the [Quick Start Guide](docs/01-getting-started/quickstart.md).

## Installation

- **Development**: [Install from Source](docs/01-getting-started/installation.md#install-from-source)
- **Production**: [Install from npm](docs/01-getting-started/installation.md#install-from-npm)
- **Configuration**: [Configure OpenClaw](docs/01-getting-started/installation.md#configure-openclaw)
- **Upgrade / Uninstall**: [Upgrade](docs/01-getting-started/installation.md#upgrade) / [Uninstall](docs/01-getting-started/installation.md#uninstall)

System requirements: Node.js >= 18, OpenClaw >= 0.1.0.

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

The plugin is implemented as an **OpenClaw Extension Plugin** using the `openclaw/plugin-sdk` `registerCommand()` API. This provides native slash-command feel in any channel without modifying OpenClaw source code.

For the full architecture document, see [Architecture](docs/03-design/architecture.md).

## Documentation

### Getting Started
- [Quick Start](docs/01-getting-started/quickstart.md) — 5-minute setup guide
- [Installation Guide](docs/01-getting-started/installation.md) — Complete install, config, upgrade, and uninstall instructions

### Commands
- [Command Catalog](docs/02-commands/command-catalog.md) — Full command reference with usage, algorithms, constraints, and error responses
- [Resume Command Spec](docs/02-commands/resume-command-spec.md) — Detailed spec for `/resume` behavior and safety rules

### Design
- [Architecture](docs/03-design/architecture.md) — Component diagram, data model, and implementation phases
- [Channel Interaction](docs/03-design/channel-interaction.md) — Actor scope, route scope, and selection flow
- [Implementation Plan](docs/03-design/implementation-plan.md) — Task breakdown and risk register
- [Roadmap](docs/03-design/roadmap.md) — Phase 0 through Phase 4 roadmap
- [Security Contract](docs/03-design/security-contract.md) — Non-negotiable safety rules

### Reference
- [Agent Task Brief](docs/04-reference/agent-task-brief.md) — Primary handoff document for implementation agents
- [Loop Runbook](docs/04-reference/loop-runbook.md) — Execution guide for loop agents
- [Prior Art](docs/04-reference/prior-art.md) — Community research and related projects
- [Research Notes](docs/04-reference/research-notes.md) — Local OpenClaw observations and external references

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

For detailed upgrade steps, see the [Installation Guide](docs/01-getting-started/installation.md#upgrade).

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

## License

MIT
