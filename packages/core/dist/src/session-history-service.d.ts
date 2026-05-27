import type { GatewayClient } from './gateway-client.js';
import type { ActorScope, RouteScope, ResumeListItem } from './types.js';
export declare class SessionHistoryService {
    private gateway;
    constructor(gateway: GatewayClient);
    listSessions(actor: ActorScope, route: RouteScope): Promise<ResumeListItem[]>;
    private _toItem;
}
//# sourceMappingURL=session-history-service.d.ts.map