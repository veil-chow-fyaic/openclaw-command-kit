# AIC-2630 Night 1 Plan

## Scope-Depth Decision

Path B: do enough upfront research to justify the first command set, then
implement only low-risk command value. Do not attempt the large showcase site
tonight.

## Phases

- [x] Inspect repo, AGENTS.md, package metadata, current command router, plugin handlers, and tests.
- [x] Reproduce baseline failure for `npm run lint`.
- [x] Fix plugin-sdk type resolution with the smallest maintainable change.
- [x] Verify baseline lint/tests/build can run or record a concrete blocker.
- [x] Research Claude Code, Codex CLI, Kimi Code, Gemini CLI slash-command prior art.
- [x] Write `docs/04-reference/slash-command-prior-art.md` with source links and command matrix.
- [x] Write `docs/03-design/command-selection-rationale.md` with copy/adapt/reject/later decisions.
- [x] Implement `/commands` in the existing core/plugin architecture.
- [x] Add tests for parser, response formatting, and plugin handler behavior.
- [x] Update README and `docs/02-commands/command-catalog.md`.
- [x] Defer optional `/scope` or `/whoami`; command-selection rationale documents the safety constraints.
- [x] Run final validation: `npm run lint && npm run test:run && npm run build`.
- [x] Append final progress event with `final state: Done` or blocker.
- [x] Commit, push, open PR, update Linear, and move issue to In Review or non-active Backlog/Blocked.

## Issue Graph

Parent issue: AIC-2622

Child issue: AIC-2630

Related planning issues: AIC-2623, AIC-2624, AIC-2629

## Acceptance Criteria

- [x] Baseline typecheck is repaired without broad compiler suppression.
- [x] Prior-art doc exists and cites Claude Code, Codex CLI, Kimi Code, Gemini CLI.
- [x] Command-selection rationale exists and justifies the first command set.
- [x] `/commands` is implemented, documented, and tested.
- [x] Optional `/scope` or `/whoami` is deferred unless redacted diagnostic output is explicitly needed.
- [x] `npm run lint` passes.
- [x] `npm run test:run` passes.
- [x] `npm run build` passes.
- [x] PR exists or exact blocker is recorded.

## Final Acceptance

AIC-2630 is complete when validation passes, a PR exists, and Linear has proof.
It does not close AIC-2622.
