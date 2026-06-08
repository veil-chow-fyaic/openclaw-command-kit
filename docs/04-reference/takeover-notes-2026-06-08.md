# Takeover Notes - 2026-06-08

## Context

- Repository: `/Users/fuyo-aic/Projects/openclaw-command-kit`
- User report: npm-distributed `openclaw-slash-kit` installs on macOS but slash commands do not take effect.
- Current package split:
  - `@fyaic/core`: session history and restore logic.
  - `@fyaic/openclaw-command-kit`: OpenClaw plugin registering `/sessions`, `/resume`, and `/whereami`.
  - `openclaw-slash-kit`: installer/publisher CLI wrapper.

## Findings

- Local `~/.openclaw/openclaw.json` was using a symlinked source plugin path under `~/.openclaw/extensions/openclaw-command-kit`, so local behavior did not prove the npm install path.
- `openclaw plugins list --json` showed `openclaw-command-kit` as `loaded`, but `commands` was empty.
- OpenClaw built-in runtime slash plugins such as `phone-control` use both:
  - `activation.onStartup: true`
  - `commandAliases` entries with `kind: "runtime-slash"`
- The plugin manifest had `activation.onStartup: false` and no `commandAliases`, so the package could be discovered without its slash commands being routable.

## Fix Direction

- Declare startup activation for the runtime command plugin.
- Add runtime slash aliases for `sessions`, `resume`, and `whereami`.
- Bump `@fyaic/openclaw-command-kit` patch version so the fixed package can be republished without reusing `0.1.9`.

## Verification Targets

- `npm test --workspace @fyaic/openclaw-command-kit`
- `npm run build --workspace @fyaic/openclaw-command-kit`
- `npm pack --dry-run --workspace @fyaic/openclaw-command-kit`
- `openclaw plugins list --json` should show `commands` containing `sessions`, `resume`, and `whereami` after registry refresh/restart.

## Verification Completed

- `npx vitest run packages/plugin/tests/index.test.ts packages/plugin/tests/command-handlers.test.ts packages/plugin/tests/scope-deriver.test.ts`: 26 tests passed.
- `npm run test:run`: 12 test files and 100 tests passed.
- `npm run check --workspace @fyaic/openclaw-command-kit`: passed.
- `npm run build --workspaces`: passed for CLI, core, and plugin.
- `npm pack --dry-run --workspace @fyaic/openclaw-command-kit`: package includes updated `openclaw.plugin.json`.
- Temporary tarball inspection confirmed `activation.onStartup: true` and all three runtime slash aliases.
- Isolated install with `HOME=/tmp/... openclaw plugins install npm-pack:/tmp/.../fyaic-openclaw-command-kit-0.1.10.tgz` showed:
  - `version: 0.1.10`
  - `status: loaded`
  - `commands: ["sessions", "resume", "whereami"]`
  - source under the temporary npm-managed plugin directory.

## Release Note

- The currently published `@fyaic/openclaw-command-kit@0.1.9` remains affected until `0.1.10` is published.
- Publishing is an external write; do not run `npm publish` without explicit user confirmation.

## Follow-up Finding: Single Session In `/sessions`

- After `0.1.10`, runtime slash registration works, but `/sessions` can still show only one entry.
- Remote MacBook-Neo data showed the same WeCom route can exist under multiple sessionKey variants, for example:
  - `agent:main:wecom-default-弗忧联盟-veil（周威）`
  - `agent:main:wecom-default-veil（周威）`
  - `wecom-default-veil（周威）`
- Root cause:
  - `deriveScopes` picked the first matching delivery route, which could be an older sessionKey variant.
  - `SessionHistoryService` then required exact `sessionKey === route.sessionKey`, excluding other entries for the same delivery route.
- Fix prepared:
  - `deriveScopes` now chooses the newest matching delivery route by `updatedAt`.
  - `SessionHistoryService` now treats matching `deliveryContext.to` / `origin.to` / `origin.label` as the same route, while preserving provider/account/organization/chatType checks.
  - `@fyaic/core` must be published as `0.1.5`.
  - `@fyaic/openclaw-command-kit` must be published as `0.1.11` with dependency `@fyaic/core ^0.1.5`.
