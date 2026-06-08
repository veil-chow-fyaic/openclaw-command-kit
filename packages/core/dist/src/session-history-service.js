// List scoped sessions via Gateway RPC + local session store + local transcript scan.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'node:os';
import { scanGenerations } from './session-generation-scanner.js';
export class SessionHistoryService {
    gateway;
    sessionsDir;
    constructor(gateway, sessionsDir = process.env.OPENCLAW_SESSIONS_DIR || path.join(homedir(), '.openclaw/agents/main/sessions')) {
        this.gateway = gateway;
        this.sessionsDir = sessionsDir;
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
        const rawSessions = mergeRawSessions(result.sessions ?? [], this._readLocalSessionStore());
        const activeItems = rawSessions
            .map((s) => this._toItem(s, route))
            .filter((item) => item !== null);
        // Enrich active session preview from chat.history
        const currentRouteItems = activeItems.filter((item) => item.isCurrent);
        if (currentRouteItems.length > 0) {
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
                for (const item of currentRouteItems) {
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
                const fallbackKey = currentRouteItems[0]?.sessionId;
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
            const activeRouteItem = activeItems.find((item) => item.isCurrent) ?? activeItems[0];
            const activeTitle = activeRouteItem?.title || route.label;
            try {
                const generations = await scanGenerations({
                    agentId: 'main',
                    route,
                    currentSessionId: activeRouteItem.sessionId,
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
        const rawKey = raw.key ?? raw.sessionKey ?? '';
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
        const exactRouteMatch = sessionKey.toLowerCase() === route.sessionKey.toLowerCase();
        const sameDeliveryRoute = sessionMatchesRoute(raw, route, sessionKey);
        const unscopedManual = !sameDeliveryRoute && sessionIsUnscopedManual(raw, route, sessionKey);
        if (!sameDeliveryRoute && !unscopedManual)
            return null;
        const updatedAt = raw.updatedAt ? new Date(raw.updatedAt) : new Date();
        const title = raw.title || raw.displayName || origin.label || titleFromSessionKey(sessionKey);
        return {
            displayIndex: 0, // assigned later
            sessionId,
            title,
            updatedAt,
            lastMessagePreview: '', // TODO: enrich from chat.history in Phase 2+
            isCurrent: exactRouteMatch,
            isRestorable: true,
            sessionFile: raw.sessionFile ? path.basename(raw.sessionFile) : undefined,
        };
    }
    _readLocalSessionStore() {
        const storePath = path.join(this.sessionsDir, 'sessions.json');
        if (!fs.existsSync(storePath))
            return [];
        let store;
        try {
            store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        }
        catch {
            return [];
        }
        if (!store || typeof store !== 'object' || Array.isArray(store))
            return [];
        const sessions = [];
        for (const [key, value] of Object.entries(store)) {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                continue;
            sessions.push({
                ...value,
                key,
            });
        }
        return sessions;
    }
}
function mergeRawSessions(primary, secondary) {
    const merged = [];
    const seen = new Set();
    for (const raw of [...primary, ...secondary]) {
        const id = raw.sessionId;
        if (!id)
            continue;
        if (seen.has(id))
            continue;
        seen.add(id);
        merged.push(raw);
    }
    return merged;
}
function sessionMatchesRoute(raw, route, sessionKey) {
    if (sessionKey.toLowerCase() === route.sessionKey.toLowerCase())
        return true;
    const routeTarget = normalizeRouteTarget(route.label, route.provider);
    if (!routeTarget)
        return false;
    const origin = raw.origin ?? {};
    const dc = raw.deliveryContext ?? {};
    const candidates = [
        dc.to,
        origin.to,
        origin.label,
    ];
    return candidates.some((value) => normalizeRouteTarget(value, route.provider) === routeTarget);
}
function sessionIsUnscopedManual(raw, route, sessionKey) {
    if (route.chatType !== 'direct')
        return false;
    const origin = raw.origin ?? {};
    const dc = raw.deliveryContext ?? {};
    if (origin.provider || origin.surface || dc.channel)
        return false;
    if (origin.to || dc.to || origin.label)
        return false;
    if (origin.chatType || raw.chatType || raw.kind)
        return false;
    const key = sessionKey.toLowerCase();
    if (!key || key === 'main' || key.startsWith('dashboard:'))
        return false;
    return true;
}
function titleFromSessionKey(sessionKey) {
    const key = sessionKey.trim();
    if (!key)
        return '未命名对话';
    const parts = key.split(':');
    return parts[parts.length - 1] || key;
}
function normalizeRouteTarget(value, provider) {
    let normalized = (value ?? '').trim().toLowerCase();
    if (!normalized)
        return '';
    const prefixes = [
        `${provider.toLowerCase()}:`,
        'user:',
        'chat:',
        'channel:',
    ];
    for (const prefix of prefixes) {
        if (normalized.startsWith(prefix)) {
            normalized = normalized.slice(prefix.length);
        }
    }
    return normalized.replace(/\s+/g, '');
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