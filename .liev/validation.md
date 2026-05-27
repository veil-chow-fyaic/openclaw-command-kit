# AIC-2630 Validation

## Required Commands

Run these from the repo root:

- [x] `npm run lint`
- [x] `npm run test:run`
- [x] `npm run build`

```bash
npm run lint
npm run test:run
npm run build
```

## Artifact-Specific Gate

Backend/plugin plus docs gate. The implementation must keep OpenClaw-specific
channel-agnostic architecture, include tests for new slash commands, and update
public command docs.

## Completion Rule

If validation passes, open a PR and move AIC-2630 to In Review. If validation is
blocked, record the exact blocker and move the issue to non-active Backlog or
Blocked. Do not leave the issue active without progress.
