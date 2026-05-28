# Command Selection Rationale

Date: 2026-05-28

OpenClaw Command Kit v2 should start with the smallest real command path that
solves the current product gap: route-scoped session history and resume inside
OpenClaw chat channels. It should not become a generic clone of Claude Code,
Codex CLI, Kimi Code, or Gemini CLI.

## Decision Rules

| Decision | Rule |
|---|---|
| Copy | The command maps directly to OpenClaw's route-scoped session model and can be implemented with deterministic, fail-closed behavior. |
| Adapt | The command is a proven mainstream interaction, but terminal UI assumptions must be converted to chat-safe text commands. |
| Reject | The command duplicates OpenClaw core, crosses the project scope, or weakens the safety contract. |
| Later | The command is useful but requires metadata ownership, better UX primitives, or a proven first restore path. |

## Selected Command Set

| Command | Decision | Rationale | Safety boundary |
|---|---|---|---|
| `/sessions` | Copy | Mainstream agents expose session browsers or resume lists. OpenClaw lacks a native chat-route history list. | Read-only. Requires actor scope and exact route scope before listing. Never shows raw session IDs. |
| `/sessions <query>` | Copy | Users need to narrow long scoped lists without opening a global search surface. | Read-only. Filters only after actor and route scope are resolved. |
| `/resume` | Adapt | Terminal tools open an interactive picker. In chat, bare `/resume` should show the same scoped list plus the exact next command. | Read-only. Same authorization and formatting rules as `/sessions`. |
| `/resume <query>` | Adapt | Chat users need a safe candidate filter before choosing an explicit numeric restore. | Read-only. Shows filtered candidates and never switches directly. |
| `/resume N` | Adapt | Channel users need a deterministic replacement for picker selection. An explicit numeric command is simple and auditable. | Mutating. Recomputes the scoped list, validates the selected item, backs up `sessions.json`, restores, and requires `chat.history` read-back before success. |

## Rejected For V2 MVP

| Candidate | Decision | Reason |
|---|---|---|
| `/new` or `/reset` | Reject | OpenClaw already owns new/reset semantics. Command Kit must not fake or shadow built-in lifecycle behavior. |
| `/clear`, `/compact`, `/model`, `/status`, `/usage`, `/theme` | Reject | These are OpenClaw core/runtime concerns, not session-recovery plugin concerns. |
| `/permissions`, `/yolo`, `/sandbox` | Reject | Permission policy belongs to the host runtime. Auto-approve style controls are inappropriate for multi-channel chat commands. |
| `/mcp`, `/tools`, `/agents`, `/plugins`, `/skills` | Reject | This would generalize Command Kit into an agent-runtime control surface, which is outside the OpenClaw-specific scope. |
| `/review`, `/security-review`, `/diff`, `/autofix-pr` | Reject | These require repository and PR context, not just OpenClaw chat-route context. |

## Deferred Commands

| Candidate | Decision | Why later |
|---|---|---|
| `/fork` or `/branch` | Later | Valuable for long sessions, but requires clear transcript ownership and restore semantics first. |
| `/rename` or `/title` | Later | Requires OpenClaw-native session metadata ownership. Do not introduce a sidecar mapping pool. |
| `/export` or `/share` | Later | Requires privacy review and channel-specific file delivery behavior. |
| `/whereami` | Later | Useful for operators, but normal users should not see raw route/session internals. |

## AIC-2624 First Implementation Shortlist

AIC-2624 should implement only the three selected commands. The shortlist is
concrete enough for implementation and narrow enough to satisfy the security
contract.

| Item | Scope | Main risk | Required tests | Expected UX |
|---|---|---|---|---|
| `/sessions` | List current and historical sessions for the current actor and route. | Cross-actor or cross-route leakage. | Missing actor fails closed; missing route fails closed; direct and group routes do not mix; raw session IDs do not appear. | User receives a compact Chinese numbered list and a `/resume N` hint. |
| `/resume` | Show the same scoped list as `/sessions` with switch guidance. | Users may treat it as mutating. | Same list as `/sessions`; no store mutation; empty state is clear. | User sees current session and numbered candidates, with explicit `/resume N` instruction. |
| `/resume N` | Restore the N-th item from a freshly recomputed scoped list. | Wrong route mutation or false success after read-back failure. | Invalid index does not mutate; route mismatch is rejected; backup exists before write; read-back failure reports failure; successful restore confirms selected session. | User receives a success message with title, time, short preview, and confirmation that future messages enter that context. |

## Non-Negotiable Implementation Constraints

- Resolve actor scope before any list, search, or restore.
- Resolve route scope before any list, search, or restore.
- Treat display names and conversation labels as presentation only.
- Map numeric indexes to a freshly recomputed scoped list.
- Require `/resume N`; never switch on a bare number.
- Back up `sessions.json` before mutation.
- Confirm restore through OpenClaw `chat.history` read-back.
- Fail closed on missing, ambiguous, or mismatched route scope.

## Why This Is KISS, YAGNI, DRY, And SOLID

KISS: the first command set has one read-only list path and one restore path.

YAGNI: fork, rename, export, diagnostics, and runtime controls are explicitly
deferred until the scoped restore path is proven.

DRY: `/sessions` and `/resume` share the same scoped list service and formatter;
`/resume N` recomputes through the same service before mutating.

SOLID: command parsing, scope resolution, session listing, restore mutation, and
response formatting remain separate responsibilities with narrow interfaces.
