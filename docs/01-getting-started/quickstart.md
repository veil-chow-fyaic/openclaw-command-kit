# Quick Start

Get OpenClaw Command Kit running in under 5 minutes.

## What You Get

Three native chat commands for OpenClaw:

| Command | What it does |
|---------|--------------|
| `/sessions` | Lists current + historical conversations for this chat route. |
| `/resume` | Same list as `/sessions`, with a stronger hint to use `/resume N`. |
| `/resume N` | Switches to the N-th conversation in the list. |

## Prerequisites

- Node.js >= 18
- OpenClaw >= 0.1.0 (with `plugin-sdk` support)
- `openclaw` CLI available in your shell (`which openclaw`)

## One-Line Install

```bash
# Clone and build
git clone <repo-url> openclaw-command-kit
cd openclaw-command-kit
npm install
npm run build

# Symlink plugin into OpenClaw extensions
ln -s $(pwd)/packages/plugin ~/.openclaw/extensions/openclaw-command-kit
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

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/sessions` returns nothing | Check that the chat route has prior conversations; verify `openclaw.json` plugin config. |
| `/sessions` says "没有可恢复的历史对话" | This is normal for a brand-new route with no history. |
| Command not recognized | Gateway not restarted after install. Run the `launchctl` restart command above. |
| Old code still running after rebuild | Gateway caches compiled JS in memory. Always restart after `npm run build`. |

## Next Steps

- Read the full [Installation Guide](installation.md)
- Browse the [Command Catalog](../02-commands/command-catalog.md)
- Understand the [Architecture](../03-design/architecture.md)
