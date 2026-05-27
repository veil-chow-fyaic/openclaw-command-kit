// Derive ActorScope + RouteScope from PluginCommandContext by reverse-lookup
// through sessions.list. PluginCommandContext does NOT expose sessionKey or
// organization directly, but the session store contains them in origin/deliveryContext.
import { resolveActorScope, resolveRouteScope, } from '@openclaw-commands/core';
/**
 * Derive scopes from PluginCommandContext fields.
 *
 * Because PluginCommandContext lacks sessionKey and organization, we call
 * sessions.list and match by deliveryContext metadata. This is
 * channel-agnostic at the data-matching layer; sessionKey construction is
 * channel-specific.
 */
export async function deriveScopes(ctx, gateway, agentId = 'main') {
    const channel = ctx.channel.trim().toLowerCase();
    const accountId = ctx.accountId?.trim() || undefined;
    const to = ctx.to?.trim() || undefined;
    const senderId = ctx.senderId?.trim() || '';
    if (!senderId)
        return null;
    if (!to)
        return null;
    // 1. Build ActorScope from what we know
    const actor = resolveActorScope({
        provider: channel,
        senderId,
        accountId,
    });
    if (!actor)
        return null;
    // 2. Reverse-lookup route metadata via sessions.list
    const listResult = await gateway.sessionsList({ agentId, limit: 100 });
    const sessions = listResult.sessions ?? [];
    const match = sessions.find((s) => deliveryContextMatches(s, channel, accountId, to));
    if (!match) {
        // No existing session for this route — we cannot derive organization or chatType.
        // Fail closed: without a scoped session we have nothing to list or resume.
        return null;
    }
    const origin = match.origin ?? {};
    const organization = origin.organization?.trim() || undefined;
    const chatType = normalizeChatType(origin.chatType || '');
    // 3. Construct sessionKey in a channel-aware way
    const sessionKey = buildSessionKey(channel, accountId, organization, to);
    if (!sessionKey)
        return null;
    const route = resolveRouteScope({
        provider: channel,
        sessionKey,
        chatType,
        accountId,
        organization,
        label: to,
        threadId: typeof ctx.messageThreadId === 'number' ? String(ctx.messageThreadId) : undefined,
    });
    if (!route)
        return null;
    return { actor, route };
}
function deliveryContextMatches(session, channel, accountId, to) {
    const dc = session.deliveryContext ?? {};
    const dcChannel = (dc.channel ?? '').trim().toLowerCase();
    const dcTo = (dc.to ?? '').trim();
    const dcAccountId = (dc.accountId ?? '').trim() || undefined;
    if (dcChannel !== channel)
        return false;
    if (dcTo !== to)
        return false;
    if (accountId && dcAccountId && dcAccountId !== accountId)
        return false;
    return true;
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
function buildSessionKey(channel, accountId, organization, chatLabel) {
    const acc = accountId ?? 'default';
    // OpenClaw lower-cases the chatLabel when constructing the session key.
    const label = chatLabel.toLowerCase();
    if (channel === 'wecom') {
        const org = organization ?? 'unknown';
        return `wecom-${acc}-${org}-${label}`;
    }
    // Fallback: try to reconstruct from raw session key if available.
    // For unknown channels we cannot safely build a key without knowing the format.
    return null;
}
//# sourceMappingURL=scope-deriver.js.map