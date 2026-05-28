import { GatewayClient } from '@openclaw-commands/core';
import type { ActorScope, RouteScope } from '@openclaw-commands/core';
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
export declare function deriveScopes(ctx: {
    channel: string;
    accountId?: string;
    from?: string;
    to?: string;
    senderId?: string;
    messageThreadId?: string | number;
}, gateway: GatewayClient, agentId?: string): Promise<DeriveResult | null>;
//# sourceMappingURL=scope-deriver.d.ts.map