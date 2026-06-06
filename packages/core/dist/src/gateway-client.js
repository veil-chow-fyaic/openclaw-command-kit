// Typed wrapper around `openclaw gateway call <method> --json`.
import { execFile } from 'node:child_process';
export class GatewayClient {
    cliPath;
    timeoutMs;
    constructor(options) {
        this.cliPath = options?.cliPath ?? 'openclaw';
        this.timeoutMs = options?.timeoutMs ?? 30000;
    }
    async sessionsList(params) {
        return this._call('sessions.list', params);
    }
    async chatHistory(params) {
        return this._call('chat.history', params);
    }
    async send(params) {
        await this._call('send', { sessionKey: params.sessionKey, text: params.text });
    }
    _call(method, params) {
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
            execFile(this.cliPath, args, { timeout: this.timeoutMs + 5000 }, (error, stdout, stderr) => {
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
                    reject(new GatewayError(safeMsg, 'rpc_failed', { returnCode: error.code }));
                    return;
                }
                let parsed;
                try {
                    parsed = JSON.parse(stdout);
                }
                catch {
                    reject(new GatewayError(`Gateway call '${method}' returned invalid JSON`, 'invalid_json'));
                    return;
                }
                resolve(parsed);
            });
        });
    }
}
export class GatewayError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'GatewayError';
        this.code = code;
        this.details = details;
    }
}
//# sourceMappingURL=gateway-client.js.map