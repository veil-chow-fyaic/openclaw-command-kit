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

## Initial Commands

- `/sessions`: read-only current-scope session list.
- `/resume`: interactive numbered picker.
- `/resume <number>`: exact selection from the latest picker.
