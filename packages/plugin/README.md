# @openclaw-commands/openclaw-command-kit

OpenClaw extension plugin providing native session commands.

Current status: source install. This package name is reserved for a future npm
release, but npm availability should not be assumed until a release note says
the package was published.

## Commands

| Command | Description |
|---------|-------------|
| `/sessions` | List current and historical sessions for the current chat route. |
| `/sessions <query>` | Filter the scoped session list without global search. |
| `/resume` | Show the session list (same as `/sessions`). |
| `/resume <query>` | Show filtered resume candidates without switching sessions. |
| `/resume N` | Switch to the N-th session in the list. |

## Install

From the repo root:

```bash
npm install
npm run build
mkdir -p "$HOME/.openclaw/extensions"
ln -sfn "$(pwd)/packages/plugin" "$HOME/.openclaw/extensions/openclaw-command-kit"
```

Then reference the linked package in `~/.openclaw/openclaw.json` and restart the
OpenClaw gateway.

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

Future npm install shape, after a maintainer publishes the package:

```bash
npm install -g @openclaw-commands/openclaw-command-kit
```

Do not use the npm path for the current source-only release.

## Build Artifacts

OpenClaw loads `./dist/src/index.js` from this package. Keep `package.json`,
`openclaw.plugin.json`, and `dist` together; do not copy a bare `dist`
directory as a complete plugin install.

## Requirements

- Node.js >= 18
- OpenClaw >= 0.1.0

## License

MIT
