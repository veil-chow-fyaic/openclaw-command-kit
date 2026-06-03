// Command handlers for /sessions, /resume, /resume N.
import { GatewayClient, SessionHistoryService, RestoreService, formatSessionList, formatResumeSuccess, formatError, } from '@openclaw-commands/core';
import { deriveScopes } from './scope-deriver.js';
export class SessionCommandHandlers {
    gateway;
    history;
    restore;
    constructor(gateway, history, restore) {
        this.gateway = gateway ?? new GatewayClient();
        this.history = history ?? new SessionHistoryService(this.gateway);
        this.restore = restore ?? new RestoreService(this.gateway, this.history);
    }
    async handleSessions(ctx) {
        const scopes = await deriveScopes(ctx, this.gateway);
        if (!scopes) {
            return { text: '无法确认当前聊天范围，请稍后再试。' };
        }
        const items = await this.history.listSessions(scopes.actor, scopes.route);
        const current = items.find((i) => i.isCurrent);
        let text = formatSessionList(items, current);
        text += '\n\n发送 /resume N 切换到第 N 个历史对话。';
        return { text };
    }
    async handleResume(ctx) {
        const scopes = await deriveScopes(ctx, this.gateway);
        if (!scopes) {
            return { text: '无法确认当前聊天范围，请稍后再试。' };
        }
        const items = await this.history.listSessions(scopes.actor, scopes.route);
        const current = items.find((i) => i.isCurrent);
        let text = formatSessionList(items, current);
        text += '\n\n发送 /resume N 切换到第 N 个历史对话。';
        return { text };
    }
    async handleResumeByIndex(ctx, index) {
        const scopes = await deriveScopes(ctx, this.gateway);
        if (!scopes) {
            return { text: '无法确认当前聊天范围，请稍后再试。' };
        }
        const result = await this.restore.restoreSession(scopes.actor, scopes.route, index);
        if (result.success && result.restoredSessionId) {
            const items = await this.history.listSessions(scopes.actor, scopes.route);
            const item = items.find((i) => i.sessionId === result.restoredSessionId);
            if (item) {
                return { text: formatResumeSuccess(item) };
            }
            return { text: '已切换，但无法读取对话信息。' };
        }
        const err = result.error ?? 'readback_failure';
        return { text: formatError(err) };
    }
}
//# sourceMappingURL=command-handlers.js.map