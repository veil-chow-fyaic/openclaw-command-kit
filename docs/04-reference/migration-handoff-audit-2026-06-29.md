# Migration Handoff Audit - 2026-06-29

This document captures the current multi-repository and runtime state for the
OpenClaw Command Kit handoff. It is intentionally conservative: it records what
exists, what is clean, what is dirty, and what must not be lost during team
transfer.

## Audit Scope

Scanned roots:

- `/Users/fuyo-aic/Projects`
- `/Users/fuyo-aic/code`

Primary source of truth:

- `/Users/fuyo-aic/Projects/openclaw-command-kit`
- GitHub: `https://github.com/veil-chow-fyaic/openclaw-command-kit.git`

Related but separate sources:

- prior Side Panel bridge: `/Users/fuyo-aic/Projects/openclaw-session-bridge`
- WeCom organization-scope design: `/Users/fuyo-aic/Projects/openclaw-wecom-org-scope`
- install/bootstrap support: `/Users/fuyo-aic/Projects/mac-openclaw-bootstrap`
- Liev runtime and archives:
  - `/Users/fuyo-aic/Projects/liev-symphony-kit`
  - `/Users/fuyo-aic/code/liev-symphony-archives/openclaw-command-kit`
  - `/Users/fuyo-aic/code/git-branch-archives/openclaw-command-kit`

## Current Canonical Product State

`openclaw-command-kit` is the canonical active repo.

```text
Path: /Users/fuyo-aic/Projects/openclaw-command-kit
Branch: main
Baseline before this audit commit: 97901e6 docs: add command kit takeover brief
Remote: origin/main
Sync: behind 0 / ahead 0
Git status before this audit commit: clean
Stash: none
Release tag: v0.1.20 points at b80d437 feat: add resume diagnostics
```

Published npm versions at audit time:

| Package | Latest npm version |
|---|---:|
| `@fyaic/core` | `0.1.14` |
| `@fyaic/openclaw-command-kit` | `0.1.20` |
| `openclaw-slash-kit` | `0.1.7` |
| `openclaw` | `2026.6.10` |

Important note: `v0.1.20` is the runtime/npm release tag. The latest `main`
commit is a later docs-only handoff commit and is intentionally not tagged as a
package release.

## Repository Inventory

| Path | Role | Git state | Handoff action |
|---|---|---|---|
| `/Users/fuyo-aic/Projects/openclaw-command-kit` | Canonical product repo | Clean, synced to `origin/main` | Transfer as primary repo. |
| `/Users/fuyo-aic/Projects/openclaw-session-bridge` | Prior Side Panel bridge and gateway adapter evidence | Main clean; dirty diff preserved on local archive branch | Push/archive branch after GitHub auth is restored. |
| `/Users/fuyo-aic/Projects/openclaw-wecom-org-scope` | WeCom organization-scope design docs | Local git repo, clean root commit, no remote | Transfer directory or add remote after privacy review. |
| `/Users/fuyo-aic/Projects/mac-openclaw-bootstrap` | macOS OpenClaw install/bootstrap support | Clean, synced | Transfer as related installer/bootstrap repo. |
| `/Users/fuyo-aic/Projects/openclaw-client-host` | Windows/client-host related OpenClaw work | Clean, synced | Transfer only if client-host scope is included. |
| `/Users/fuyo-aic/Projects/openclaw-ops-docs` | OpenClaw operations docs | Clean, synced | Transfer as ops context. |
| `/Users/fuyo-aic/Projects/openclaw-deep-research` | Separate OpenClaw skill/project | Dirty and ahead 4 commits | Not part of Command Kit core, but must be resolved if broader OpenClaw migration includes it. |
| `/Users/fuyo-aic/Projects/liev-symphony-kit` | Liev automation runtime | Ahead 6 commits, dirty `.DS_Store` files | Do not treat as clean. Runtime still has active processes for this lane. |
| `/Users/fuyo-aic/Projects/Bondie` | Runtime OpenClaw/Bondie workspace | Clean but detached at `f438a88` | Runtime snapshot, not canonical source. Local command-kit npm project is outdated. |
| `/Users/fuyo-aic/Projects/meeting-restore/meeting-workflow` | Bondie restore workspace | Clean branch `0627-meeting-restore`, no upstream | Preserve as restore evidence, not canonical command-kit source. |
| `/Users/fuyo-aic/code/liev-symphony-archives/openclaw-command-kit/2026-05-28-failed-overnight/AIC-2630` | Archived failed overnight Liev run | Clean branch `liev/aic-2630` synced | Preserve for evidence. |
| `/Users/fuyo-aic/code/liev-symphony-archives/openclaw-command-kit/2026-05-28-parent-accidental/AIC-2622` | Archived accidental parent workspace | Clean branch `liev/aic-2622` | Preserve for evidence. |
| `/Users/fuyo-aic/code/git-branch-archives/openclaw-command-kit/20260609-150527-keep-main` | Branch snapshot archive | Bundle verified OK | Preserve; baseline is old `main` at `8a08080`, not current `main`. |

