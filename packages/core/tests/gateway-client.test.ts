import { describe, it, expect, vi } from 'vitest';
import { GatewayClient, GatewayError } from '../src/gateway-client.js';

// Mock child_process so tests are fast and hermetic.
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';

function mockExecFile(
  impl: (args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => void
) {
  (execFile as any).mockImplementation(
    (_cmd: string, args: string[], _opts: any, cb: any) => {
      impl(args, cb);
    }
  );
}

describe('GatewayClient', () => {
  const client = new GatewayClient({ cliPath: 'openclaw', timeoutMs: 10000 });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sessionsList calls correct method and parses JSON', async () => {
    mockExecFile((_args, cb) => {
      cb(null, JSON.stringify({ sessions: [{ id: 's1' }] }), '');
    });

    const result = await client.sessionsList({ agentId: 'main', limit: 5 });
    expect(result.sessions).toHaveLength(1);
    expect((execFile as any).mock.calls[0][1]).toContain('sessions.list');
  });

  it('chatHistory calls correct method and parses JSON', async () => {
    mockExecFile((_args, cb) => {
      cb(null, JSON.stringify({ sessionId: 'sid', messages: [] }), '');
    });

    const result = await client.chatHistory({ sessionKey: 'test', limit: 1 });
    expect(result.sessionId).toBe('sid');
    expect((execFile as any).mock.calls[0][1]).toContain('chat.history');
  });

  it('send calls correct method', async () => {
    mockExecFile((_args, cb) => {
      cb(null, JSON.stringify({ ok: true }), '');
    });

    await client.send({ sessionKey: 'test', text: 'hello' });
    expect((execFile as any).mock.calls[0][1]).toContain('send');
  });

  it('throws GatewayError with code timeout when process is killed', async () => {
    mockExecFile((_args, cb) => {
      const err = new Error('killed') as any;
      err.killed = true;
      cb(err, '', '');
    });

    await expect(client.sessionsList({})).rejects.toThrow(GatewayError);
    await expect(client.sessionsList({})).rejects.toMatchObject({
      code: 'timeout',
    });
  });

  it('throws GatewayError with code cli_not_found when binary missing', async () => {
    mockExecFile((_args, cb) => {
      const err = new Error('ENOENT') as any;
      err.code = 'ENOENT';
      cb(err, '', '');
    });

    await expect(client.sessionsList({})).rejects.toMatchObject({
      code: 'cli_not_found',
    });
  });

  it('throws GatewayError with code invalid_json when stdout is not JSON', async () => {
    mockExecFile((_args, cb) => {
      cb(null, 'not-json', '');
    });

    await expect(client.sessionsList({})).rejects.toMatchObject({
      code: 'invalid_json',
    });
  });

  it('throws GatewayError with code rpc_failed on non-zero exit', async () => {
    mockExecFile((_args, cb) => {
      const err = new Error('exit 1') as any;
      err.code = 1;
      cb(err, '', 'some error');
    });

    await expect(client.sessionsList({})).rejects.toMatchObject({
      code: 'rpc_failed',
    });
  });
});
