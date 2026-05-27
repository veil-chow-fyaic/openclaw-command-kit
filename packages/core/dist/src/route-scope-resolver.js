// Validate RouteScope; fail-closed.
export function resolveRouteScope(input) {
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
//# sourceMappingURL=route-scope-resolver.js.map