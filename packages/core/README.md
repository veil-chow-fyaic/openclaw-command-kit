# @openclaw-commands/core

Core library for OpenClaw session commands.

## Features

- **SessionHistoryService** – list and query active/historical sessions from gateway + local transcript backups.
- **RestoreService** – resume a session by switching `sessions.json` to a historical generation.
- **ResponseFormatter** – format `/sessions` and `/resume` output for chat channels.
- **CommandRouter** – wire commands to handlers.

## Install

```bash
npm install @openclaw-commands/core
```

## Usage

```typescript
import { SessionHistoryService, RestoreService } from '@openclaw-commands/core';
```

## License

MIT
