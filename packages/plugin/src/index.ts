// OpenClaw extension plugin: /sessions, /resume, /resume N
//
// Installation: place this package in ~/.openclaw/extensions/openclaw-command-kit/
// (or npm link / npm install -g then reference in openclaw.json).

import type { OpenClawPluginApi, OpenClawPluginDefinition } from 'openclaw/plugin-sdk/plugins/types';
import { emptyPluginConfigSchema } from 'openclaw/plugin-sdk';
import { SessionCommandHandlers } from './command-handlers.js';

const plugin: OpenClawPluginDefinition = {
  id: 'openclaw-command-kit',
  name: 'OpenClaw Command Kit',
  description: 'Native session commands: /sessions, /resume, /resume N',
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    const handlers = new SessionCommandHandlers();

    api.registerCommand({
      name: 'sessions',
      description: '列出当前聊天可恢复的历史对话',
      acceptsArgs: false,
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
          return { text: '用法：/resume N（N 为对话编号）' };
        }
        const index = parseInt(args, 10);
        if (index <= 0) {
          return { text: '用法：/resume N（N 为对话编号）' };
        }
        return handlers.handleResumeByIndex(ctx, index);
      },
    });
  },
};

export default plugin;
