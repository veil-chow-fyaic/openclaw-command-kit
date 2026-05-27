// Validate ActorScope; fail-closed.
export function resolveActorScope(input) {
    if (!input.senderId || input.senderId.trim().length === 0) {
        return null;
    }
    return {
        provider: input.provider,
        senderId: input.senderId.trim(),
        senderDisplayName: input.senderDisplayName,
        accountId: input.accountId,
        organization: input.organization,
    };
}
//# sourceMappingURL=actor-scope-resolver.js.map