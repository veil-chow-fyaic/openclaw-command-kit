import { GatewayClient, SessionHistoryService, RestoreService } from '@fyaic/core';
import type { PluginCommandContext, PluginCommandResult } from 'openclaw/plugin-sdk/plugin-entry';
export declare class SessionCommandHandlers {
    private gateway;
    private history;
    private restore;
    constructor(gateway?: GatewayClient, history?: SessionHistoryService, restore?: RestoreService);
    handleSessions(ctx: PluginCommandContext, query?: string, options?: {
        mode?: 'default' | 'all';
    }): Promise<PluginCommandResult>;
    handleResume(ctx: PluginCommandContext): Promise<PluginCommandResult>;
    handleResumeList(ctx: PluginCommandContext, query?: string, options?: {
        mode?: 'default' | 'all';
    }): Promise<PluginCommandResult>;
    handleResumeHelp(): PluginCommandResult;
    handleResumeDebug(ctx: PluginCommandContext): Promise<PluginCommandResult>;
    handleSessionsNumeric(index: number): PluginCommandResult;
    handleResumeUsage(): PluginCommandResult;
    handleResumeByIndex(ctx: PluginCommandContext, index: number): Promise<PluginCommandResult>;
    handleWhereami(ctx: PluginCommandContext): Promise<PluginCommandResult>;
}
//# sourceMappingURL=command-handlers.d.ts.map