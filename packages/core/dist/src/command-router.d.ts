import type { ActorScope, RouteScope, CommandResult, SessionCommandAdapter } from './types.js';
import { SessionHistoryService } from './session-history-service.js';
import { RestoreService } from './restore-service.js';
export declare class CommandRouter {
    private history;
    private restore;
    constructor(history: SessionHistoryService, restore: RestoreService);
    handle(rawText: string, actor: ActorScope, route: RouteScope, adapter: SessionCommandAdapter): Promise<CommandResult>;
}
//# sourceMappingURL=command-router.d.ts.map