## Dirty / Risk Detail

### `openclaw-session-bridge`

Path: `/Users/fuyo-aic/Projects/openclaw-session-bridge`

```text
Branch: main
HEAD: b89e6fa Enforce canonical route labels for side panel sessions
Remote: origin/main
Sync: behind 0 / ahead 0
Main status after archival step: clean
Archive branch: archive/command-kit-handoff-20260629
Archive commit: 14a0c28 archive: preserve command kit bridge handoff diff
```

Archived diff intent:

- Adds `OPENCLAW_ENRICH_SESSION_HISTORY` feature flag.
- Reads local `sessions.json` for all-session visibility before falling back to
  `sessions.list`.
- Deduplicates by `sessionId`.
- Adds tests proving local session index can avoid a gateway full scan.

Remote caveat:

```text
origin/main        b89e6fa
legacy-origin/main aaad93c
origin is 10 commits ahead of legacy-origin
```

Handoff requirement: push `archive/command-kit-handoff-20260629` after GitHub
authentication is restored, or bundle the branch before deleting the working
tree. Do not assume this archive branch is product-approved; it preserves
handoff evidence.

### `openclaw-deep-research`

Path: `/Users/fuyo-aic/Projects/openclaw-deep-research`

```text
Branch: master
Remote: origin/master
Sync: behind 0 / ahead 4
Dirty count: 16
```

Dirty files include:

- `skill/SKILL.md`
- `skill/scripts/deep_research_controller.py`
- `skill/scripts/phase_manager.py`
- `skill/scripts/report_generator.py`
- `skill/scripts/state_manager.py`
- many tracked `__pycache__/*.pyc`
- untracked `evals/`

This appears separate from Command Kit, but it is OpenClaw-related. If the
handoff scope is "all OpenClaw projects", resolve this before transfer.

### `liev-symphony-kit`

Path: `/Users/fuyo-aic/Projects/liev-symphony-kit`

```text
Branch: main
Remote: origin/main
Sync: behind 0 / ahead 6
Dirty:
  ?? .DS_Store
  ?? docs/.DS_Store
```

Runtime state still shows an active Command Kit lane:

```text
State: /Users/fuyo-aic/Projects/liev-symphony-kit/runtime/state/openclaw-command-kit.json
Phase: running
Dashboard: http://127.0.0.1:4105/
runtimePid: 1282
symphonyPid: 1502
```

Process check:

```text
PID 1282: /opt/homebrew/bin/node runtime/node/liev-lanes.mjs run openclaw-command-kit
PID 1502: ./bin/symphony ... /Users/fuyo-aic/Projects/openclaw-command-kit/WORKFLOW.md --port 4105
Port 4105: listening by beam.smp PID 1502
```

But the configured workspace root is empty:

```text
/Users/fuyo-aic/code/liev-symphony-workspaces-openclaw-command-kit: 0B
```

`openclaw-command-kit.goals.json` still references missing worker paths:

| Issue | Runtime status | Path state |
|---|---|---|
| AIC-2630 | `handoff_required` / supervisor `running` | missing |
| AIC-2623 | `complete` / supervisor `complete` | missing |
| AIC-2624 | `monitor` / supervisor `running` | missing |
| AIC-2625 | `handoff_required` / supervisor `running` | missing |
| AIC-2626 | `launched` / supervisor `needs_launch` | missing |
| AIC-2627 | `handoff_required` / supervisor `blocked` | missing |
| AIC-2628 | `complete` / supervisor `complete` | missing |

Handoff requirement: do not ask the next team to continue these missing
workspace paths. Treat current Liev state as stale runtime evidence unless the
workspace is restored from archive.

### `Bondie` Runtime Snapshot

Path: `/Users/fuyo-aic/Projects/Bondie`

```text
Git state: clean
HEAD: detached at f438a88
Remote branch containing HEAD: origin/0623-meeting-quality
```

Local Bondie npm project still records an outdated Command Kit dependency:

```text
/Users/fuyo-aic/Projects/Bondie/npm/projects/fyaic-openclaw-command-kit-23c7d395b1/package.json
@fyaic/openclaw-command-kit: 0.1.18
```

This is not the latest verified install. It should be treated as a local runtime
snapshot, not as proof of the current product package.

### Local OpenClaw CLI State

Local `openclaw` version:

```text
OpenClaw 2026.5.22 (a374c3a)
```

Current npm latest:

```text
openclaw 2026.6.10
```

Local plugin inspection reported config warnings:

- `wecom` plugin is blocked because the extension path is world-writable.
- `openclaw-command-kit` is a stale config entry and not found locally.
- `acpx` and `slack` are referenced but not installed.

Do not use this local OpenClaw config as acceptance evidence for the current npm
Command Kit. The previous `0.1.20` smoke evidence came from the Bondie-Blue
macOS install, not this local state.

## Branch / Archive Evidence

### Branch Archive

Path:

```text
/Users/fuyo-aic/code/git-branch-archives/openclaw-command-kit/20260609-150527-keep-main
```

Important files:

