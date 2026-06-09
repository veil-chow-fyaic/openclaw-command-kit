// OpenClaw extension plugin: /resume, /sessions alias, /whereami
//
// Installation: place this package in ~/.openclaw/extensions/openclaw-command-kit/
// (or npm link / npm install -g then reference in openclaw.json).

import { emptyPluginConfigSchema } from 'openclaw/plugin-sdk';
import type { OpenClawPluginApi, OpenClawPluginDefinition } from 'openclaw/plugin-sdk/plugin-entry';
import { SessionCommandHandlers } from './command-handlers.js';

const plugin: OpenClawPluginDefinition = {
  id: 'openclaw-command-kit',
  name: 'OpenClaw Command Kit',
  description: 'Native session commands: /resume, /resume N, /resume <query>, /resume all, /resume help, /sessions alias, /whereami',
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    const handlers = new SessionCommandHandlers();

    api.registerCommand({
      name: 'sessions',
      description: '查看当前聊天可恢复的历史对话；/resume 的查看类別名',
      acceptsArgs: true,
      requireAuth: true,
      handler: (ctx) => {
        const args = (ctx.args ?? '').trim();
        const lower = args.toLowerCase();
        if (lower === 'help') {
          return handlers.handleResumeHelp();
        }
        if (/^\d+$/.test(args)) {
          const index = parseInt(args, 10);
          return index > 0 ? handlers.handleSessionsNumeric(index) : handlers.handleResumeUsage();
        }
        if (/^\d+\s+/.test(args)) {
          return handlers.handleResumeUsage();
        }
        if (lower === 'all') {
          return handlers.handleSessions(ctx, undefined, { mode: 'all' });
        }
        return handlers.handleSessions(ctx, args || undefined);
      },
    });

    api.registerCommand({
      name: 'whereami',
      description: '显示当前会话的诊断信息',
      acceptsArgs: false,
      requireAuth: true,
      handler: (ctx) => handlers.handleWhereami(ctx),
    });

    api.registerCommand({
      name: 'resume',
      description: '查看、搜索并恢复历史对话（/resume help 查看用法）',
      acceptsArgs: true,
      requireAuth: true,
      handler: async (ctx) => {
        const args = (ctx.args ?? '').trim();
        const lower = args.toLowerCase();
        if (!args) {
          return handlers.handleResume(ctx);
        }
        if (lower === 'help') {
          return handlers.handleResumeHelp();
        }
        if (lower === 'all') {
          return handlers.handleResumeList(ctx, undefined, { mode: 'all' });
        }
        if (!/^\d+$/.test(args)) {
          if (/^\d/.test(args)) {
            return handlers.handleResumeUsage();
          }
          return handlers.handleResumeList(ctx, args);
        }
        const index = parseInt(args, 10);
        if (index <= 0) {
          return handlers.handleResumeUsage();
        }
        return handlers.handleResumeByIndex(ctx, index);
      },
    });
  },
};

export default plugin;
