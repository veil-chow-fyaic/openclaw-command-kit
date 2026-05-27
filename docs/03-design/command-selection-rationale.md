# Command Selection Rationale

Date: 2026-05-27

This document turns the slash-command prior-art review into concrete OpenClaw
Command Kit decisions. It applies the repository constraints: channel-agnostic
core semantics, OpenClaw as the source of truth for sessions, no WeCom-specific
fallbacks, and fail-closed behavior on ambiguous actor or route scope.

## Decision Summary

| Command | Decision | Reason |
|---|---|---|
| `/commands` | Implement now | Gives users command discovery in channels that do not have a slash popup. Read-only and low risk. |
| `/sessions` | Keep/ship | Matches prior-art session browsing, adapted to OpenClaw route scope. |
| `/resume` | Keep/ship | Provides a text picker and usage hint for channel chats. |
| `/resume N` | Keep/ship | Smallest text-only replacement for interactive session pickers. |
| `/scope` or `/whoami` | Later | Useful diagnostics, but must redact account/session details and avoid exposing route internals. |
| `/new` | Reject in this kit | OpenClaw already owns session creation/reset semantics; the kit must not fake them. |
| `/fork` | Later | Common in other CLIs, but requires explicit OpenClaw-native fork semantics. |
| `/rename` or `/title` | Later | Depends on stable OpenClaw session metadata support. |
| `/export` or `/import` | Later | Needs channel attachment/privacy rules and clear data ownership. |
| `/model`, `/permissions`, `/mcp`, `/hooks`, `/plan`, `/goal` | Reject | Runtime-specific controls outside this repo's OpenClaw session-command scope. |

## Why `/commands` Comes First

OpenClaw extension commands are available across channels, but many channels do
not expose the terminal-style slash menu used by Claude Code, Codex CLI, Kimi
Code, and Gemini CLI. A self-describing `/commands` command lets users discover
the small supported command set without relying on UI affordances.

The command is deliberately narrow:

- It returns only OpenClaw Command Kit commands.
- It does not inspect sessions.
- It does not require route reverse-lookup.
- It does not reveal session ids, account ids, organizations, or route keys.
- It does not implement plugin management or generic custom commands.

## Adapted Commands

### `/sessions`

Copied conceptually from prior-art session browsers, but adapted to OpenClaw:

- Scope is the current OpenClaw route, not the current working directory.
- Listing requires resolved actor and route scope.
- Display indexes replace raw ids.
- Missing or ambiguous scope fails closed.

### `/resume`

Adapted as a text picker. Other CLIs can open an interactive session browser,
but channel chats need a reply that works in plain text. Bare `/resume` returns
the same scoped list as `/sessions` plus a stronger hint for `/resume N`.

### `/resume N`

Adapted from session-browser selection:

- Recomputes the scoped list at restore time.
- Accepts only a positive integer after `/resume`.
- Rejects bare numeric replies.
- Confirms restore through OpenClaw read-back before reporting success.

## Rejected Commands

### `/new`

Do not implement in this kit. The project instructions explicitly say not to
fake `/new`, `/resume`, or session switching behavior. `/resume` is acceptable
only because it is backed by the OpenClaw session store and read-back
confirmation. A new-session command must remain an OpenClaw core behavior until
a native extension API exists.

### Runtime-control commands

Commands such as `/model`, `/permissions`, `/mcp`, `/hooks`, `/plan`, and
`/goal` are useful in coding CLIs because they own the runtime loop. OpenClaw
Command Kit is a session-command plugin, not a general runtime controller.
Implementing these here would broaden scope, duplicate OpenClaw core behavior,
and create avoidable command namespace conflicts.

## Deferred Commands

### `/scope` or `/whoami`

Potentially useful for operators validating route derivation. If implemented,
it must be redacted by default and must never include raw session ids, tokens,
or cross-user route data. It should also be clearly diagnostic rather than a
normal user workflow.

### `/fork`, `/rename`, `/export`, `/compact`

These commands appear in mainstream coding-agent CLIs, but each needs a stable
OpenClaw-native backing primitive and separate safety rules. They are not
needed to complete the first route-scoped session restore path.

## First Command Set

AIC-2630 should ship the following command set:

1. `/commands`
2. `/sessions`
3. `/resume`
4. `/resume N`

This set is small enough to validate thoroughly, useful without a terminal UI,
and aligned with the project security contract.
