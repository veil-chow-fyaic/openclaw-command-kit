# Project Instructions

This repository is for OpenClaw-specific, channel-agnostic slash-command enhancements.

## Scope

- Keep the project independent from WeCom Side Panel.
- Prefer OpenClaw-native Gateway, CLI, or internal session APIs.
- Treat OpenClaw as the source of truth for sessions.
- Build reusable command semantics that can work across channels.
- Do not generalize across unrelated agent runtimes such as Claude Code, Codex
  CLI, Gemini CLI, or similar tools.

## Non Goals

- Do not copy dashboard UI.
- Do not introduce a local user/contact/session mapping pool.
- Do not add WeCom-specific fallbacks into the core command design.
- Do not fake `/new`, `/resume`, or session switching behavior.

## Design Principles

- KISS: implement the smallest real command path first.
- YAGNI: defer natural-language session search until exact scoped listing works.
- DRY: centralize command parsing, scope resolution, and session formatting.
- Fail closed on missing or ambiguous route scope.

## Execution Plan

See `docs/implementation-plan.md` for the full phased plan.

See `docs/loop-runbook.md` for the **/unattended loop execution guide** — this is the primary task list for the loop agent.

See `docs/security-contract.md` for the **non-negotiable safety rules** — every implementation must satisfy every rule.

Key decisions:
- **No upstream PR** (OpenClaw source not cloned locally; compiled `dist/` only).
- **Extension Plugin approach**: use `openclaw/plugin-sdk` `OpenClawPluginApi.registerCommand()` to register `/sessions` and `/resume` as native extension commands. These bypass LLM processing and are evaluated before built-in commands. No per-channel adapter or monitor interception is required.
- **Core services are channel-agnostic**: actor/route resolvers, session history, restore service, response formatter live in `packages/core/`.
- **Plugin reverse-lookup**: `PluginCommandContext` lacks `sessionKey` and `organization`, so the plugin reverse-lookups them via `sessions.list` RPC by matching `deliveryContext` metadata.
- **Reference implementation**: B-bridge (`../openclaw-session-bridge/app/adapters.py`) already proves the exact restore algorithm via `sessions.json` mutation + `chat.history` read-back.

## Initial Commands

- `/sessions`: read-only current-scope session list.
- `/resume`: interactive numbered picker.
- `/resume <number>`: exact selection from the latest picker.
