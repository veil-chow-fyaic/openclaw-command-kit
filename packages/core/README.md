# @openclaw-commands/core

Core library for OpenClaw session commands.

Current status: workspace package for the OpenClaw Command Kit source install.
The npm package name is reserved for a future public release.

## Features

- **SessionHistoryService** – list and query active/historical sessions from gateway + local transcript backups.
- **RestoreService** – resume a session by switching `sessions.json` to a historical generation.
- **ResponseFormatter** – format `/sessions` and `/resume` output for chat channels.
- **CommandRouter** – wire commands to handlers.

## Install

Current source consumers use this package through the root workspace. Future npm
install shape, after a maintainer publishes the package:

```bash
npm install @openclaw-commands/core
```

Do not assume the npm package is available until the project has a tagged
release that says it was published.

## Usage

```typescript
import { SessionHistoryService, RestoreService } from '@openclaw-commands/core';
```

## License

MIT
