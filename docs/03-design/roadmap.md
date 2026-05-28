# Roadmap

## Phase 0: Design Workspace

Status: completed.

- Capture command naming and UX.
- Document OpenClaw primitives to reuse.
- Define route-scope safety rules.
- Define MVP tests.
- Prepare a long-running agent handoff brief.

## Phase 1: Native Session Commands

Status: implemented as OpenClaw Extension Plugin (`packages/plugin/`).

Deliver:

- `/sessions`
- `/resume`
- `/resume N`

Requirements:

- scoped to current route;
- scoped to current actor;
- no global/fuzzy matches;
- no bare numeric reply switching;
- no raw ids in normal output;
- read-back confirmed restore;
- friendly chat messages.

Implementation:
- `packages/core/` — channel-agnostic services (`SessionHistoryService`, `RestoreService`, `CommandRouter`)
- `packages/plugin/` — OpenClaw Extension Plugin using `plugin-sdk` `registerCommand()` API
- Reverse-lookup `RouteScope` via `sessions.list` RPC since `PluginCommandContext` lacks `sessionKey`

## Phase 2: Query Filtering

Status: implemented.

Deliver:

- `/sessions <query>`
- `/resume <query>`

Requirements:

- filter after exact route scope;
- query title, preview, last message, and time;
- no LLM-based authorization;
- ambiguous results show a numbered list.

## Phase 3: Conversation Organization

Status: future.

Candidates:

- `/rename <title>`
- `/fork`
- `/archive`
- `/pin`
- `/whereami` for operator diagnostics

These should wait until the resume flow is stable.

## Release Readiness

Status: source distribution ready after validation.

Current scope:

- source install is the supported public distribution path;
- npm package names and metadata are prepared for a future manual release;
- package-level `dist` artifacts are committed and rebuilt before handoff;
- no npm publish, `main` merge, or repository setting change is part of this
  roadmap phase.

## Phase 4: Cross-Channel Polish

Status: future.

Adapt formatting and route resolution for:

- WeCom;
- Telegram;
- Slack;
- WebChat;
- group chats;
- threads.

## Open Decisions

- Should `/resume` support implicit numeric reply after showing a list in a
  later phase? MVP answer: no; require `/resume N`.
- Should `/sessions 2` ever switch, or remain read-only forever?
- Should `/resume last` be allowed in MVP?
- Should command output include context usage by default?
- ~~Should this become an OpenClaw upstream PR or a plugin first?~~ Decided: Extension Plugin via `plugin-sdk` `registerCommand()`. No source modification required.
