# Human Takeover Brief - 2026-06-09

This document is the current human-facing handoff for OpenClaw Command Kit.
It consolidates the original product intent, the later agent-produced work,
the npm release state, and the gaps that still need manual product judgment.

Last verified: 2026-06-10 after the `v0.1.20` release.

## Executive Summary

OpenClaw Command Kit started as a focused OpenClaw feature request: provide
native `/sessions` and `/resume` commands so a user can list and restore prior
OpenClaw conversation context from the same chat channel.

The project later expanded into a broader OpenClaw command kit, then into a
standalone npm-distributed plugin/CLI, and briefly into a public product site.
Several autonomous agent runs produced useful code and docs, but also created
stale branches, old assumptions, and inconsistent documentation. The safest
next move is not to add more features. The next move is human acceptance,
product clarification, and end-to-end install validation.

The canonical source of truth is:

```text
/Users/fuyo-aic/Projects/openclaw-command-kit
```

Do not treat the Liev workspaces or archives as source of truth unless a human
explicitly selects a file or commit to recover.

## Current Local Repository State

- Canonical checkout: `/Users/fuyo-aic/Projects/openclaw-command-kit`
- GitHub remote: `https://github.com/veil-chow-fyaic/openclaw-command-kit.git`
- Current branch: `main`
- Current head at verification time: `b80d437 feat: add resume diagnostics`
- Current release tag at verification time: `v0.1.20`
- The 2026-06-10 release committed the previously pending source, test, docs,
  generated `dist/`, and package version changes. Remaining local handoff-doc
  edits should be reviewed separately from product/runtime changes.
- Main branch does not contain the showcase `site/` directory.
- `.liev/` and `WORKFLOW.md` exist locally but are ignored runtime residue.

Other local copies exist and should be treated as references only:

- `/Users/fuyo-aic/code/liev-symphony-workspaces-openclaw-command-kit/AIC-2628`
  - Liev workspace for final review.
  - Contains the static showcase site and final lane artifacts.
- `/Users/fuyo-aic/code/liev-symphony-archives/openclaw-command-kit/2026-05-28-failed-overnight/AIC-2630`
  - Historical failed overnight run.
- `/Users/fuyo-aic/code/liev-symphony-archives/openclaw-command-kit/2026-05-28-parent-accidental/AIC-2622`
  - Historical accidental parent workspace.
- `/Users/fuyo-aic/Projects/liev-symphony-kit/runtime/state/openclaw-command-kit*.json`
  - Liev runtime state, not product source.

## Product Timeline

1. Original scope: OpenClaw-native session commands.
   - Goal: `/sessions`, `/resume`, `/resume N`.
   - Core behavior: list route-scoped history, let the user recognize prior
     conversations, and restore one conversation by explicit index.
   - Non-goal: generic agent runtime abstraction or WeCom Side Panel dependency.

2. Command Kit expansion.
   - Added product direction for a broader OpenClaw-specific command kit.
   - Query filtering and diagnostics were introduced.
   - Current implementation includes `/sessions <query>`, `/resume <query>`,
     `/resume all`, `/resume help`, and `/whereami`.

3. Liev/Symphony lane work.
   - PRs on `liev/openclaw-command-kit-v2` produced research, docs, source
     distribution notes, showcase site spec, a static site, and a final review.
   - Final review said the lane was ready for human acceptance, not automatic
     npm publish, production deployment, or merge to `main`.
   - The site exists in the lane/AIC-2628 workspace, but is not in `main` and is
     not good enough to treat as an official product page.

4. npm distribution work.
   - The project moved from source-only install toward npm distribution.
   - Published packages now exist and the npm installer has been validated on
     the Bondie-Blue macOS OpenClaw install.
   - A 2026-06-08 takeover pass fixed runtime slash registration issues and
     later session matching issues.
   - A 2026-06-10 release added route-scoped resume diagnostics and refreshed
     the npm/docs surface.

## Current Package Surface

Versions observed from local package metadata and `npm view`:

| Package | Current version | Role |
|---|---:|---|
| `@fyaic/core` | `0.1.14` | Channel-agnostic session listing, diagnostics, filtering, restore, formatting |
| `@fyaic/openclaw-command-kit` | `0.1.20` | OpenClaw extension plugin |
| `openclaw-slash-kit` | `0.1.7` | Installer/publisher CLI |

Important implementation files:

- `packages/plugin/openclaw.plugin.json`
  - Declares startup activation and runtime slash aliases for `sessions`,
    `resume`, and `whereami`.
