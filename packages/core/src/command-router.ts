// Parse /sessions [query], /resume [query], /resume N; route to services.

import type {
  ActorScope,
  RouteScope,
  CommandResult,
  SessionCommandAdapter,
} from './types.js';
import { SessionHistoryService } from './session-history-service.js';
import { RestoreService } from './restore-service.js';
import {
  formatSessionList,
  formatResumeSuccess,
  formatError,
  formatResumeUsage,
} from './response-formatter.js';

export class CommandRouter {
  private history: SessionHistoryService;
  private restore: RestoreService;

  constructor(
    history: SessionHistoryService,
    restore: RestoreService
  ) {
    this.history = history;
    this.restore = restore;
  }

  async handle(
    rawText: string,
    actor: ActorScope,
    route: RouteScope,
    adapter: SessionCommandAdapter
  ): Promise<CommandResult> {
    const trimmed = rawText.trim();

    const sessionsMatch = trimmed.match(/^\/sessions(?:\s+([\s\S]+))?$/);
    if (sessionsMatch) {
      const query = sessionsMatch[1]?.trim();
      const items = await this.history.listSessions(actor, route, query);
      const current = items.find((i) => i.isCurrent);
      let text = formatSessionList(items, current, 10, query);
      text += '\n\n发送 /resume N 切换到第 N 个历史对话。';
      await adapter.deliverReply(route, text);
      return { handled: true };
    }

    const resumeMatch = trimmed.match(/^\/resume\s+(\d+)$/);
    if (resumeMatch) {
      const index = parseInt(resumeMatch[1], 10);
      if (index <= 0) {
        await adapter.deliverReply(route, formatResumeUsage());
        return { handled: true };
      }
      const result = await this.restore.restoreSession(actor, route, index);
      if (result.success && result.restoredSessionId) {
        const items = await this.history.listSessions(actor, route);
        const item = items.find((i) => i.sessionId === result.restoredSessionId);
        if (item) {
          await adapter.deliverReply(route, formatResumeSuccess(item));
        } else {
          await adapter.deliverReply(route, '已切换，但无法读取对话信息。');
        }
      } else {
        const err = result.error ?? 'readback_failure';
        await adapter.deliverReply(route, formatError(err));
      }
      return { handled: true };
    }

    if (/^\/resume\s+\d+\s+[\s\S]+$/.test(trimmed)) {
      await adapter.deliverReply(route, formatResumeUsage());
      return { handled: true };
    }

    const resumeQueryMatch = trimmed.match(/^\/resume(?:\s+([\s\S]+))?$/);
    if (resumeQueryMatch) {
      const query = resumeQueryMatch[1]?.trim();
      const items = await this.history.listSessions(actor, route, query);
      const current = items.find((i) => i.isCurrent);
      let text = formatSessionList(items, current, 10, query);
      text += '\n\n发送 /resume N 切换到第 N 个历史对话。';
      await adapter.deliverReply(route, text);
      return { handled: true };
    }

    return { handled: false };
  }
}
