# Design: AIC-2625 Release Documentation Readiness

## Goal

Make OpenClaw Command Kit understandable and adoptable as a public open-source
plugin project without requiring internal project history or a private handoff.

## Background

The parent request, AIC-2622, is a multi-child effort to turn the current
OpenClaw slash-command plugin into a polished public project. AIC-2623 produced
the command research and AIC-2624 merged the first command enhancement PR. This
child focuses on release and documentation quality before the showcase-site
design and implementation children run.

## User Scenario

An external OpenClaw user lands on the repository, reads the README, installs
the plugin from source, configures OpenClaw, understands the available
commands, verifies safety boundaries, and knows what is ready today versus what
requires a later manual npm release.

## Scope

- Public README and documentation clarity.
- Quick start, installation, upgrade, uninstall, troubleshooting, and examples.
- Command catalog accuracy for the current command set.
- Security and privacy docs aligned with route/actor scoped session behavior.
- Package metadata, plugin manifest, repository links, versioning, and dist
  artifact strategy.
- Release checklist for future npm publishing without publishing now.

## Out Of Scope

- npm publish.
- GitHub repository setting changes.
- Merging to or rewriting `main`.
- Showcase website design or implementation.
- New slash-command product behavior.

## Architecture Review

- The repo is an npm workspace with root, core, and plugin packages.
- `packages/plugin` is the OpenClaw extension boundary and should remain the
  public installation target.
- `packages/core` holds channel-agnostic command logic and must not gain
  OpenClaw-specific runtime assumptions.
- Distribution docs must not promise npm availability unless metadata and
  publishing state actually support it.
- Build outputs currently exist under package `dist` directories; the worker
  must decide and document whether those are committed artifacts, generated
  artifacts, or temporary release outputs.

## Risks

- Risk: docs claim publish readiness while the package remains private or not
  published. Mitigation: separate source install from future npm release steps.
- Risk: metadata changes imply an official organization or package ownership not
  yet configured. Mitigation: document assumptions and keep manual release tasks
  explicit.
- Risk: release polish accidentally changes command behavior. Mitigation: keep
  code changes out unless required for docs honesty, and run full validation.

## Stop / Escalation Rules

- Stop if npm publishing, GitHub settings, secrets, or default-branch changes
  are required.
- Stop if validation cannot pass after three real repair attempts.
- Stop if current docs cannot be reconciled with actual package behavior without
  a product decision.