- `packages/plugin/src/index.ts`
  - Registers OpenClaw commands through `plugin-sdk`.
- `packages/plugin/src/scope-deriver.ts`
  - Derives actor and route scopes by reverse-looking up `sessions.list`
    because `PluginCommandContext` lacks full route metadata.
- `packages/core/src/session-history-service.ts`
  - Lists active sessions, supplements from local store, scans historical
    generations, filters default/query views.
- `packages/core/src/restore-service.ts`
  - Recomputes list, validates index, writes session store with backup, and
    requires read-back confirmation.
- `packages/cli/src/commands/install.ts`
  - Installs or updates `@fyaic/openclaw-command-kit` through
    `openclaw plugins install/update` when npm package is available.

## Current Command Surface

Command behavior observed in the current local worktree:

- `/sessions`
  - Lists current and historical conversations for the current derived route.
- `/sessions <query>`
  - Filters the scoped visible list. This is not global search.
- `/sessions all`
  - Shows the full scoped candidate set instead of the default filtered view.
- `/sessions debug`
  - Alias of `/resume debug`.
- `/sessions help`
  - Shows command help.
- `/sessions N`
  - Does not restore. It explains that restore requires `/resume N`.
- `/resume`
  - Shows the session list with restore hints.
- `/resume <query>`
  - Shows filtered candidates. It is read-only and does not switch directly.
- `/resume all`
  - Shows all scoped candidates.
- `/resume help`
  - Shows command help.
- `/resume debug`
  - Shows route-scoped diagnostic counts, trust sources, and filter reasons.
    It must not expose hidden session titles, previews, or content.
- `/resume N`
  - Mutates session state only after recomputing the scoped list, mapping the
    displayed index, validating route membership, backing up `sessions.json`,
    updating the route, and read-back confirming.
- `/whereami`
  - Diagnostic command for current scope. Treat as operator-facing until the
    privacy story is reviewed.

Before promising these details externally, run real-channel acceptance again
against the installed npm package rather than relying only on unit tests.

## What Is Solid Enough To Preserve

- The OpenClaw-specific product boundary is correct.
  - It is an OpenClaw plugin, not a WeCom Side Panel feature.
  - It uses OpenClaw as the session source of truth.
  - It should not become a generic Claude/Codex/Gemini session tool.
- The package split is reasonable:
  - `core`: channel-agnostic behavior.
  - `plugin`: OpenClaw glue and scope derivation.
  - `cli`: install/publish convenience.
- Runtime slash aliases and startup activation are now represented in the
  plugin manifest.
- The command model is safer than implicit pickers:
  - Query forms are read-only.
  - Only `/resume N` switches.
  - Bare numeric replies do not switch.
- Tests exist across core/plugin behavior and should be kept as the regression
  baseline.

## Known Problems And Drift

### 1. Full real-channel OpenClaw acceptance is not closed

The repository has unit tests, package-level checks, npm publish validation, and
a Bondie-Blue install/load smoke test. The full product promise is only true
after a real OpenClaw channel proves:

- `npx -y openclaw-slash-kit install` installs or updates the plugin cleanly.
- `openclaw plugins list --json` shows the plugin loaded and command aliases
  visible.
- `/sessions` in a real channel returns the correct scoped history.
- `/sessions <query>` filters only the scoped history.
- `/resume N` restores the selected context.
- The next user message actually continues with the restored context.
- Direct chats, group chats, accounts, organizations, and similar labels do not
  leak into one another.

### 2. Source/package state is published, but future local residue still needs ownership

The 2026-06-10 `v0.1.20` release accepted and published the command UX,
diagnostic, package, and generated `dist/` changes that were pending when this
brief was first written. Future agents should still review `git status` before
starting new work and should not assume unrelated local files belong to their
task.

### 3. Actor isolation still needs human review

The security docs require actor and route isolation. Current code requires
`senderId` to exist, but `SessionHistoryService` primarily filters by route,
account, organization, chat type, and delivery target. It does not obviously
filter each session item by the original `senderId`.

This may be acceptable if OpenClaw's route model intentionally treats a group
route as shared context. It is not acceptable if the product claim is that two
actors in the same visible route must have separate private session lists.
Resolve this explicitly before expanding public claims.

### 4. Documentation drift is reduced but not fully audited

The 2026-06-10 release corrected the primary README, package READMEs,
getting-started docs, command catalog, resume spec, plugin manifest, and publish
README for the current npm package names and command surface. Some older design
documents may still describe query or diagnostics as future phases and should be
audited before external promotion.

