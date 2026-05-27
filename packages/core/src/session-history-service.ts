// List scoped sessions via Gateway RPC + local transcript scan for historical generations.

import type { GatewayClient } from './gateway-client.js';
import type { ActorScope, RouteScope, ResumeListItem } from './types.js';
import { scanGenerations } from './session-generation-scanner.js';

interface RawSession {
  key?: string;
  kind?: string;
  chatType?: string;
  origin?: {
    provider?: string;
    accountId?: string;
    organization?: string;
    label?: string;
    chatType?: string;
  };
  updatedAt?: number;
  sessionId?: string;
  displayName?: string;
  title?: string;
}

export class SessionHistoryService {
  constructor(private gateway: GatewayClient) {}

  async listSessions(
    actor: ActorScope,
    route: RouteScope
  ): Promise<ResumeListItem[]> {
    // Fail-closed: actor must be valid and consistent with route
    if (!actor.senderId) return [];
    if (actor.accountId && route.accountId && actor.accountId !== route.accountId) return [];
    if (actor.organization && route.organization && actor.organization !== route.organization) return [];

    const result = await this.gateway.sessionsList({
      agentId: 'main',
      limit: 500,
    });

    const rawSessions: RawSession[] = (result as any).sessions ?? [];

    const activeItems = rawSessions
      .map((s) => this._toItem(s, route))
      .filter((item): item is ResumeListItem => item !== null);

    // Mark active items as current
    activeItems.forEach((item) => {
      item.isCurrent = true;
    });

    // Enrich active session preview from chat.history
    if (activeItems.length > 0) {
      try {
        const chat = await this.gateway.chatHistory({ sessionKey: route.sessionKey, limit: 3 });
        const msgs = (chat as any).messages ?? [];
        const textMsgs: Array<{ role: string; text: string }> = [];
        for (const m of msgs) {
          if (!m || typeof m !== 'object') continue;
          const role = String(m.role || '');
          const text = extractMessageText(m).trim();
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
      } catch {
        // Fail-open: active sessions display without preview
      }
    }

    // Scan local transcript backups for historical generations
    const historicalItems: ResumeListItem[] = [];
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
          if (seenSessionIds.has(gen.sessionId)) continue;
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
      } catch {
        // Fail-open on scanner errors: still return active sessions
      }
    }

    // Merge active + historical, sort by updatedAt desc
    const merged = [...activeItems, ...historicalItems];
    merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Assign display indexes (1-based)
    merged.forEach((item, idx) => {
      item.displayIndex = idx + 1;
    });

    return merged;
  }

  private _toItem(raw: RawSession, route: RouteScope): ResumeListItem | null {
    const sessionId = raw.sessionId;
    if (!sessionId) return null;

    const rawKey = raw.key ?? '';
    const sessionKey = extractSessionKey(rawKey);
    if (!sessionKey) return null;

    // Scope matching
    const origin = raw.origin ?? {};
    if (origin.provider && origin.provider !== route.provider) return null;
    if (route.accountId && origin.accountId && origin.accountId !== route.accountId) return null;
    if (route.organization && origin.organization && origin.organization !== route.organization) return null;

    // Chat type matching (accept if either side is unknown or missing)
    const rawChatType = normalizeChatType(raw.chatType || raw.kind || origin.chatType || '');
    if (rawChatType !== 'unknown' && route.chatType !== 'unknown') {
      if (rawChatType !== route.chatType) return null;
    }

    // Session key matching: must match route.sessionKey exactly
    if (sessionKey !== route.sessionKey) return null;

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

function extractSessionKey(rawKey: string): string | null {
  if (rawKey.startsWith('agent:')) {
    const parts = rawKey.split(':');
    if (parts.length >= 3) {
      return parts.slice(2).join(':');
    }
  }
  return rawKey || null;
}

function normalizeChatType(raw: string): RouteScope['chatType'] {
  const lower = raw.toLowerCase();
  if (lower === 'direct' || lower === 'single' || lower === 'private') return 'direct';
  if (lower === 'group' || lower === 'chatroom' || lower === 'room') return 'group';
  if (lower === 'thread' || lower === 'topic') return 'thread';
  return 'unknown';
}

function extractMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const m = message as Record<string, unknown>;
  const content = m.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content) {
      if (item && typeof item === 'object' && (item as any).type === 'text' && typeof (item as any).text === 'string') {
        parts.push((item as any).text);
      }
    }
    return parts.join('\n');
  }
  return '';
}

function shortenText(text: string, limit: number): string {
  const cleaned = text.replace(/\r?\n/g, ' ').trim();
  if (cleaned.length <= limit) return cleaned;
  return cleaned.slice(0, limit) + '…';
}
