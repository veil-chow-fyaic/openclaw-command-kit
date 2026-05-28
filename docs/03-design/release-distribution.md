# Release and Distribution

This project is intended for public source distribution first. npm package
metadata is present so the packages can be published later, but npm publishing is
outside the current release scope.

## Current Distribution Mode

Supported today:

1. Clone `https://github.com/veil-chow-fyaic/openclaw-command-kit.git`.
2. Run `npm install` and `npm run build`.
3. Link `packages/plugin` into OpenClaw's extension directory.
4. Configure OpenClaw to load `openclaw-command-kit`.
5. Restart the OpenClaw gateway.

This mode keeps `package.json`, `openclaw.plugin.json`, and
`packages/plugin/dist/src/index.js` together. Do not copy `dist` by itself into
OpenClaw extensions.

## Future npm Distribution

Reserved package names:

- `@openclaw-commands/core`
- `@openclaw-commands/openclaw-command-kit`

These package names describe the intended public package shape. They must not be
treated as available until a maintainer has manually run an approved npm release
and published a release note.

Future global install shape:

```bash
npm install -g @openclaw-commands/openclaw-command-kit
```

Future OpenClaw config shape:

```json
{
  "extensions": ["@openclaw-commands/openclaw-command-kit"]
}
```

## Version Strategy

- Current version: `0.1.0`.
- Use SemVer, with `0.x` meaning the public API and OpenClaw plugin integration
  may still change.
- Keep the workspace packages on the same version while the plugin and core are
  tightly coupled.
- Use git tags such as `v0.1.0` only after validation passes and a maintainer
  approves the release.
- Do not publish npm packages from unattended issue work.

## Compatibility

Minimum runtime assumptions:

| Component | Requirement |
|-----------|-------------|
| Node.js | `>=18.0.0` |
| OpenClaw | `>=0.1.0` with `plugin-sdk` command registration |
| OpenClaw CLI | Available as `openclaw` for Gateway RPC calls |

The plugin is OpenClaw-specific. It does not provide a generic Claude Code,
Codex CLI, Gemini CLI, or multi-agent runtime abstraction.

## Package Metadata

Root workspace:

- `private: true` is intentional. The root package is a monorepo workspace, not
  the published runtime package.
- `repository`, `bugs`, and `homepage` point to
  `veil-chow-fyaic/openclaw-command-kit`.

Workspace packages:

- `@openclaw-commands/core` contains channel-agnostic command services.
- `@openclaw-commands/openclaw-command-kit` contains the OpenClaw extension
  plugin.
- `publishConfig.access: public` documents the future npm intent; it is not a
  release action.
- `peerDependencies.openclaw` declares the OpenClaw compatibility boundary for
  the plugin package.

Plugin manifest:

- Runtime metadata lives in `packages/plugin/src/index.ts` as the
  `OpenClawPluginDefinition` (`id`, `name`, `description`, and registered
  commands).
- `packages/plugin/openclaw.plugin.json` is intentionally minimal: plugin id and
  empty config schema. The plugin currently has no user-facing configuration.
- `packages/plugin/package.json` exposes `openclaw.extensions` pointing at
  `./dist/src/index.js`.

## Dist and Build Artifacts

Committed:

- `packages/core/dist/**`
- `packages/plugin/dist/**`

Ignored:

- `node_modules/`
- root-level `dist/`
- transient logs and local environment files

Rationale:

- Source installs link `packages/plugin`, and OpenClaw loads the compiled JS
  entry from `packages/plugin/dist/src/index.js`.
- Future npm packages include only `dist`, package README, and LICENSE through
  the package `files` list.
- Committed package-level `dist` keeps source installs inspectable, but
  maintainers should still run `npm run build` before validation and release.

## Manual Release Checklist

Do this only when a maintainer explicitly approves a release:

1. Confirm the target OpenClaw version and compatibility notes.
2. Run `npm run lint && npm run test:run && npm run build`.
3. Confirm package metadata and `dist` output are current.
4. Create or update release notes.
5. Tag the release.
6. Publish npm packages manually, if npm release is approved.
7. Verify install instructions against the published artifact.

Forbidden from unattended issue work:

- npm publish.
- GitHub default branch, org, permission, or repository setting changes.
- Merging to `main`.
- Shipping docs that imply npm packages are already available.
