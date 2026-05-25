# @openclaw-commands/openclaw-command-kit

OpenClaw extension plugin providing native session commands.

## Commands

- `/sessions` – list current and historical sessions for the current chat route.
- `/resume` – show the session list (same as `/sessions`).
- `/resume N` – switch to the N-th session in the list.

## Install

Place this package in `~/.openclaw/extensions/openclaw-command-kit/` or install via npm:

```bash
npm install -g @openclaw-commands/openclaw-command-kit
```

Then reference it in your `openclaw.json`:

```json
{
  "extensions": ["@openclaw-commands/openclaw-command-kit"]
}
```

## Requirements

- Node.js >= 18
- OpenClaw >= 0.1.0

## License

MIT
