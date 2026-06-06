// List scoped sessions via Gateway RPC + local transcript scan for historical generations.
import { scanGenerations } from './session-generation-scanner.js';
export class SessionHistoryService {
    gateway;
    constructor(gateway) {
        this.gateway = gateway;
    }
    async listSessions(actor, route, query) {
        // Fail-closed: actor must be valid and consistent with route
        if (!actor.senderId)
            return [];
        if (actor.accountId && route.accountId && actor.accountId !== route.accountId)
            return [];
        if (actor.organization && route.organization && actor.organization !== route.organization)
            return [];
        const result = await this.gateway.sessionsList({
            agentId: 'main',
            limit: 500,
        });
        const rawSessions = result.sessions ?? [];
        const activeItems = rawSessions
            .map((s) => this._toItem(s, route))
            .filter((item) => item !== null);
        // Mark active items as current
        activeItems.forEach((item) => {
            item.isCurrent = true;
        });
        // Enrich active session preview from chat.history
        if (activeItems.length > 0) {
            let enriched = false;
            const tryEnrich = async (sessionKey) => {
                const chat = await this.gateway.chatHistory({ sessionKey, limit: 3 });
                const msgs = chat.messages ?? [];
                const textMsgs = [];
                for (const m of msgs) {
                    if (!m || typeof m !== 'object')
                        continue;
                    const role = String(m.role || '');
                    let text = extractMessageText(m).trim();
                    if (role === 'user') {
                        text = cleanUserMessage(text);
                    }
                    if ((role === 'user' || role === 'assistant') && text) {
                        textMsgs.push({ role, text: shortenText(text, 72) });
                    }
                }
                const lastUser = textMsgs.slice().reverse().find((m) => m.role === 'user')?.text || '';
                const lastAssistant = textMsgs.slice().reverse().find((m) => m.role === 'assistant')?.text || '';
                const preview = lastAssistant || lastUser || '';
                for (const item of activeItems) {
                    item.lastMessagePreview = preview;
                    item.lastUserMessage = lastUser || undefined;
                    item.lastAssistantMessage = lastAssistant || undefined;
                }
                enriched = true;
            };
            try {
                await tryEnrich(route.sessionKey);
            }
            catch (err) {
                // Fallback: try with the active sessionId as key
                const fallbackKey = activeItems[0]?.sessionId;
                if (fallbackKey && fallbackKey !== route.sessionKey) {
                    try {
                        await tryEnrich(fallbackKey);
                    }
                    catch (err2) {
                        console.error('[session-history-service] chatHistory enrichment failed for both keys:', err, err2);
                    }
                }
                else {
                    console.error('[session-history-service] chatHistory enrichment failed:', err);
                }
            }
        }
        // Scan local transcript backups for historical generations
        const historicalItems = [];
        if (route.label && activeItems.length > 0) {
            const seenSessionIds = new Set(activeItems.map((i) => i.sessionId));
            const activeTitle = activeItems[0]?.title || route.label;
            try {
                const generations = await scanGenerations({
                    agentId: 'main',
                    route,
                    currentSessionId: activeItems[0].sessionId,
                    currentSessionKey: route.sessionKey,
                    activeTitle,
                });
                for (const gen of generations) {
                    if (seenSessionIds.has(gen.sessionId))
                        continue;
                    seenSessionIds.add(gen.sessionId);
                    historicalItems.push({
                        displayIndex: 0,
                        sessionId: gen.sessionId,
                        title: gen.title,
                        updatedAt: gen.updatedAt,
                        lastMessagePreview: gen.lastMessagePreview,
                        lastUserMessage: gen.lastUserMessage,
                        lastAssistantMessage: gen.lastAssistantMessage,
                        isCurrent: false,
                        isRestorable: gen.isRestorable,
                        sessionFile: gen.sessionFile,
                    });
                }
            }
            catch {
                // Fail-open on scanner errors: still return active sessions
            }
        }
        // Merge active + historical, sort by updatedAt desc
        const merged = [...activeItems, ...historicalItems];
        merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        // Apply query filter if provided
        const filtered = query
            ? merged.filter((item) => {
                const q = query.toLowerCase();
                return (item.title.toLowerCase().includes(q) ||
                    item.lastMessagePreview.toLowerCase().includes(q) ||
                    item.lastUserMessage?.toLowerCase().includes(q) ||
                    false);
            })
            : merged;
        // Assign display indexes (1-based)
        filtered.forEach((item, idx) => {
            item.displayIndex = idx + 1;
        });
        return filtered;
    }
    _toItem(raw, route) {
        const sessionId = raw.sessionId;
        if (!sessionId)
            return null;
        const rawKey = raw.key ?? '';
        const sessionKey = extractSessionKey(rawKey);
        if (!sessionKey)
            return null;
        // Scope matching
        const origin = raw.origin ?? {};
        if (origin.provider && origin.provider.toLowerCase() !== route.provider)
            return null;
        if (route.accountId && origin.accountId && origin.accountId !== route.accountId)
            return null;
        if (route.organization && origin.organization && origin.organization !== route.organization)
            return null;
        // Chat type matching (accept if either side is unknown or missing)
        const rawChatType = normalizeChatType(raw.chatType || raw.kind || origin.chatType || '');
        if (rawChatType !== 'unknown' && route.chatType !== 'unknown') {
            if (rawChatType !== route.chatType)
                return null;
        }
        // Session key matching: must match route.sessionKey (case-insensitive)
        if (sessionKey.toLowerCase() !== route.sessionKey.toLowerCase())
            return null;
        const updatedAt = raw.updatedAt ? new Date(raw.updatedAt) : new Date();
        const title = raw.title || raw.displayName || origin.label || '未命名对话';
        return {
            displayIndex: 0, // assigned later
            sessionId,
            title,
            updatedAt,
            lastMessagePreview: '', // TODO: enrich from chat.history in Phase 2+
            isCurrent: false, // TODO: detect current session
            isRestorable: true,
        };
    }
}
function extractSessionKey(rawKey) {
    if (rawKey.startsWith('agent:')) {
        const parts = rawKey.split(':');
        if (parts.length >= 3) {
            return parts.slice(2).join(':').toLowerCase();
        }
    }
    return (rawKey || '').toLowerCase() || null;
}
function normalizeChatType(raw) {
    const lower = raw.toLowerCase();
    if (lower === 'direct' || lower === 'single' || lower === 'private')
        return 'direct';
    if (lower === 'group' || lower === 'chatroom' || lower === 'room')
        return 'group';
    if (lower === 'thread' || lower === 'topic')
        return 'thread';
    return 'unknown';
}
function extractMessageText(message) {
    if (!message || typeof message !== 'object')
        return '';
    const m = message;
    const content = m.content;
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content)) {
        const parts = [];
        for (const item of content) {
            if (item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string') {
                parts.push(item.text);
            }
        }
        return parts.join('\n');
    }
    return '';
}
function shortenText(text, limit) {
    const cleaned = text.replace(/\r?\n/g, ' ').trim();
    if (cleaned.length <= limit)
        return cleaned;
    return cleaned.slice(0, limit) + '…';
}
function cleanUserMessage(text) {
    let value = text.trim();
    // Strip the OpenClaw metadata envelope that precedes the real user message.
    if (value.includes('```')) {
        const parts = value.split('```');
        if (value.includes('Sender (untrusted metadata):') && parts.length >= 4) {
            value = parts.slice(4).join('```').trim();
        }
        else if ((value.includes('Conversation info') || value.includes('untrusted metadata')) &&
            parts.length >= 3) {
            value = parts.slice(2).join('```').trim();
        }
    }
    if (value.startsWith('[media attached:')) {
        return '[图片]';
    }
    if (value.startsWith('[Queued messages while agent was busy]')) {
        return '[排队消息]';
    }
    return value;
}
//# sourceMappingURL=session-history-service.js.map