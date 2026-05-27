import type { GatewaySession, GatewayChatMessage } from './types.js';
export interface SessionsListParams {
    agentId?: string;
    limit?: number;
    search?: string;
}
export interface ChatHistoryParams {
    sessionKey: string;
    limit?: number;
}
export interface SendParams {
    sessionKey: string;
    text: string;
}
export interface SessionsListResult {
    sessions?: GatewaySession[];
    count?: number;
}
export interface ChatHistoryResult {
    sessionId?: string;
    sessionKey?: string;
    messages?: GatewayChatMessage[];
}
export declare class GatewayClient {
    private cliPath;
    private timeoutMs;
    constructor(options?: {
        cliPath?: string;
        timeoutMs?: number;
    });
    sessionsList(params: SessionsListParams): Promise<SessionsListResult>;
    chatHistory(params: ChatHistoryParams): Promise<ChatHistoryResult>;
    send(params: SendParams): Promise<void>;
    private _call;
}
export declare class GatewayError extends Error {
    code: string;
    details?: Record<string, unknown>;
    constructor(message: string, code: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=gateway-client.d.ts.map