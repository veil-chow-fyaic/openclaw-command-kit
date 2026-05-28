# AIC-2625 Plan

## Scope-Depth Decision

Path: B

Rationale:

- This is a docs/release-quality child issue. It should be thorough enough for
  public open-source readiness, but it must not add new product features or the
  showcase website.
- Work should stay inside README/docs/package metadata and any tiny consistency
  fixes discovered while validating.

## Phase 1 Release Surface Audit Findings

- Root README and installation docs present npm install as production-ready, but
  no npm publish is in scope and the root package remains private.
- Root package repository, bugs, and homepage metadata point at
  `openclaw-command-kit/openclaw-command-kit`, while the worker remote is
  `veil-chow-fyaic/openclaw-command-kit`.
- Package publish metadata exists for `@openclaw-commands/core` and
  `@openclaw-commands/openclaw-command-kit`, but release docs do not separate
  current source install from future manual npm publishing.
- `packages/core/dist` and `packages/plugin/dist` are committed generated
  artifacts; docs do not state whether consumers should rely on committed dist
  or rebuild from source.
- Command docs mostly match implementation, but roadmap still lists query
  filtering as future work even though `/sessions <query>` and `/resume <query>`
  are implemented.
- `WORKFLOW.md` is not present in this worker clone; AGENTS.md and `.liev/*`
  are the available local workflow contracts.

## Phases

- [x] Phase 1: Release surface audit
  - Goal: inventory README/docs/package/plugin metadata gaps.
  - Depends on: AIC-2624 merged into the lane branch.
  - Validation: record concrete gaps before editing.
  - Done when: audit findings are reflected in the implementation plan or docs.

- [x] Phase 2: Public README and getting-started path
  - Goal: make README, quick start, and installation usable by an external user.
  - Depends on: Phase 1.
  - Validation: links and commands are internally consistent.
  - Done when: install, configure, upgrade, uninstall, and troubleshooting paths
    are clear.

- [x] Phase 3: Command catalog and security/release docs
  - Goal: align command docs, security contract, roadmap, and distribution notes
    with the current command set and release story.
  - Depends on: Phase 1.
  - Validation: command examples match implemented behavior and package metadata.
  - Done when: users can understand capabilities, risks, and non-goals.

- [x] Phase 4: Metadata and artifact strategy
  - Goal: decide whether root/package metadata should remain private and how
    package publishing should work later.
  - Depends on: Phase 1.
  - Validation: metadata changes, if any, are justified in docs and do not
    imply npm was published.
  - Done when: package/plugin metadata and docs tell one consistent story.

- [x] Phase 5: Validation and handoff
  - Goal: prove the docs/release changes did not break the project.
  - Depends on: Phases 2-4.
  - Validation: run `npm run lint && npm run test:run && npm run build`.
  - Done when: PR is opened, Linear is updated, and `.liev/progress.md` contains
    final evidence.

## Issue Graph

Parent issue:

- AIC-2622: OpenClaw Command Kit v2 public open-source slash-command extension
  and showcase site.

Current child issue:

- AIC-2625: release/docs quality and distribution readiness.

Follow-ups:

- AIC-2626: showcase site design spec.
- AIC-2627: showcase site implementation.

## Acceptance Criteria

- [x] README explains product value, command set, installation, configuration,
  validation, and links to deeper docs.
- [x] Quick start and installation docs include source install, plugin config,
  upgrade, uninstall, and troubleshooting.
- [x] Command catalog examples match current `/sessions`, filtered
  `/sessions` queries, `/resume`, filtered `/resume` queries, and `/resume N`
  behavior.
- [x] Security contract clearly states scope isolation, privacy boundaries, and
  forbidden release shortcuts.
- [x] Release/distribution guidance explains npm status, package names,
  versioning, dist strategy, and manual publishing checklist.
- [x] Package/plugin metadata is reviewed and either corrected or explicitly
  justified.
- [x] Required validation command passes.

## Final Acceptance

- [x] `npm run lint && npm run test:run && npm run build` passed.
- [x] PR opened against `liev/openclaw-command-kit-v2`.
- [x] PR body includes summary, tests, risks, release/publishing notes, and
  rollback note.
- [x] AIC-2625 moved to In Review or a blocker was recorded.
