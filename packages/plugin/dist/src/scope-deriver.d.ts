import { GatewayClient } from '@fyaic/core';
import type { ActorScope, RouteScope } from '@fyaic/core';
export interface DeriveSuccess {
    actor: ActorScope;
    route: RouteScope;
}
export type DeriveResult = DeriveSuccess | {
    reason: 'actor' | 'route';
};
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
}, gateway: GatewayClient, agentId?: string): Promise<DeriveResult>;
//# sourceMappingURL=scope-deriver.d.ts.map