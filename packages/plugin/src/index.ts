// OpenClaw extension plugin: /sessions [query], /resume [query], /resume N
//
// Installation: place this package in ~/.openclaw/extensions/openclaw-command-kit/
// (or npm link / npm install -g then reference in openclaw.json).

import { emptyPluginConfigSchema } from 'openclaw/plugin-sdk';
import type { OpenClawPluginApi, OpenClawPluginDefinition } from 'openclaw/plugin-sdk/plugin-entry';
import { formatResumeUsage } from '@openclaw-commands/core';
import { SessionCommandHandlers } from './command-handlers.js';

const plugin: OpenClawPluginDefinition = {
  id: 'openclaw-command-kit',
  name: 'OpenClaw Command Kit',
  description: 'Native session commands: /sessions [query], /resume [query], /resume N',
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    const handlers = new SessionCommandHandlers();

    api.registerCommand({
      name: 'sessions',
      description: '列出当前聊天可恢复的历史对话',
      acceptsArgs: true,
      requireAuth: true,
      handler: (ctx) => handlers.handleSessions(ctx),
    });

    api.registerCommand({
      name: 'resume',
      description: '恢复历史对话（/resume 查看列表，/resume N 切换到第 N 个）',
      acceptsArgs: true,
      requireAuth: true,
      handler: async (ctx) => {
        const args = (ctx.args ?? '').trim();
        if (!args) {
          return handlers.handleResume(ctx);
        }
        if (!/^\d+$/.test(args)) {
          if (/^\d+\s+[\s\S]+$/.test(args)) {
            return { text: formatResumeUsage() };
          }
          return handlers.handleResume(ctx);
        }
        const index = parseInt(args, 10);
        if (index <= 0) {
          return { text: formatResumeUsage() };
        }
        return handlers.handleResumeByIndex(ctx, index);
      },
    });
  },
};

export default plugin;
