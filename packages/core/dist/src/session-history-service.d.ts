import type { GatewayClient } from './gateway-client.js';
import type { ActorScope, RouteScope, ResumeListItem } from './types.js';
export declare class SessionHistoryService {
    private gateway;
    private sessionsDir;
    constructor(gateway: GatewayClient, sessionsDir?: string);
    listSessions(actor: ActorScope, route: RouteScope, query?: string): Promise<ResumeListItem[]>;
    private _toItem;
    private _readLocalSessionStore;
}
//# sourceMappingURL=session-history-service.d.ts.map