# TLDR

`openclaw-command-kit` is a small workspace for designing and later implementing missing native OpenClaw slash commands.

It is OpenClaw-specific and channel-agnostic. It is not a WeCom Side Panel project, not a general agent-session framework, and not another session index service.

## Goal

OpenClaw already supports commands such as `/new`, but it lacks common AI chat workflows like listing history and resuming a previous conversation from inside the chat.

This project proposes a reusable command layer for OpenClaw:

- `/sessions`: show resumable sessions for the current scoped route.
- `/resume`: show a numbered session picker.
- `/resume 2`: switch to a selected prior session.
- Future: `/fork`, `/rename`, `/pin`, `/archive`, `/whereami`.

The handoff document for a long-running implementation agent is:

- [Agent task brief](agent-task-brief.md)

## Prior Work

The strongest internal reference is:

- `/Users/fuyo-aic/projects/openclaw-session-bridge/docs/native-session-command-design.md`

Related A/B repositories:

- A: https://github.com/veil-chow-fyaic/wecom-sidepanel-probe
- B: https://github.com/veil-chow-fyaic/openclaw-session-bridge

Community research is tracked in:

- [Prior art and community research](prior-art.md)

## Core Rule

Session truth stays in OpenClaw.

This project may call OpenClaw Gateway, OpenClaw CLI, or OpenClaw internal APIs, but it must not maintain its own user/contact/session mapping table.

Do not try to generalize this across Claude Code, Codex CLI, Gemini CLI, or other agents. Their session models are different enough that a shared abstraction would likely become leaky and fragile.

## MVP

The first useful version should implement:

1. Resolve the current route scope from the inbound OpenClaw channel context.
2. List sessions under that exact scope.
3. Return a compact numbered list to the user.
4. Accept `/resume <number>` to switch.
5. Return a clear confirmation message after switching.

## Safety

- Never search globally across all users before route scope is resolved.
- Never infer ownership from display names alone.
- Never persist duplicate session mappings.
- Fail closed when scope is missing or ambiguous.
