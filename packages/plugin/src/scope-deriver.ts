// Derive ActorScope + RouteScope from PluginCommandContext by reverse-lookup
// through sessions.list. PluginCommandContext does NOT expose sessionKey or
// organization directly, but the session store contains them in origin/deliveryContext.

import {
  GatewayClient,
  resolveActorScope,
  resolveRouteScope,
} from '@openclaw-commands/core';
import type { ActorScope, RouteScope, GatewaySession } from '@openclaw-commands/core';

export interface DeriveResult {
  actor: ActorScope;
  route: RouteScope;
}

/**
 * Derive scopes from PluginCommandContext fields.
 *
 * Because PluginCommandContext lacks sessionKey and organization, we call
 * sessions.list and match by deliveryContext metadata. This is
 * channel-agnostic at the data-matching layer; sessionKey construction is
 * channel-specific.
 */
export async function deriveScopes(
  ctx: {
    channel: string;
    accountId?: string;
    from?: string;
    to?: string;
    senderId?: string;
    messageThreadId?: string | number;
  },
  gateway: GatewayClient,
  agentId: string = 'main'
): Promise<DeriveResult | null> {
  const channel = ctx.channel.trim().toLowerCase();
  const accountId = ctx.accountId?.trim() || undefined;
  const to = ctx.to?.trim() || undefined;
  const senderId = ctx.senderId?.trim() || '';

  if (!senderId) return null;
  if (!to) return null;

  // 1. Build ActorScope from what we know
  const actor = resolveActorScope({
    provider: channel,
    senderId,
    accountId,
  });

  if (!actor) return null;

  // 2. Reverse-lookup route metadata via sessions.list
  const listResult = await gateway.sessionsList({ agentId, limit: 100 });
  const sessions: GatewaySession[] = listResult.sessions ?? [];

  const match = sessions.find((s) =>
    deliveryContextMatches(s, channel, accountId, to)
  );

  if (!match) {
    // No existing session for this route — we cannot derive organization or chatType.
    // Fail closed: without a scoped session we have nothing to list or resume.
    return null;
  }

  const origin = match.origin ?? {};
  const organization = origin.organization?.trim() || undefined;
  const chatType = normalizeChatType(origin.chatType || '');

  // 3. Use the matched session's actual key (avoids rebuild mismatch when
  // origin.organization is absent).
  const sessionKey = extractSessionKey(match.key || '');
  if (!sessionKey) return null;

  const route = resolveRouteScope({
    provider: channel,
    sessionKey,
    chatType,
    accountId,
    organization,
    label: to,
    threadId: normalizeThreadId(ctx.messageThreadId),
  });

  if (!route) return null;

  return { actor, route };
}

function normalizeThreadId(threadId: string | number | undefined): string | undefined {
  if (typeof threadId === 'number') return String(threadId);
  const trimmed = threadId?.trim();
  return trimmed || undefined;
}

function deliveryContextMatches(
  session: GatewaySession,
  channel: string,
  accountId: string | undefined,
  to: string
): boolean {
  const dc = session.deliveryContext ?? {};
  const dcChannel = (dc.channel ?? '').trim().toLowerCase();
  const dcTo = (dc.to ?? '').trim();
  const dcAccountId = (dc.accountId ?? '').trim() || undefined;

  if (dcChannel !== channel) return false;
  if (dcTo !== to) return false;
  if (accountId && dcAccountId && dcAccountId !== accountId) return false;

  return true;
}

function normalizeChatType(raw: string): RouteScope['chatType'] {
  const lower = raw.toLowerCase();
  if (lower === 'direct' || lower === 'single' || lower === 'private') return 'direct';
  if (lower === 'group' || lower === 'chatroom' || lower === 'room') return 'group';
  if (lower === 'thread' || lower === 'topic') return 'thread';
  return 'unknown';
}

function extractSessionKey(agentPrefixed: string): string {
  const idx = agentPrefixed.lastIndexOf(':');
  if (idx === -1) return agentPrefixed.toLowerCase();
  return agentPrefixed.slice(idx + 1).toLowerCase();
}

