# @fyaic/core

Core library for OpenClaw session commands.

## Features

- **SessionHistoryService** – list and inspect active/historical sessions from gateway + local transcript backups.
- **RestoreService** – resume a session by switching `sessions.json` to a historical generation.
- **ResponseFormatter** – format `/sessions`, `/resume`, and `/resume debug` output for chat channels.
- **CommandRouter** – wire commands to handlers.

## Install

```bash
npm install @fyaic/core
```

## Usage

```typescript
import { SessionHistoryService, RestoreService } from '@fyaic/core';
```

## License

MIT
