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
export declare function resolveRouteScope(input: RouteScopeInput): RouteScope | null;
//# sourceMappingURL=route-scope-resolver.d.ts.map