# AIC-2630 Design

## Goal

Restore OpenClaw Command Kit baseline validation, research slash-command prior
art, choose an OpenClaw-specific first command set, and implement at least
`/commands` with tests, docs, PR, and Linear handoff.

## Background

OpenClaw Command Kit currently proves `/sessions`, `/resume`, and `/resume N`,
but the project is too narrow for a public open-source product. The repo also
has a current typecheck failure in the plugin package caused by unresolved
`openclaw/plugin-sdk/plugins/types`, so feature work must first restore a clean
baseline.

## User Scenario

An OpenClaw user installs the plugin and sends slash commands in a chat channel.
The plugin responds with safe, scoped command help and, where implemented,
redacted context about the current actor/route without leaking raw session ids
or cross-user data.

## Scope

- Fix the plugin-sdk type resolution/typecheck baseline.
- Research slash-command prior art from Claude Code, Codex CLI, Kimi Code, and
  Gemini CLI.
- Write prior-art and command-selection docs.
- Implement `/commands`.
- Optionally implement `/scope` or `/whoami` if safe and time remains.
- Update docs and tests.

## Out Of Scope

- Website implementation.
- npm publishing.
- PR merge.
- OpenClaw core changes.
- High-risk permission, release, remote execution, or cross-user export
  commands.

## Architecture Review

Keep the existing split:

- `packages/core` owns parsing, services, formatting, and channel-agnostic
  behavior.
- `packages/plugin` owns OpenClaw plugin adapter registration.
- `docs` owns public command and release story.

External agent CLIs are prior art only; this issue must not introduce a generic
runtime abstraction.

## Risks

- Typecheck can be hidden with broad `any` instead of fixed.
- `/scope` or `/whoami` can expose sensitive route details if not redacted.
- Research can consume the whole run without implementation.
- Website work can distract from the Night 1 closed loop.

## Stop / Escalation Rules

Stop and hand off if the baseline fix requires OpenClaw core changes, if command
implementation would expose sensitive data, or if validation fails three times
after real fixes. Move the issue to a non-active Backlog or Blocked state with
the exact blocker rather than leaving it active.
