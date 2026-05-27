# Installation Guide

Complete guide for installing, configuring, and upgrading OpenClaw Command Kit.

## Table of Contents

- [System Requirements](#system-requirements)
- [Install from Source](#install-from-source)
- [Install from npm](#install-from-npm)
- [Configure OpenClaw](#configure-openclaw)
- [Restart Gateway](#restart-gateway)
- [Verify Installation](#verify-installation)
- [Upgrade](#upgrade)
- [Uninstall](#uninstall)

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| OpenClaw | 0.1.0 | latest |
| OS | macOS, Linux | macOS 14+ |

Verify prerequisites:

```bash
node --version   # should print v18.x or higher
openclaw --version  # should print a version number
```

## Install from Source

Best for development or when you need the latest unreleased fixes.

```bash
# 1. Clone
git clone https://github.com/veil-chow-fyaic/openclaw-command-kit.git
cd openclaw-command-kit

# 2. Install dependencies
npm install

# 3. Build all workspace packages
npm run build

# 4. Verify tests pass
npm run test:run
```

### Link Plugin into OpenClaw

```bash
# Create symlink so OpenClaw loads the plugin
ln -s $(pwd)/packages/plugin ~/.openclaw/extensions/openclaw-command-kit
```

> **Note:** Do NOT copy the `dist` folder alone. The symlink ensures OpenClaw reads `package.json`, `openclaw.plugin.json`, and the compiled JS together.

## Install from npm

Best for production deployments.

```bash
npm install -g @openclaw-commands/openclaw-command-kit
```

Then add to `~/.openclaw/openclaw.json`:

```json
{
  "extensions": ["@openclaw-commands/openclaw-command-kit"]
}
```

## Configure OpenClaw

Edit `~/.openclaw/openclaw.json` and add the plugin entry.

### Minimal Config (source install)

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

### Minimal Config (npm install)

```json
{
  "extensions": ["@openclaw-commands/openclaw-command-kit"]
}
```

### Full Config Example

```json
{
  "modelProvider": "zai",
  "model": "glm-5-turbo",
  "contextTokens": 204800,
  "plugins": {
    "allow": ["wecom", "openclaw-command-kit"],
    "load": {
      "paths": ["/Users/yourname/.openclaw/extensions/openclaw-command-kit"]
    },
    "entries": {
      "openclaw-command-kit": { "enabled": true }
    }
  },
  "channels": {
    "wecom": {
      "enabled": true
    }
  }
}
```

## Restart Gateway

**This step is mandatory.** OpenClaw caches plugin code in memory at startup.

```bash
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

Wait 5–10 seconds for the gateway to fully initialize.

## Verify Installation

Send these commands in any OpenClaw channel:

1. `/sessions` — should list current + historical sessions.
2. `/resume` — should show the same list with usage hints.
3. `/resume 1` — should switch to the first historical session (if any exist).

If any command is not recognized, check:

1. Gateway restarted successfully (`ps aux | grep openclaw-gateway`).
2. Plugin path in `openclaw.json` is absolute and correct.
3. `npm run build` succeeded with no errors.

## Upgrade

### Upgrade from Source

```bash
cd openclaw-command-kit
git pull
npm install
npm run build

# Restart gateway
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

### Upgrade from npm

```bash
npm update -g @openclaw-commands/openclaw-command-kit
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

> **Always restart the gateway after upgrading.** The running process holds compiled JavaScript in memory; file changes alone do not take effect until restart.

## Uninstall

### Uninstall Source Install

```bash
# Remove symlink
rm ~/.openclaw/extensions/openclaw-command-kit

# Remove from openclaw.json
# Restart gateway
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

### Uninstall npm Install

```bash
npm uninstall -g @openclaw-commands/openclaw-command-kit
# Remove from openclaw.json
# Restart gateway
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```
