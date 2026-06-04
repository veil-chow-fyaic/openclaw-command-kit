# Publish Script

One-click safe release for the `@openclaw-commands/*` workspace.

## Prerequisites

- Git working tree clean, on `main` branch
- Logged into npm (`npm login`)
- All tests passing locally

## Usage

### Preview (safe, default)

```bash
node scripts/publish/release.mjs --dry-run
```

Shows exactly what would happen without making any changes.

### Real Release

```bash
node scripts/publish/release.mjs --real
```

Interactive flow:

1. Validates git status (main branch, clean tree)
2. Checks `npm whoami`
3. Runs `npm run test:run`
4. Runs `npm run build`
5. Prompts for bump type: `patch | minor | major`
6. Bumps version in both `packages/core/package.json` and `packages/plugin/package.json`
7. Commits version bump
8. Publishes `@openclaw-commands/core` to npm
9. Publishes `@openclaw-commands/openclaw-command-kit` to npm
10. Tags (`vX.Y.Z`) and pushes tag to trigger CI

## Safety Features

- **Dry-run by default**: Without `--real`, nothing is published
- **Confirmations**: `--real` asks for explicit confirmation before proceeding
- **Git guards**: Refuses to release if working tree is dirty or not on main
- **Ordered publishing**: Core is published before plugin (dependency order)
- **CI integration**: Tag push triggers `.github/workflows/publish.yml`
