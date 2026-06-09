import type { GatewayClient } from './gateway-client.js';
import type { ActorScope, RouteScope, ResumeListItem, SessionListOptions } from './types.js';
export declare class SessionHistoryService {
    private gateway;
    private sessionsDir;
    constructor(gateway: GatewayClient, sessionsDir?: string);
    listSessions(actor: ActorScope, route: RouteScope, query?: string, options?: SessionListOptions): Promise<ResumeListItem[]>;
    private _toItem;
    private _enrichItemsFromLocalTranscripts;
    private _summarizeSessionFile;
    private _readLocalSessionStore;
    private _hasLocalRouteEvidence;
}
//# sourceMappingURL=session-history-service.d.ts.map