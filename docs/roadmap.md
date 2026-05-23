# Roadmap

## Phase 0: Design Workspace

Status: current.

- Capture command naming and UX.
- Document OpenClaw primitives to reuse.
- Define route-scope safety rules.
- Define MVP tests.
- Prepare a long-running agent handoff brief.

## Phase 1: Native Session Commands

Deliver:

- `/sessions`
- `/resume`
- `/resume N`

Requirements:

- scoped to current route;
- no global/fuzzy matches;
- no raw ids in normal output;
- read-back confirmed restore;
- friendly chat messages.

## Phase 2: Query Filtering

Deliver:

- `/sessions <query>`
- `/resume <query>`

Requirements:

- filter after exact route scope;
- query title, preview, last message, and time;
- no LLM-based authorization;
- ambiguous results show a numbered list.

## Phase 3: Conversation Organization

Candidates:

- `/rename <title>`
- `/fork`
- `/archive`
- `/pin`
- `/whereami` for operator diagnostics

These should wait until the resume flow is stable.

## Phase 4: Cross-Channel Polish

Adapt formatting and route resolution for:

- WeCom;
- Telegram;
- Slack;
- WebChat;
- group chats;
- threads.

## Open Decisions

- Should `/resume` support implicit numeric reply after showing a list?
- Should `/sessions 2` ever switch, or remain read-only forever?
- Should `/resume last` be allowed in MVP?
- Should command output include context usage by default?
- Should this become an OpenClaw upstream PR or a plugin first?
