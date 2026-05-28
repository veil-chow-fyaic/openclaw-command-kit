import { GatewayClient, SessionHistoryService, RestoreService } from '@openclaw-commands/core';
import type { PluginCommandContext, PluginCommandResult } from 'openclaw/plugin-sdk/plugin-entry';
export declare class SessionCommandHandlers {
    private gateway;
    private history;
    private restore;
    private router;
    constructor(gateway?: GatewayClient, history?: SessionHistoryService, restore?: RestoreService);
    handleSessions(ctx: PluginCommandContext): Promise<PluginCommandResult>;
    handleResume(ctx: PluginCommandContext): Promise<PluginCommandResult>;
    handleResumeByIndex(ctx: PluginCommandContext, index: number): Promise<PluginCommandResult>;
}
//# sourceMappingURL=command-handlers.d.ts.map