import type { ActorScope } from './types.js';
export interface ActorScopeInput {
    provider: string;
    senderId?: string;
    senderDisplayName?: string;
    accountId?: string;
    organization?: string;
}
export declare function resolveActorScope(input: ActorScopeInput): ActorScope | null;
//# sourceMappingURL=actor-scope-resolver.d.ts.map