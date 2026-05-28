# Installation Guide

Complete guide for installing, configuring, and upgrading OpenClaw Command Kit.

## Table of Contents

- [System Requirements](#system-requirements)
- [Install from Source](#install-from-source)
- [Distribution and npm Status](#distribution-and-npm-status)
- [Compatibility and Versioning](#compatibility-and-versioning)
- [Build Artifacts](#build-artifacts)
- [Configure OpenClaw](#configure-openclaw)
- [Restart Gateway](#restart-gateway)
- [Verify Installation](#verify-installation)
- [Upgrade](#upgrade)
- [Uninstall](#uninstall)
- [Troubleshooting](#troubleshooting)

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

This is the current supported install path. It is suitable for local evaluation,
development, and deployments that can build from source.

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
mkdir -p "$HOME/.openclaw/extensions"
ln -sfn "$(pwd)/packages/plugin" "$HOME/.openclaw/extensions/openclaw-command-kit"
```

> **Note:** Do NOT copy the `dist` folder alone. The symlink ensures OpenClaw reads `package.json`, `openclaw.plugin.json`, and the compiled JS together.

## Distribution and npm Status

The workspace reserves these npm package names for a future release:

- `@openclaw-commands/core`
- `@openclaw-commands/openclaw-command-kit`

They are not part of the current supported install path. Do not document or
operate a deployment as npm-based until a maintainer has manually published the
packages and tagged a release.

When npm publishing is later approved, the intended install shape is:

```bash
npm install -g @openclaw-commands/openclaw-command-kit
```

and the intended config shape is:

```json
{
  "extensions": ["@openclaw-commands/openclaw-command-kit"]
}
```

Until that release exists, use the source install above.

For the complete release policy, see
[Release and Distribution](../03-design/release-distribution.md).

## Compatibility and Versioning

OpenClaw Command Kit currently targets:

- Node.js `>=18.0.0`.
- OpenClaw `>=0.1.0` with `plugin-sdk` command registration.
- OpenClaw CLI access through `openclaw gateway call`.

The current package version is `0.1.0`. Until a `1.0.0` release, treat the
OpenClaw plugin integration and package API as pre-1.0 SemVer: usable, tested,
and documented, but still allowed to change between minor versions.

## Build Artifacts

`packages/core/dist/**` and `packages/plugin/dist/**` are committed on purpose.
The source install links `packages/plugin`, and OpenClaw loads the compiled
entry at `packages/plugin/dist/src/index.js`.

Do not copy only `dist` into OpenClaw extensions. Link the package directory so
OpenClaw can read package metadata, `openclaw.plugin.json`, and compiled JS
together.

Root-level `dist/`, `node_modules/`, logs, and local environment files remain
ignored.

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

### Future npm Config

```json
{
  "extensions": ["@openclaw-commands/openclaw-command-kit"]
}
```

Use this only after a real npm release is published.

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
2. `/sessions <query>` — should filter only this route's authorized sessions.
3. `/resume` — should show the same list with usage hints.
4. `/resume <query>` — should show filtered candidates without switching.
5. `/resume 1` — should switch to the first historical session (if any exist).

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

### Future npm Upgrade

```bash
npm update -g @openclaw-commands/openclaw-command-kit
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

Use this only after npm publishing is complete.

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

### Future npm Uninstall

```bash
npm uninstall -g @openclaw-commands/openclaw-command-kit
# Remove from openclaw.json
# Restart gateway
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

Use this only after npm publishing is complete.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Command is not recognized | Gateway has not loaded the plugin. | Confirm the absolute path in `openclaw.json`, run `npm run build`, then restart the gateway. |
| `packages/plugin/dist/src/index.js` is missing | The source checkout was linked before build output existed. | Run `npm run build` from the repo root. |
| `/sessions` returns no history | The current actor and route have no resumable history. | Send a normal message in that route first, then try `/sessions` again. |
| `/sessions <query>` or `/resume <query>` returns no matches | Query filtering happens only after actor and route scope are enforced. | Run `/sessions` without a query and search for text that appears in the returned title, preview, message snippet, or time label. |
| `/resume 2 extra` shows usage | Hidden arguments after a numeric resume are invalid. | Use exactly `/resume N` or use `/resume <query>` as a read-only filter. |
| Rebuilt code is not reflected | OpenClaw keeps compiled plugin code in memory. | Restart the gateway after every rebuild or upgrade. |
