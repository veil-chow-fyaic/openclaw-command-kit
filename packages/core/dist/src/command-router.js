// Parse /sessions, /resume, /resume N; route to services.
// TODO(Phase 2/3): Wire up to SessionHistoryService and RestoreService.
import { formatCommandsList, formatSessionList, formatResumeSuccess, formatError, } from './response-formatter.js';
export class CommandRouter {
    history;
    restore;
    constructor(history, restore) {
        this.history = history;
        this.restore = restore;
    }
    async handle(rawText, actor, route, adapter) {
        const trimmed = rawText.trim();
        if (trimmed === '/commands') {
            await adapter.deliverReply(route, formatCommandsList());
            return { handled: true };
        }
        if (trimmed === '/sessions') {
            const items = await this.history.listSessions(actor, route);
            const current = items.find((i) => i.isCurrent);
            let text = formatSessionList(items, current);
            text += '\n\n发送 /resume N 切换到第 N 个历史对话。';
            await adapter.deliverReply(route, text);
            return { handled: true };
        }
        if (trimmed === '/resume') {
            const items = await this.history.listSessions(actor, route);
            const current = items.find((i) => i.isCurrent);
            let text = formatSessionList(items, current);
            text += '\n\n发送 /resume N 切换到第 N 个历史对话。';
            await adapter.deliverReply(route, text);
            return { handled: true };
        }
        const resumeMatch = trimmed.match(/^\/resume\s+(\d+)$/);
        if (resumeMatch) {
            const index = parseInt(resumeMatch[1], 10);
            const result = await this.restore.restoreSession(actor, route, index);
            if (result.success && result.restoredSessionId) {
                const items = await this.history.listSessions(actor, route);
                const item = items.find((i) => i.sessionId === result.restoredSessionId);
                if (item) {
                    await adapter.deliverReply(route, formatResumeSuccess(item));
                }
                else {
                    await adapter.deliverReply(route, '已切换，但无法读取对话信息。');
                }
            }
            else {
                const err = result.error ?? 'readback_failure';
                await adapter.deliverReply(route, formatError(err));
            }
            return { handled: true };
        }
        return { handled: false };
    }
}
//# sourceMappingURL=command-router.js.map