# Slash-Command Prior Art

Date: 2026-05-27

This note compares mainstream coding-agent slash-command surfaces and extracts
only the parts that apply to OpenClaw Command Kit. The goal is not to clone a
terminal coding CLI. The goal is to choose small, native OpenClaw chat commands
that are useful across channels and safe under actor + route isolation.

## Sources Checked

- Claude Code commands: https://code.claude.com/docs/en/commands
- Codex CLI slash commands:
  https://developers.openai.com/codex/cli/slash-commands
- Kimi Code slash commands:
  https://www.kimi.com/code/docs/en/kimi-code-cli/reference/slash-commands.html
- Gemini CLI commands:
  https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/commands.md

## Cross-Tool Command Matrix

| Capability | Claude Code | Codex CLI | Kimi Code | Gemini CLI | OpenClaw implication |
|---|---|---|---|---|---|
| Discover commands | `/help` | slash popup, `/status` for config | `/help`, `/?` | `/help`, `/?` | Add `/commands` as a low-risk chat-native catalog. |
| Start fresh | `/clear`, `/reset`, `/new` | `/new`, `/clear` | `/new`, `/clear`, `/reset` | `/clear` | Do not fake `/new`; rely on OpenClaw-native session behavior. |
| Resume previous session | `/resume`, `/continue` | `/resume` | `/sessions`, `/resume` alias | `/resume`, `/chat` alias | Keep `/sessions` + `/resume N`, scoped to the current route. |
| Branch or fork | `/branch`, `/fork` | `/fork` | `/fork` | checkpoint-oriented resume | Later only if OpenClaw exposes safe native fork semantics. |
| Rename/title | `/rename` | `/title` | `/title`, `/rename` alias | manual tags for checkpoints | Later, after OpenClaw session metadata support is clear. |
| Compact context | `/compact` | `/compact` | `/compact` | `/compress` | Not part of session restore MVP. |
| Plan/read-only mode | `/plan` | `/plan`, `/goal` | `/plan` | `/plan` | Not part of channel command kit; runtime-specific. |
| Model/settings | `/model`, `/effort`, `/config` | `/model`, `/fast`, `/personality` | `/model`, `/theme`, `/editor` | `/model`, `/settings`, `/theme` | Reject for this kit; leave to OpenClaw core/user config. |
| Permissions/sandbox | `/permissions`, `/sandbox` | `/permissions`, sandbox read-dir | `/yolo` | `/permissions` | Reject in chat channels unless OpenClaw defines a native policy API. |
| MCP/tools/hooks | `/mcp`, `/hooks`, `/tools`-like surfaces | `/mcp`, `/hooks`, `/plugins`, `/skills` | `/mcp`, `/hooks`, `/skill`, `/flow` | `/mcp`, `/tools`, `/hooks`, `/skills` | Useful diagnostics, but not session-command MVP. |
| Export/import | `/export` | `/copy` | `/export`, `/import` | `/chat share` | Later, with explicit privacy and channel attachment rules. |
| Debug/status | `/status`, `/debug`, `/doctor` | `/status`, `/debug-config` | `/usage`, `/status`, `/debug` | `/stats`, `/about` | A redacted `/scope` or `/whoami` can be considered later. |
| Custom commands | skills and command files | skills and plugins, no broad local slash-command clone | skills, flows, plugins | `.toml` custom commands | Do not implement generic custom command loading in this kit. |

## Observations

### Discovery is a real command surface

All four tools provide a way to discover available commands. Terminal CLIs can
use a slash popup or pager. OpenClaw channel chats cannot assume that UI, so a
plain `/commands` response is the smallest portable discovery feature.

### Session commands are common, but scope differs

Claude, Codex, Kimi, and Gemini all expose some form of resume or session
browser. Their scope is usually local CLI state, current project, or current
working directory. OpenClaw's scope is different: an inbound channel route plus
actor identity. Therefore OpenClaw must adapt the idea, not copy it:

1. Resolve actor and route first.
2. List only sessions matching the exact current route.
3. Expose display indexes, never raw session ids.
4. Recompute the scoped list before restore.

### Interactive pickers do not transfer directly

Kimi and Gemini rely on interactive terminal browsers for session selection.
OpenClaw channel commands need text-only operation that works in WeCom,
Telegram, Slack, WebChat, and similar channels. Numbered selection through
`/resume N` is the lowest-common-denominator equivalent.

### Runtime-control commands should not be copied

Commands such as `/model`, `/permissions`, `/plan`, `/goal`, `/mcp`, `/hooks`,
and `/plugins` are tightly coupled to each tool's runtime and UI. Copying them
into OpenClaw Command Kit would violate the project scope and risk conflicting
with OpenClaw's own command namespace.

## Takeaways For AIC-2630

Implement now:

- `/commands`: command discovery for the OpenClaw Command Kit commands.
- `/sessions`: route-scoped read-only session list.
- `/resume`: route-scoped picker text.
- `/resume N`: exact selection from the current route-scoped list.

Defer:

- `/scope` or `/whoami`: useful only if output is redacted and clearly
  diagnostic.
- `/fork`, `/rename`, `/export`, `/compact`: require OpenClaw-native API
  support and separate safety rules.

Reject for this kit:

- Generic custom command loading.
- Runtime/model/permission controls copied from coding CLIs.
- Global session search before route scope is resolved.
