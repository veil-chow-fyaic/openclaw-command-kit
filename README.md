# OpenClaw Command Kit

OpenClaw Command Kit is a channel-agnostic extension plugin that provides native
OpenClaw chat commands for session history and resume.

Current release status: install from source. The workspace contains package
metadata for a future public npm release, but no npm package should be assumed
available until a release note says so.

## Table of Contents

- [Commands](#commands)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Architecture](#architecture)
- [Release & Distribution](#release--distribution)
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
| `/sessions <query>` | Filter the current route's session list by title, preview, message snippet, or time label. | `/sessions 腾讯文档` |
| `/resume` | Show the session list with usage hints. | `/resume` |
| `/resume <query>` | Show filtered resume candidates without changing session state. | `/resume testing-b` |
| `/resume N` | Switch to the N-th session in the list. | `/resume 2` |

Query mode is read-only and always runs after actor and route scope have been
resolved. It never performs global search and never exposes raw session IDs.
Filtered results keep their original list indexes, so the follow-up command is
still the explicit `/resume N` shown in the response.

**Example `/sessions` output:**

```text
可恢复的历史对话

当前：周威 · 刚刚

1. 腾讯文档发布不了
   gog 的 OAuth token 过期了... · 5月23日 09:36

2. B端切换验收 testing-b
   收到，测试正常 · 5月21日 19:31

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
git clone https://github.com/veil-chow-fyaic/openclaw-command-kit.git
cd openclaw-command-kit
npm install
npm run build

# Symlink plugin into OpenClaw extensions
mkdir -p "$HOME/.openclaw/extensions"
ln -sfn "$(pwd)/packages/plugin" "$HOME/.openclaw/extensions/openclaw-command-kit"
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

- **Current supported path**: [Install from Source](docs/01-getting-started/installation.md#install-from-source)
- **Configuration**: [Configure OpenClaw](docs/01-getting-started/installation.md#configure-openclaw)
- **Upgrade / Uninstall**: [Upgrade](docs/01-getting-started/installation.md#upgrade) / [Uninstall](docs/01-getting-started/installation.md#uninstall)
- **Release status**: [Distribution and npm status](docs/01-getting-started/installation.md#distribution-and-npm-status)

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
  |-- /sessions [query] --> SessionHistoryService --> ResponseFormatter
  |-- /resume [query]   --> SessionHistoryService --> ResponseFormatter
  |-- /resume N         --> RestoreService        --> ResponseFormatter
  |
  v
OpenClaw Core Dispatch (delivers reply back through same channel)
```

The plugin is implemented as an **OpenClaw Extension Plugin** using the `openclaw/plugin-sdk` `registerCommand()` API. This provides native slash-command feel in any channel without modifying OpenClaw source code.

For the full architecture document, see [Architecture](docs/03-design/architecture.md).

## Release & Distribution

The supported distribution mode today is source install:

- clone this repo;
- build the workspace;
- link `packages/plugin` into `~/.openclaw/extensions/openclaw-command-kit`;
- configure OpenClaw to load `openclaw-command-kit`;
- restart the gateway.

The root package remains `private: true` because it is a monorepo workspace, not
the runtime package. Workspace package metadata reserves
`@openclaw-commands/core` and `@openclaw-commands/openclaw-command-kit` for a
future public npm release, but this issue does not publish npm packages.

Package-level `dist` directories are committed intentionally. Source installs
need `packages/plugin/dist/src/index.js`, and future npm packages will ship
compiled `dist` output through each package's `files` list. Root-level `dist`,
`node_modules`, logs, and local environment files stay ignored.

For details, see [Release and Distribution](docs/03-design/release-distribution.md).

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
- [Release and Distribution](docs/03-design/release-distribution.md) — Source install, future npm path, versioning, metadata, and dist strategy
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
