# Quick Start

Get OpenClaw Command Kit running from source in under 5 minutes.

The current supported install path is a source checkout linked into OpenClaw's
extension directory. npm package names are reserved for a future manual release,
but this project should not be treated as published to npm yet.

## What You Get

Native chat commands for OpenClaw:

| Command | What it does |
|---------|--------------|
| `/sessions` | Lists current + historical conversations for this chat route. |
| `/sessions <query>` | Filters that scoped list by title, preview, message text, or time label. |
| `/resume` | Same list as `/sessions`, with a stronger hint to use `/resume N`. |
| `/resume <query>` | Shows filtered resume candidates without switching sessions. |
| `/resume N` | Switches to the N-th conversation in the list. |

## Prerequisites

- Node.js >= 18
- OpenClaw >= 0.1.0 (with `plugin-sdk` support)
- `openclaw` CLI available in your shell (`which openclaw`)

## Source Install

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

## Configure OpenClaw

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

Replace `/Users/yourname` with your actual home directory path.

## Restart Gateway

**Important:** OpenClaw must restart to load the new plugin.

```bash
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

Wait 5 seconds for the gateway to come back up.

## Verify

Send this in any OpenClaw channel:

```text
/sessions
```

Expected response (example):

```text
可恢复的历史对话

当前：周威 · 刚刚

1. 腾讯文档发布不了
   gog 的 OAuth token 过期了... · 5月23日 09:36

2. B端切换验收 testing-b
   收到，测试正常 · 5月21日 19:31

发送 /resume 2 切换到第 2 个历史对话。
```

Then try switching:

```text
/resume 2
```

Expected response:

```text
已切换到历史对话

对话：B端切换验收 testing-b
时间：5月21日 19:31

最近聊到了：
你：testing-b 这个分支测试怎么样
OpenClaw：收到，测试正常

后续消息将进入这个上下文。
```

You can also verify scoped filtering without switching:

```text
/sessions testing-b
/resume testing-b
```

Filtered results are read-only and keep the displayed indexes. Use the exact
`/resume N` shown in the response to switch.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/sessions` returns nothing | Check that the chat route has prior conversations; verify `openclaw.json` plugin config. |
| `/sessions` says "没有可恢复的历史对话" | This is normal for a brand-new route with no history. |
| Command not recognized | Gateway not restarted after install. Run the `launchctl` restart command above. |
| Old code still running after rebuild | Gateway caches compiled JS in memory. Always restart after `npm run build`. |
| Linked package loads but JS is missing | Run `npm run build` again; OpenClaw loads `packages/plugin/dist/src/index.js`. |
| Query returns no matches | Queries only filter sessions already authorized for the current actor and route. Try `/sessions` first. |

## Next Steps

- Read the full [Installation Guide](installation.md)
- Browse the [Command Catalog](../02-commands/command-catalog.md)
- Understand the [Architecture](../03-design/architecture.md)
- Review [Release and Distribution](../03-design/release-distribution.md)
