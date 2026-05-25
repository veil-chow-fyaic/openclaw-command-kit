// Validate RouteScope; fail-closed.

import type { RouteScope } from './types.js';

export interface RouteScopeInput {
  provider: string;
  sessionKey?: string;
  chatType?: string;
  accountId?: string;
  organization?: string;
  label?: string;
  conversationId?: string;
  threadId?: string;
}

export function resolveRouteScope(input: RouteScopeInput): RouteScope | null {
  if (!input.sessionKey || input.sessionKey.trim().length === 0) {
    return null;
  }
  if (!input.chatType || input.chatType.trim().length === 0) {
    return null;
  }

  const validChatType = normalizeChatType(input.chatType);

  return {
    provider: input.provider,
    sessionKey: input.sessionKey.trim(),
    chatType: validChatType,
    accountId: input.accountId,
    organization: input.organization,
    label: input.label,
    conversationId: input.conversationId,
    threadId: input.threadId,
  };
}

function normalizeChatType(raw: string): RouteScope['chatType'] {
  const lower = raw.toLowerCase();
  if (lower === 'direct' || lower === 'single' || lower === 'private') return 'direct';
  if (lower === 'group' || lower === 'chatroom' || lower === 'room') return 'group';
  if (lower === 'thread' || lower === 'topic') return 'thread';
  return 'unknown';
}
