# AIC-2625 Validation

## Required Commands

```bash
npm run lint && npm run test:run && npm run build
```

Commands must run inside this clean worker clone.

## Artifact-Specific Gate

Type: docs/release

Required evidence:

- [x] README and getting-started links resolve to existing files.
- [x] Command examples match the implemented command behavior and parser names.
- [x] Package metadata and release docs tell a consistent story.
- [x] Dist/build artifact strategy is documented.
- [x] No npm publish, main merge, repository settings change, secret access, or
  default branch change was performed.
- [x] Required validation command passed.
- [ ] PR was opened with validation evidence.

## Completion Rule

If validation is blocked or inconclusive, move AIC-2625 to Backlog with a
blocker comment and record `final state: Blocked` in `.liev/progress.md`. Do not
leave the issue active and do not claim review readiness.
