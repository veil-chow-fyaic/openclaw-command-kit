// List scoped sessions via Gateway RPC + local session store + local transcript scan.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import type { GatewayClient } from './gateway-client.js';
import type { ActorScope, RouteScope, ResumeListItem, SessionListOptions } from './types.js';
import { scanGenerations } from './session-generation-scanner.js';
import {
  cleanTranscriptText,
  isGoodPreviewText,
  isGoodTitleSeed,
  shortenText,
  truncateForTitle,
} from './session-text.js';

interface RawSession {
  key?: string;
  sessionKey?: string;
  kind?: string;
  chatType?: string;
  origin?: {
    provider?: string;
    surface?: string;
    accountId?: string;
    organization?: string;
    label?: string;
    chatType?: string;
    from?: string;
    to?: string;
  };
  deliveryContext?: {
    channel?: string;
    to?: string;
    accountId?: string;
    organization?: string;
  };
  updatedAt?: number;
  sessionId?: string;
  displayName?: string;
  title?: string;
  sessionFile?: string;
}

export class SessionHistoryService {
  constructor(
    private gateway: GatewayClient,
    private sessionsDir: string = process.env.OPENCLAW_SESSIONS_DIR || path.join(homedir(), '.openclaw/agents/main/sessions')
  ) {}