### 5. npm install path exists but is not polished

The packages are published and the installer successfully updated Bondie-Blue
from `0.1.19` to `0.1.20`, restarted the gateway, and loaded the plugin. The CLI
still needs clearer failure messages and rollback/recovery instructions before
external users are pointed at it confidently.

### 6. Showcase site is branch-only and not product-ready

The showcase site exists under the old lane branch/workspace:

```text
origin/liev/openclaw-command-kit-v2:site/
/Users/fuyo-aic/code/liev-symphony-workspaces-openclaw-command-kit/AIC-2628/site/
```

It is not in `main`. Treat it as rough inspiration only. Do not publish or merge
it without a human product rewrite. The product story is currently unclear and
the visual result is not acceptable as an official product page.

### 7. Old autonomous-agent artifacts can mislead future work

The Liev final review, old issue workspaces, `.liev` folders, and archives are
useful for traceability, but they are not current truth. Future agents should
not be handed a parent task that says "continue the old lane" without a scoped
child issue and explicit acceptance criteria.

## Recommended Human Plan

### P0 - Freeze Source Of Truth

- Work only from `/Users/fuyo-aic/Projects/openclaw-command-kit`.
- Leave Liev workspaces and archives read-only unless recovering a specific
  file.
- Review `git status` before making new edits and keep unrelated local files
  out of product commits.
- Do not start another broad autonomous run until this brief is converted into
  concrete, small tasks.

### P1 - Finish Documentation Audit

- Audit older design docs so implemented commands are not shown as future work.
- Check for any remaining old `@openclaw-commands/*` names.
- Check root package repository metadata.
- Clarify that npm packages are published, but human E2E acceptance is still
  required before broad external promotion.

### P2 - Run Clean OpenClaw Install Acceptance

Use a maintainer-controlled environment, ideally with no source symlink:

```bash
npx -y openclaw-slash-kit install
openclaw plugins list --json
```

Then test in at least one real OpenClaw channel:

```text
/whereami
/sessions
/sessions <known-query>
/resume
/resume N
```

Record exact evidence in a new dated note under `docs/04-reference/`.

### P3 - Decide Actor/Route Privacy Semantics

Make one explicit product decision:

- Option A: route-scoped shared history is intended for group routes.
- Option B: every actor must see only actor-owned generations even inside the
  same route.

After the decision, update `security-contract.md`, tests, and
`SessionHistoryService` accordingly.

### P4 - Decide Product Positioning

Keep the external promise narrow until the install path is pleasant:

```text
OpenClaw-native session commands: inspect scoped history and resume by explicit
index from the same channel.
```

Avoid claiming:

- a broad "multi-function command kit" until more commands are accepted;
- generic agent compatibility;
- production-grade website;
- effortless install unless clean install evidence proves it.

### P5 - Rework Or Drop The Website

The current site should not be shipped as-is. Either:

- drop the website from the near-term release and focus on README/install docs;
  or
- rewrite the site from a clear product story after P2/P3 are accepted.

Do not merge the old `site/` into `main` without design/content review.

### P6 - Prepare Future Releases Only After P2/P3

After clean install and privacy acceptance:

- bump packages deliberately;
- update changelog/release notes;
- run `npm run check --workspaces`, `npm run test:run`, and `npm run build`;
- publish only with explicit human approval.

## Suggested Human Task Breakdown

1. Documentation correction task
   - Fix package names, command status, release docs, and README install claims.
2. Clean install validation task
   - Test `openclaw-slash-kit` without source symlinks.
3. Real command behavior validation task
   - Test `/sessions`, query, `/resume N`, and follow-up context behavior.
4. Privacy semantics task
   - Decide and test actor-vs-route isolation.
5. Installer UX task
   - Improve CLI errors, rollback guidance, and verification output.
6. Website decision task
   - Drop, rewrite, or explicitly defer the showcase site.

## Future Agent Guardrails

If another agent is used, give it exactly one of the tasks above. Do not give it
the whole product history as an execution goal.

Every future agent task should include:

- target repo: `veil-chow-fyaic/openclaw-command-kit`;
- source path: `/Users/fuyo-aic/Projects/openclaw-command-kit`;
- one owned scope;
- files it may edit;
- validation command;
- explicit non-goals;
- whether npm publish, git push, gateway restart, or OpenClaw config changes
  are allowed.

Default forbidden actions unless explicitly approved:

- npm publish;
- git push or tag push;
- changing user OpenClaw production config;
- deleting Liev archives;
- merging the old site branch;
- broad autonomous "finish the product" tasks.
