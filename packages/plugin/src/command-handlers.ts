// Command handlers for /sessions, /resume, /resume N.

import {
  GatewayClient,
  SessionHistoryService,
  RestoreService,
  formatSessionList,
  formatResumeSuccess,
  formatResumeHint,
  formatResumeHelp,
  formatResumeUsage,
  formatSessionsRestoreBoundary,
  formatError,
} from '@fyaic/core';
import type { PluginCommandContext, PluginCommandResult } from 'openclaw/plugin-sdk/plugin-entry';
import { deriveScopes, type DeriveResult, type DeriveSuccess } from './scope-deriver.js';

function isSuccess(result: DeriveResult): result is DeriveSuccess {
  return 'actor' in result && 'route' in result;
}

export class SessionCommandHandlers {
  private gateway: GatewayClient;
  private history: SessionHistoryService;
  private restore: RestoreService;

  constructor(
    gateway?: GatewayClient,
    history?: SessionHistoryService,
    restore?: RestoreService
  ) {
    this.gateway = gateway ?? new GatewayClient();
    this.history = history ?? new SessionHistoryService(this.gateway);
    this.restore = restore ?? new RestoreService(this.gateway, this.history);
  }

  async handleSessions(
    ctx: PluginCommandContext,
    query?: string,
    options: { mode?: 'default' | 'all' } = {}
  ): Promise<PluginCommandResult> {
    const result = await deriveScopes(ctx, this.gateway);
    if (!isSuccess(result)) {
      return { text: formatError(result.reason) };
    }

    const items = await this.history.listSessions(result.actor, result.route, query, options);
    const current = items.find((i) => i.isCurrent);

    if (items.length === 0 && query) {
      return { text: `没有找到匹配 "${query}" 的历史对话。\n\n发送 /sessions 查看全部对话。` };
    }

    let text = formatSessionList(items, current);
    if (items.length > 0) {
      text += `\n\n${formatResumeHint()}`;
    } else {
      text += '\n\n提示：多聊几句后，新对话会自动出现在这里。';
    }
    return { text };
  }

  async handleResume(ctx: PluginCommandContext): Promise<PluginCommandResult> {
    const result = await deriveScopes(ctx, this.gateway);
    if (!isSuccess(result)) {
      return { text: formatError(result.reason) };
    }

    const items = await this.history.listSessions(result.actor, result.route);
    const current = items.find((i) => i.isCurrent);
    let text = formatSessionList(items, current);
    if (items.length > 0) {
      text += `\n\n${formatResumeHint()}`;
    }
    return { text };
  }

  async handleResumeList(
    ctx: PluginCommandContext,
    query?: string,
    options: { mode?: 'default' | 'all' } = {}
  ): Promise<PluginCommandResult> {
    return this.handleSessions(ctx, query, options);
  }

  handleResumeHelp(): PluginCommandResult {
    return { text: formatResumeHelp() };
  }

  handleSessionsNumeric(index: number): PluginCommandResult {
    return { text: formatSessionsRestoreBoundary(index) };
  }

  handleResumeUsage(): PluginCommandResult {
    return { text: formatResumeUsage() };
  }

  async handleResumeByIndex(
    ctx: PluginCommandContext,
    index: number
  ): Promise<PluginCommandResult> {
    const result = await deriveScopes(ctx, this.gateway);
    if (!isSuccess(result)) {
      return { text: formatError(result.reason) };
    }

    const restoreResult = await this.restore.restoreSession(result.actor, result.route, index);
    if (restoreResult.success && restoreResult.restoredSessionId) {
      const items = await this.history.listSessions(result.actor, result.route);
      const item = items.find((i) => i.sessionId === restoreResult.restoredSessionId);
      if (item) {
        return { text: formatResumeSuccess(item) };
      }
      return { text: '已切换，但无法读取对话信息。' };
    }

    const err = restoreResult.error ?? 'readback_failure';
    return { text: formatError(err, { index }) };
  }

  async handleWhereami(ctx: PluginCommandContext): Promise<PluginCommandResult> {
    const result = await deriveScopes(ctx, this.gateway);
    if (!isSuccess(result)) {
      const lines = [
        '当前会话信息（诊断模式）',
        '',
        `频道：${ctx.channel ?? '(空)'}`,
        `发送者：${ctx.senderId ?? '(空)'}`,
        `目标：${ctx.to ?? '(空)'}`,
        `账号：${ctx.accountId ?? '(空)'}`,
      ];
      lines.push(`\n无法推导范围：${result.reason === 'actor' ? '缺少用户身份' : '缺少聊天范围'}`);
      lines.push('提示：先正常发送几条消息后再试。');
      return { text: lines.join('\n') };
    }
    const { actor, route } = result;
    const lines = [
      '当前会话信息',
      '',
      `频道：${route.provider}`,
      `会话：${route.sessionKey}`,
      `类型：${route.chatType}`,
    ];
    if (route.accountId) lines.push(`账号：${route.accountId}`);
    if (route.organization) lines.push(`组织：${route.organization}`);
    if (route.label) lines.push(`标签：${route.label}`);
    if (actor.senderId) lines.push(`用户：${actor.senderId}`);
    if (actor.senderDisplayName) lines.push(`昵称：${actor.senderDisplayName}`);
    return { text: lines.join('\n') };
  }
}
