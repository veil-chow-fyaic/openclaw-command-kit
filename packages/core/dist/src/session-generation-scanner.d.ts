import type { RouteScope } from './types.js';
export interface GenerationInfo {
    sessionId: string;
    sessionFile: string;
    title: string;
    updatedAt: Date;
    lastMessagePreview: string;
    lastUserMessage?: string;
    lastAssistantMessage?: string;
    isCurrent: boolean;
    isRestorable: boolean;
}
export interface ScanOptions {
    agentId: string;
    route: RouteScope;
    currentSessionId: string;
    currentSessionKey: string;
    maxScanLinesPerFile?: number;
    activeTitle?: string;
}
export declare function scanGenerations(options: ScanOptions): Promise<GenerationInfo[]>;
//# sourceMappingURL=session-generation-scanner.d.ts.map