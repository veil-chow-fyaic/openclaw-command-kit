# AIC-2625 Brief

## Goal

Upgrade OpenClaw Command Kit release and documentation quality so an external
user can understand, install, evaluate, and safely adopt the project without
internal context.

## Repo

veil-chow-fyaic/openclaw-command-kit

## Planning Artifacts

- Design: `.liev/design.md`
- Plan: `.liev/plan.md`
- Validation: `.liev/validation.md`

## Branches

- Base branch: `liev/openclaw-command-kit-v2`
- Worker branch: `liev/aic-2625`

## Linear

- Parent issue: AIC-2622
- Current child issue: AIC-2625
- Previous child: AIC-2624, merged by PR #3 into `liev/openclaw-command-kit-v2`
- Next planned child after this one: AIC-2626

## Scope

- Improve README, quick start, installation, command catalog, security contract,
  roadmap, troubleshooting, and release/distribution guidance.
- Review package metadata for public open-source semantics: `private`,
  repository, bugs, homepage, package names, publish config, version strategy,
  plugin manifest, and compatibility notes.
- Decide and document the dist/build artifact strategy.
- Add realistic examples and troubleshooting for OpenClaw plugin installation
  and operation.
- Keep the project OpenClaw-specific and channel-agnostic.

## Off-Limits Without Human Input

- Do not publish to npm.
- Do not merge to `main` or change repository settings.
- Do not implement new command business logic unless a tiny docs-discovered fix
  is required to keep documented behavior honest.
- Do not implement the showcase website.
- Do not change GitHub org, default branch, access, or secrets.

## Definition Of Done

- External users can understand value, installation, commands, safety boundary,
  upgrade/uninstall, troubleshooting, and release status from README/docs.
- Package and plugin metadata are internally consistent with the chosen
  distribution story.
- Distribution strategy explicitly says what is publish-ready now and what
  remains manual.
- `npm run lint && npm run test:run && npm run build` passes.
- A PR is opened against `liev/openclaw-command-kit-v2` with validation evidence.

## Pre-Approved Actions

- Commit, push, and open a PR for scoped changes in this worker branch.
- Move AIC-2625 to In Review after PR creation and validation.
- Parent continuation is authorized for this run: after CI and Liev review gate
  pass, the supervisor may merge the child PR into `liev/openclaw-command-kit-v2`
  and promote the next scoped child. Do not publish npm or touch `main`.

## Stop / Escalation Rules

- If required validation fails three times after real fixes, record `final state:
  Blocked` in `.liev/progress.md`, move AIC-2625 out of active states, and stop.
- If a requested release action requires npm publish, GitHub settings, secrets,
  default branch changes, or production access, document it as manual follow-up.
- If docs and metadata conflict with actual repo behavior, fix the docs or record
  a blocker; do not pretend publish readiness.

## Notes For Future Agent

- The parent task is not complete after this child. AIC-2626 and AIC-2627 remain
  required for the showcase-site track.
- Treat AIC-2625 as release/docs readiness only. Keep website work out of this
  PR even if README needs to mention the future site.
- Do not use internal-only language in public-facing docs.
