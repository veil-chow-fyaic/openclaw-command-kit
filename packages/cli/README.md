# openclaw-slash-kit

CLI companion for OpenClaw Command Kit.

## Install

```bash
npm install -g openclaw-slash-kit
# or
npx -y openclaw-slash-kit <command>
```

## Commands

### `openclaw-slash-kit install`

One-command setup on a new device:

- Verifies `openclaw` is installed
- Installs the Command Kit plugin (`@fyaic/openclaw-command-kit`) via `openclaw plugins install` when available on npm
- Falls back to a source symlink when the npm package is not yet published
- Updates `~/.openclaw/openclaw.json`
- Restarts the OpenClaw gateway

### `openclaw-slash-kit publish [patch|minor|major]`

Runs the guarded release script from the repo root:

- Validates git status
- Runs tests and build
- Bumps versions in both workspace packages
- Publishes `@fyaic/core` and `@fyaic/openclaw-command-kit`
- Tags and pushes to trigger CI

This command must be run from the `openclaw-command-kit` repository root.

## Shorthand

`osk` is registered as an alias:

```bash
osk install
osk publish patch
```
