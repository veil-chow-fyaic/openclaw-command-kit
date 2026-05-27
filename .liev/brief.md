# AIC-2630 Night 1 Brief

## Goal

Run the first serious overnight pass for OpenClaw Command Kit v2: restore
baseline validation, research mainstream slash-command prior art, decide the
first OpenClaw-specific command set, implement at least `/commands`, validate,
open a PR, and hand off in Linear.

## Repo

GitHub repo: veil-chow-fyaic/openclaw-command-kit

Required branch: liev/aic-2630

## Planning Artifacts

- Linear parent: AIC-2622
- Linear child: AIC-2630
- Source repo instructions: AGENTS.md
- Current project docs under docs/

## Linear

- Project: liev - OpenClaw Command Kit
- Parent: AIC-2622
- Current issue: AIC-2630

## Definition Of Done

The issue is done when baseline validation is restored, prior-art and
command-selection docs exist, at least `/commands` is implemented and tested,
`npm run lint && npm run test:run && npm run build` passes, a PR is opened, and
Linear is moved to In Review with proof. If blocked, write the exact blocker and
move to a non-active Backlog or Blocked state.

## Pre-Approved Actions

- Edit files in the Symphony workspace for this repo.
- Add local TypeScript type shims if plugin-sdk types are unavailable, but keep
  them narrow and documented.
- Add command docs and tests.
- Commit, push, and create a PR for AIC-2630.
- Update Linear with progress, PR, validation evidence, and blockers.

## Off-Limits Without Human Input

- Do not publish npm.
- Do not merge PRs.
- Do not push to main.
- Do not modify OpenClaw core.
- Do not add broad dependencies for simple command behavior.
- Do not expose raw session ids, tokens, secrets, or cross-user route data.
- Do not implement website work in this issue.

## Notes For Future Agent

This is intended to run unattended overnight. Do not stop after planning. If
baseline validation is fixed early, continue into research, command selection,
implementation, docs, tests, PR, and Linear handoff.
