// Typed wrapper around `openclaw gateway call <method> --json`.

import { execFile } from 'node:child_process';
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

export class GatewayClient {
  private cliPath: string;
  private timeoutMs: number;

  constructor(options?: { cliPath?: string; timeoutMs?: number }) {
    this.cliPath = options?.cliPath ?? 'openclaw';
    this.timeoutMs = options?.timeoutMs ?? 30000;
  }

  async sessionsList(params: SessionsListParams): Promise<SessionsListResult> {
    return this._call('sessions.list', params);
  }

  async chatHistory(params: ChatHistoryParams): Promise<ChatHistoryResult> {
    return this._call('chat.history', params);
  }

  async send(params: SendParams): Promise<void> {
    await this._call('send', { sessionKey: params.sessionKey, text: params.text });
  }

  private _call(method: string, params: Record<string, unknown> | object): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        'gateway',
        'call',
        method,
        '--json',
        '--timeout',
        String(this.timeoutMs),
        '--params',
        JSON.stringify(params),
      ];

      execFile(
        this.cliPath,
        args,
        { timeout: this.timeoutMs + 5000 },
        (error, stdout, stderr) => {
          if (error) {
            if (error.killed || error.signal === 'SIGTERM') {
              reject(new GatewayError(`Gateway call '${method}' timed out`, 'timeout'));
              return;
            }
            if (error.code === 'ENOENT') {
              reject(new GatewayError(`OpenClaw CLI not found: ${this.cliPath}`, 'cli_not_found'));
              return;
            }
            const safeMsg = stderr
              ? 'Gateway RPC 调用失败（stderr 已隐藏）。'
              : `Gateway call '${method}' failed`;
            reject(
              new GatewayError(
                safeMsg,
                'rpc_failed',
                { returnCode: error.code }
              )
            );
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(stdout);
          } catch {
            reject(new GatewayError(`Gateway call '${method}' returned invalid JSON`, 'invalid_json'));
            return;
          }

          resolve(parsed);
        }
      );
    });
  }
}

export class GatewayError extends Error {
  public code: string;
  public details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.details = details;
  }
}
