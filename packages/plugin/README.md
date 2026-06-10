# @fyaic/openclaw-command-kit

OpenClaw extension plugin providing native session commands.

## Commands

| Command | Description |
|---------|-------------|
| `/sessions` | List current and historical sessions for the current chat route. Alias of `/resume`. |
| `/sessions all` | Show the full scoped list, including low-signal historical entries. |
| `/sessions debug` | Alias of `/resume debug`. |
| `/resume` | Primary resume command. Shows the same default list as `/sessions`. |
| `/resume N` | Switch to the N-th session in the list. |
| `/resume <query>` | Filter the scoped list by title or preview text. |
| `/resume all` | Show the full scoped list without switching. |
| `/resume help` | Show usage and boundary notes. |
| `/resume debug` | Show route-scoped diagnostics without exposing filtered session content. |
| `/whereami` | Operator diagnostics for the current command context. |

## Install

Install through the published CLI:

```bash
npx -y openclaw-slash-kit install
```

The installer verifies OpenClaw, installs or updates `@fyaic/openclaw-command-kit`,
updates `~/.openclaw/openclaw.json`, and restarts the OpenClaw gateway.

## Requirements

- Node.js >= 18
- OpenClaw >= 0.1.0

## License

MIT