  async listSessions(
    actor: ActorScope,
    route: RouteScope,
    query?: string,
    options: SessionListOptions = {}
  ): Promise<ResumeListItem[]> {
    // Fail-closed: actor must be valid and consistent with route
    if (!actor.senderId) return [];
    if (actor.accountId && route.accountId && actor.accountId !== route.accountId) return [];
    if (actor.organization && route.organization && actor.organization !== route.organization) return [];

    const result = await this.gateway.sessionsList({
      agentId: 'main',
      limit: 500,
    });

    const rawSessions = mergeRawSessions(
      (result as any).sessions ?? [],
      this._readLocalSessionStore()
    );

    const activeItems = rawSessions
      .map((s) => this._toItem(s, route))
      .filter((item): item is ResumeListItem => item !== null);

    await this._enrichItemsFromLocalTranscripts(activeItems, route);

    // Enrich active session preview from chat.history
    const currentRouteItems = activeItems.filter((item) => item.isCurrent);
    if (currentRouteItems.length > 0) {
      let enriched = false;
      const tryEnrich = async (sessionKey: string) => {
        const chat = await this.gateway.chatHistory({ sessionKey, limit: 3 });
        const msgs = (chat as any).messages ?? [];
        const textMsgs: Array<{ role: string; text: string }> = [];
        for (const m of msgs) {
          if (!m || typeof m !== 'object') continue;
          const role = String(m.role || '');
          const text = cleanTranscriptText(extractMessageText(m), role);
          if ((role === 'user' || role === 'assistant') && text && isGoodPreviewText(text)) {
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
      } catch (err) {
        // Fallback: try with the active sessionId as key
        const fallbackKey = currentRouteItems[0]?.sessionId;
        if (fallbackKey && fallbackKey !== route.sessionKey) {
          try {
            await tryEnrich(fallbackKey);
          } catch (err2) {
            console.error('[session-history-service] chatHistory enrichment failed for both keys:', err, err2);
          }
        } else {
          console.error('[session-history-service] chatHistory enrichment failed:', err);
        }
      }
    }

    // Scan local transcript backups for historical generations
    const historicalItems: ResumeListItem[] = [];
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
    markOnlyNewestCurrent(merged);
    normalizeRouteLabelTitles(merged, route);

    // Indexes are assigned from the full candidate set. Filtered/default views
    // must not renumber, otherwise a stateless `/resume N` could restore a
    // different item from the one shown in `/resume all` or `/resume <query>`.
    merged.forEach((item, idx) => {
      item.displayIndex = idx + 1;
    });

    const visible = options.mode === 'all' ? merged : merged.filter(shouldShowInDefaultList);

    // Apply query filter if provided. Keep displayIndex stable so numbers shown
    // by `/sessions <query>` can still be used directly with `/resume N`.
    const filtered = query
      ? visible.filter((item) => {
          const q = query.toLowerCase();
          return (
            item.title.toLowerCase().includes(q) ||
            item.lastMessagePreview.toLowerCase().includes(q) ||
            item.lastUserMessage?.toLowerCase().includes(q) ||
            false
          );
        })
      : visible;

    if (options.mode !== 'all' && !query) {
      filtered.forEach((item, idx) => {
        item.displayIndex = idx + 1;
      });
    }

    return filtered;
  }

  private _toItem(raw: RawSession, route: RouteScope): ResumeListItem | null {
    const sessionId = raw.sessionId;
    if (!sessionId) return null;

    const rawKey = raw.key ?? raw.sessionKey ?? '';
    const sessionKey = extractSessionKey(rawKey);
    if (!sessionKey) return null;

    // Scope matching
    const origin = raw.origin ?? {};
    if (origin.provider && origin.provider.toLowerCase() !== route.provider) return null;
    if (route.accountId && origin.accountId && origin.accountId !== route.accountId) return null;
    if (route.organization && origin.organization && origin.organization !== route.organization) return null;

    // Chat type matching (accept if either side is unknown or missing)
    const rawChatType = normalizeChatType(raw.chatType || raw.kind || origin.chatType || '');
    if (rawChatType !== 'unknown' && route.chatType !== 'unknown') {
      if (rawChatType !== route.chatType) return null;
    }

    const exactRouteMatch = sessionKey.toLowerCase() === route.sessionKey.toLowerCase();
    const sameDeliveryRoute = sessionMatchesRoute(raw, route, sessionKey);
    const unscopedManual = !sameDeliveryRoute && sessionIsUnscopedManual(raw, route, sessionKey);
    if (!sameDeliveryRoute && !unscopedManual) return null;

    const updatedAt = raw.updatedAt ? new Date(raw.updatedAt) : new Date();
    const rawTitle = raw.title || raw.displayName || origin.label || titleFromSessionKey(sessionKey);
    const title = normalizeWeakTitle(rawTitle);

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

  private async _enrichItemsFromLocalTranscripts(items: ResumeListItem[], route: RouteScope): Promise<void> {
    await Promise.all(
      items.map(async (item) => {
        const summary = await this._summarizeSessionFile(item);
        if (!summary) return;

        if (summary.title && shouldReplaceTitle(item.title, route)) {
          item.title = summary.title;
        }
        if (!item.lastMessagePreview && summary.lastMessagePreview) {
          item.lastMessagePreview = summary.lastMessagePreview;
        }
        if (!item.lastUserMessage && summary.lastUserMessage) {
          item.lastUserMessage = summary.lastUserMessage;
        }
        if (!item.lastAssistantMessage && summary.lastAssistantMessage) {
          item.lastAssistantMessage = summary.lastAssistantMessage;
        }
      })
    );
  }

  private async _summarizeSessionFile(item: ResumeListItem): Promise<SessionFileSummary | null> {
    const fileName = item.sessionFile || `${item.sessionId}.jsonl`;
    if (!fileName || fileName.includes('..')) return null;
    const filePath = path.join(this.sessionsDir, fileName);
    if (!fs.existsSync(filePath)) return null;

    const messages: Array<{ role: string; text: string }> = [];
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    let lineCount = 0;

    try {
      for await (const line of rl) {
        lineCount++;
        if (lineCount > 800) break;

        let event: unknown;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (!event || typeof event !== 'object') continue;
        const msg = (event as { message?: unknown }).message;
        if (!msg || typeof msg !== 'object') continue;

        const role = String((msg as { role?: unknown }).role || '');
        if (role !== 'user' && role !== 'assistant') continue;

        const text = cleanTranscriptText(extractMessageText(msg), role);
        if (!text) continue;
        messages.push({ role, text: shortenText(text, 120) });
      }
    } finally {
      rl.close();
      stream.destroy();
    }

    if (messages.length === 0) return null;

    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    const titleSeed =
      userMessages.find((m) => isGoodTitleSeed(m.text))?.text ||
      assistantMessages.find((m) => isGoodTitleSeed(m.text))?.text;
    const previewUsers = userMessages.filter((m) => isGoodPreviewText(m.text));
    const previewAssistants = assistantMessages.filter((m) => isGoodPreviewText(m.text));
    const lastUser = previewUsers[previewUsers.length - 1]?.text || '';
    const lastAssistant = previewAssistants[previewAssistants.length - 1]?.text || '';

    return {
      title: titleSeed ? truncateForTitle(titleSeed, 42) : '',
      lastMessagePreview: shortenText(lastAssistant || lastUser, 80),
      lastUserMessage: lastUser || undefined,
      lastAssistantMessage: lastAssistant || undefined,
    };
  }

  private _readLocalSessionStore(): RawSession[] {
    const storePath = path.join(this.sessionsDir, 'sessions.json');
    if (!fs.existsSync(storePath)) return [];

    let store: unknown;
    try {
      store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    } catch {
      return [];
    }

    if (!store || typeof store !== 'object' || Array.isArray(store)) return [];

    const sessions: RawSession[] = [];
    for (const [key, value] of Object.entries(store as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      sessions.push({
        ...(value as RawSession),
        key,
      });
    }

    return sessions;
  }
}

interface SessionFileSummary {
  title: string;
  lastMessagePreview: string;
  lastUserMessage?: string;
  lastAssistantMessage?: string;
}

function mergeRawSessions(primary: RawSession[], secondary: RawSession[]): RawSession[] {
  const bySessionId = new Map<string, RawSession>();

  for (const raw of primary) {
    const id = raw.sessionId;
    if (!id) continue;
    bySessionId.set(id, raw);
  }

  for (const raw of secondary) {
    const id = raw.sessionId;
    if (!id) continue;
    // Prefer the local sessions.json entry. Gateway list output may normalize or
    // omit the route key for manually created sessions, while the store has the
    // canonical key/file needed for restore.
    bySessionId.set(id, raw);
  }

  return Array.from(bySessionId.values());
}

function markOnlyNewestCurrent(items: ResumeListItem[]): void {
  let currentSeen = false;
  for (const item of items) {
    if (!item.isCurrent) continue;
    if (currentSeen) {
      item.isCurrent = false;
      continue;
    }
    currentSeen = true;
  }
}

function normalizeRouteLabelTitles(items: ResumeListItem[], route: RouteScope): void {
  const routeLabel = normalizeForTitle(route.label || '');
  if (!routeLabel) return;

  for (const item of items) {
    if (item.isCurrent) continue;
    if (normalizeForTitle(item.title) !== routeLabel) continue;
    item.title = item.lastMessagePreview ? '历史对话' : '同一路由历史对话';
  }
}

function shouldShowInDefaultList(item: ResumeListItem): boolean {
  if (item.isCurrent) return true;

  const title = normalizeForTitle(item.title);
  if (/^gateway-fallback-/i.test(item.title)) return false;
  if (/^meeting-follow-up-/i.test(item.sessionId)) return false;
  if (['网关历史会话', 'openclaw连通性检查', 'acp工具检查', 'testing'].includes(title)) {
    return false;
  }

  return true;
}

function sessionMatchesRoute(raw: RawSession, route: RouteScope, sessionKey: string): boolean {
  if (sessionKey.toLowerCase() === route.sessionKey.toLowerCase()) return true;

  const routeTarget = normalizeRouteTarget(route.label, route.provider);
  if (!routeTarget) return false;

  const origin = raw.origin ?? {};
  const dc = raw.deliveryContext ?? {};
  const candidates = [
    dc.to,
    origin.to,
    origin.label,
  ];

  return candidates.some((value) => normalizeRouteTarget(value, route.provider) === routeTarget);
}

function sessionIsUnscopedManual(raw: RawSession, route: RouteScope, sessionKey: string): boolean {
  if (route.chatType !== 'direct') return false;

  const origin = raw.origin ?? {};
  const dc = raw.deliveryContext ?? {};
  if (origin.provider || origin.surface || dc.channel) return false;
  if (origin.to || dc.to || origin.label) return false;
  if (origin.chatType || raw.chatType || raw.kind) return false;

  const key = sessionKey.toLowerCase();
  if (!key || key === 'main' || key.startsWith('dashboard:')) return false;

  return true;
}

function titleFromSessionKey(sessionKey: string): string {
  const key = sessionKey.trim();
  if (!key) return '未命名对话';
  const parts = key.split(':');
  return parts[parts.length - 1] || key;
}

function shouldReplaceTitle(title: string, route: RouteScope): boolean {
  const normalizedTitle = normalizeForTitle(title);
  const normalizedRouteLabel = normalizeForTitle(route.label || '');
  if (!normalizedTitle) return true;
  if (normalizedTitle === '未命名对话') return true;
  if (['网关历史会话', 'openclaw连通性检查', 'acp工具检查', '会议跟进', '历史对话'].includes(normalizedTitle)) return true;
  if (normalizedRouteLabel && normalizedTitle === normalizedRouteLabel) return true;
  if (/gateway-fallback-[0-9a-f-]{12,}/i.test(title)) return true;
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(title)) return true;
  if (/^(acp-|codex-openclaw|meeting-follow-up)(-|$)/i.test(title)) return true;
  if (title.trim().startsWith('你当前在 **WeCom')) return true;
  return false;
}

function normalizeWeakTitle(title: string): string {
  const value = title.trim();
  if (value.startsWith('你当前在 **WeCom')) return '历史对话';
  if (/^gateway-fallback-/i.test(value)) return '网关历史会话';
  if (/^codex-openclaw/i.test(value)) return 'OpenClaw 连通性检查';
  if (/^acp-/i.test(value)) return 'ACP 工具检查';
  if (/^meeting-follow-up/i.test(value)) return '会议跟进';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return '历史对话';
  }
  return value || '未命名对话';
}

function normalizeForTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeRouteTarget(value: string | undefined, provider: string): string {
  let normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return '';

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

function extractSessionKey(rawKey: string): string | null {
  if (rawKey.startsWith('agent:')) {
    const parts = rawKey.split(':');
    if (parts.length >= 3) {
      return parts.slice(2).join(':').toLowerCase();
    }
  }
  return (rawKey || '').toLowerCase() || null;
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