- `all-refs-before-cleanup.bundle`
- `bundle-verify.txt`
- `refs.tsv`
- `branch-vv.txt`
- `current-worktree.diff`
- `current-worktree.diffstat.txt`
- `logs/*.rev.txt`
- `logs/*.unique-commits-vs-main.txt`
- `diffs/*.diffstat-vs-main.txt`
- `trees/*.tree.tar.gz`

Bundle verification:

```text
all-refs-before-cleanup.bundle is okay
The bundle contains 21 refs.
The bundle records a complete history.
```

Captured refs include:

- `liev/openclaw-command-kit-v2`
- `origin/liev/aic-2623`
- `origin/liev/aic-2624`
- `origin/liev/aic-2625`
- `origin/liev/aic-2626`
- `origin/liev/aic-2627`
- `origin/liev/aic-2628`
- `origin/liev/aic-2630`
- tags `v0.1.1` through `v0.1.8`

Important caveat: this archive was created before later `main` commits and
before the `v0.1.20` npm release. It preserves old branch state; it is not the
current source of truth.

### Liev Archives

Path:

```text
/Users/fuyo-aic/code/liev-symphony-archives/openclaw-command-kit
```

Size: `2.1G`.

Contains:

- `2026-05-28-failed-overnight/AIC-2630`
- `2026-05-28-parent-accidental/AIC-2622`

Both are git repos and are currently clean. They also contain `node_modules`,
so keep them as evidence archives rather than active development roots.

## WeCom Organization-Scope Design

Path: `/Users/fuyo-aic/Projects/openclaw-wecom-org-scope`

This started as a non-git design directory. During the archive pass it was
initialized as a local git repo:

```text
Branch: main
Commit: 8762a92 docs: archive wecom organization scope design
Remote: none
Status: clean
```

It contains design docs only:

- `README.md`
- `TODO.md`
- `adr/0001-openclaw-layer-org-scope.md`
- `docs/design.md`
- `docs/target-id-and-session.md`
- `docs/long-running-delivery.md`
- `docs/directory-data-contract.md`
- `docs/wecom-directory-skill.md`
- `docs/implementation-plan.md`
- `docs/open-questions.md`
- `docs/github-sync.md`

It is directly relevant to future privacy/session-routing work because Command
Kit relies on correct route and organization scoping. Before pushing this as a
new repo, review whether any future real directory data could contain sensitive
personnel information.

## Transfer Priorities

### P0 - Do Not Lose

- `/Users/fuyo-aic/Projects/openclaw-command-kit`
- `/Users/fuyo-aic/Projects/openclaw-session-bridge` archive branch
  `archive/command-kit-handoff-20260629`
- `/Users/fuyo-aic/code/git-branch-archives/openclaw-command-kit/20260609-150527-keep-main`
- `/Users/fuyo-aic/code/liev-symphony-archives/openclaw-command-kit`
- `/Users/fuyo-aic/Projects/openclaw-wecom-org-scope`

### P1 - Resolve Before New Work

- Push or bundle the `openclaw-session-bridge` archive branch after GitHub auth
  is restored.
- Decide whether the stale Liev runtime should be stopped after handoff
  evidence is captured.
- Decide whether local OpenClaw config should be repaired or explicitly ignored.
- Decide whether `openclaw-wecom-org-scope` should get a remote repo.

### P2 - Broader OpenClaw Migration Items

- `openclaw-deep-research` is dirty and ahead of remote.
- `liev-symphony-kit` is ahead of remote and has stale lane runtime.
- `Bondie` and `meeting-restore` are clean but not normal synced development
  branches.

## Suggested Handoff Packet

Give the receiving team:

1. Main repo:
   `https://github.com/veil-chow-fyaic/openclaw-command-kit`
2. Latest package versions:
   `@fyaic/core@0.1.14`,
   `@fyaic/openclaw-command-kit@0.1.20`,
   `openclaw-slash-kit@0.1.7`
3. Primary docs:
   - `docs/04-reference/human-takeover-brief-2026-06-09.md`
   - this file
   - `docs/02-commands/command-catalog.md`
   - `docs/02-commands/resume-command-spec.md`
4. Archive paths:
   - `/Users/fuyo-aic/code/git-branch-archives/openclaw-command-kit/20260609-150527-keep-main`
   - `/Users/fuyo-aic/code/liev-symphony-archives/openclaw-command-kit`
5. Explicit warning:
   do not continue from `/Users/fuyo-aic/code/liev-symphony-workspaces-openclaw-command-kit`;
   it is currently empty.

## Final Audit Conclusion

The canonical Command Kit repo is clean and safely pushed. The package release
chain is intact. The main risks for migration are not in the canonical repo;
they are in adjacent evidence and runtime directories:

- local-only `openclaw-session-bridge` archive branch not yet pushed;
- stale but running Liev lane state with missing workspaces;
- local-only WeCom org-scope design git repo with no remote;
- local OpenClaw/Bondie runtime snapshots that are not on the latest package.

Handle those explicitly before deleting, archiving, or handing over machines.
