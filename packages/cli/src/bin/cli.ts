#!/usr/bin/env node
// openclaw-slash-kit CLI
// Usage:
//   npx openclaw-slash-kit install
//   npx openclaw-slash-kit publish [patch|minor|major]

import { installCommand } from '../commands/install.js';
import { publishCommand } from '../commands/publish.js';

const args = process.argv.slice(2);
const command = args[0] ?? 'install';

async function main() {
  switch (command) {
    case 'install':
      await installCommand(args.slice(1));
      break;
    case 'publish':
      await publishCommand(args.slice(1));
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      console.log(`openclaw-slash-kit

Usage:
  openclaw-slash-kit                    Install the Command Kit plugin on this device (default)
  openclaw-slash-kit install            Same as above
  openclaw-slash-kit publish [bump]     Publish a new release (patch|minor|major)
  openclaw-slash-kit help               Show this help
`);
      process.exit(command === 'help' || command === '--help' || command === '-h' ? 0 : 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
