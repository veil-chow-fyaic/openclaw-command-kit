import type { GatewayClient } from './gateway-client.js';
import type { SessionHistoryService } from './session-history-service.js';
import type { ActorScope, RouteScope, RestoreResult } from './types.js';
export declare class RestoreService {
    private gateway;
    private history;
    private sessionsDir;
    constructor(gateway: GatewayClient, history: SessionHistoryService, sessionsDir?: string);
    restoreSession(actor: ActorScope, route: RouteScope, displayIndex: number): Promise<RestoreResult>;
    private _validateBelongsToRoute;
    private _resolveRouteKeys;
    private _atomicWriteJsonWithBackup;
    private _cleanupOldBackups;
    private _readBackConfirmed;
}
//# sourceMappingURL=restore-service.d.ts.map