// Parse /sessions, /resume, /resume N; route to services.
// TODO(Phase 2/3): Wire up to SessionHistoryService and RestoreService.
import { formatSessionList, formatResumeSuccess, formatResumeHint, formatResumeHelp, formatResumeUsage, formatSessionsRestoreBoundary, formatError, } from './response-formatter.js';
export class CommandRouter {
    history;
    restore;
    constructor(history, restore) {
        this.history = history;
        this.restore = restore;
    }
    async handle(rawText, actor, route, adapter) {
        const trimmed = rawText.trim();
        const commandMatch = trimmed.match(/^\/(sessions|resume)(?:\s+(.+))?$/);
        if (!commandMatch) {
            return { handled: false };
        }
        const command = commandMatch[1];
        const args = (commandMatch[2] ?? '').trim();
        if (args.toLowerCase() === 'help') {
            await adapter.deliverReply(route, formatResumeHelp());
            return { handled: true };
        }
        const numericArg = args.match(/^\d+$/);
        if (command === 'sessions' && numericArg) {
            const index = parseInt(args, 10);
            await adapter.deliverReply(route, index > 0 ? formatSessionsRestoreBoundary(index) : formatResumeUsage());
            return { handled: true };
        }
        if (command === 'resume' && numericArg) {
            const index = parseInt(args, 10);
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
        if ((command === 'resume' && /^\d/.test(args)) || /^\d+\s+/.test(args)) {
            await adapter.deliverReply(route, formatResumeUsage());
            return { handled: true };
        }
        const mode = args.toLowerCase() === 'all' ? 'all' : 'default';
        const query = args && mode !== 'all' ? args : undefined;
        const items = await this.history.listSessions(actor, route, query, { mode });
        const current = items.find((i) => i.isCurrent);
        let text = formatSessionList(items, current);
        if (items.length > 0) {
            text += `\n\n${formatResumeHint()}`;
        }
        await adapter.deliverReply(route, text);
        return { handled: true };
    }
}
//# sourceMappingURL=command-router.js.map