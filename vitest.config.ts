import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'openclaw/plugin-sdk': path.resolve('/opt/homebrew/lib/node_modules/openclaw/dist/plugin-sdk/index.d.ts'),
      'openclaw/plugin-sdk/plugins/types': path.resolve('/opt/homebrew/lib/node_modules/openclaw/dist/plugin-sdk/plugins/types.d.ts'),
    },
  },
});
