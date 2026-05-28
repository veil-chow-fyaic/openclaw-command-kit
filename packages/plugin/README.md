# @openclaw-commands/openclaw-command-kit

OpenClaw extension plugin providing native session commands.

## Commands

| Command | Description |
|---------|-------------|
| `/sessions` | List current and historical sessions for the current chat route. |
| `/sessions <query>` | Filter the scoped session list without global search. |
| `/resume` | Show the session list (same as `/sessions`). |
| `/resume <query>` | Show filtered resume candidates without switching sessions. |
| `/resume N` | Switch to the N-th session in the list. |

## Install

Place this package in `~/.openclaw/extensions/openclaw-command-kit/` or install via npm:

```bash
npm install -g @openclaw-commands/openclaw-command-kit
```

Then reference it in your `openclaw.json` and restart the OpenClaw gateway.

## Requirements

- Node.js >= 18
- OpenClaw >= 0.1.0

## License

MIT
