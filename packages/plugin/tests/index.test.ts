import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('openclaw/plugin-sdk', () => ({
  emptyPluginConfigSchema: vi.fn(() => ({})),
}));

import plugin from '../src/index.js';
import { SessionCommandHandlers } from '../src/command-handlers.js';

vi.mock('../src/command-handlers.js', () => ({
  SessionCommandHandlers: vi.fn(() => ({
    handleSessions: vi.fn().mockResolvedValue({ text: 'sessions list' }),
    handleResume: vi.fn().mockResolvedValue({ text: 'resume list' }),
    handleResumeList: vi.fn().mockResolvedValue({ text: 'resume query list' }),
    handleResumeByIndex: vi.fn().mockResolvedValue({ text: 'resumed' }),
    handleResumeHelp: vi.fn().mockReturnValue({ text: 'resume help' }),
    handleResumeDebug: vi.fn().mockResolvedValue({ text: 'resume debug' }),
    handleResumeUsage: vi.fn().mockReturnValue({ text: '用法：resume usage' }),
    handleSessionsNumeric: vi.fn().mockReturnValue({ text: 'sessions numeric boundary' }),
    handleWhereami: vi.fn().mockResolvedValue({ text: 'whereami' }),
  })),
}));

function createMockApi() {
  return {
    registerCommand: vi.fn(),
  };
}

describe('plugin definition', () => {
  it('exports a valid OpenClawPluginDefinition', () => {
    expect(plugin.id).toBe('openclaw-command-kit');
    expect(plugin.name).toBe('OpenClaw Command Kit');
    expect(plugin.description).toContain('/sessions');
    expect(plugin.register).toBeTypeOf('function');
  });

  it('registers sessions, whereami, and resume commands', () => {
    const api = createMockApi();
    plugin.register(api as any);

    expect(api.registerCommand).toHaveBeenCalledTimes(3);
    expect(api.registerCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'sessions',
        acceptsArgs: true,
        requireAuth: true,
      })
    );
    expect(api.registerCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'whereami',
        acceptsArgs: false,
        requireAuth: true,
      })
    );
    expect(api.registerCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'resume',
        acceptsArgs: true,
        requireAuth: true,
      })
    );
  });

  it('sessions handler delegates to SessionCommandHandlers.handleSessions', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const sessionsCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'sessions'
    );
    expect(sessionsCall).toBeDefined();

    const handler = sessionsCall![0].handler;
    const result = await handler({} as any);

    expect(SessionCommandHandlers).toHaveBeenCalled();
    expect(result.text).toBe('sessions list');
  });

  it('sessions handler routes help and numeric boundaries locally', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const sessionsCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'sessions'
    );
    const handler = sessionsCall![0].handler;

    expect(await handler({ args: 'help' } as any)).toEqual({ text: 'resume help' });
    expect(await handler({ args: 'debug' } as any)).toEqual({ text: 'resume debug' });
    expect(await handler({ args: '2' } as any)).toEqual({ text: 'sessions numeric boundary' });
    expect(await handler({ args: '0' } as any)).toEqual({ text: '用法：resume usage' });
  });

  it('sessions handler routes all mode to handleSessions', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const sessionsCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'sessions'
    );
    const handler = sessionsCall![0].handler;
    const result = await handler({ args: 'all' } as any);

    expect(result.text).toBe('sessions list');
  });

  it('whereami handler delegates to SessionCommandHandlers.handleWhereami', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const whereamiCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'whereami'
    );
    expect(whereamiCall).toBeDefined();

    const handler = whereamiCall![0].handler;
    const result = await handler({} as any);

    expect(SessionCommandHandlers).toHaveBeenCalled();
    expect(result.text).toBe('whereami');
  });

  it('resume handler with no args delegates to handleResume', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const resumeCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'resume'
    );
    const handler = resumeCall![0].handler;
    const result = await handler({ args: '' } as any);

    expect(result.text).toBe('resume list');
  });

  it('resume handler with help delegates to handleResumeHelp', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const resumeCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'resume'
    );
    const handler = resumeCall![0].handler;
    const result = await handler({ args: 'help' } as any);

    expect(result.text).toBe('resume help');
  });

  it('resume handler with all delegates to handleResumeList in all mode', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const resumeCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'resume'
    );
    const handler = resumeCall![0].handler;
    const result = await handler({ args: 'all' } as any);

    expect(result.text).toBe('resume query list');
  });

  it('resume handler with debug delegates to handleResumeDebug', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const resumeCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'resume'
    );
    const handler = resumeCall![0].handler;
    const result = await handler({ args: 'debug' } as any);

    expect(result.text).toBe('resume debug');
  });

  it('resume handler with query delegates to handleResumeList', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const resumeCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'resume'
    );
    const handler = resumeCall![0].handler;
    const result = await handler({ args: 'auth0' } as any);

    expect(result.text).toBe('resume query list');
  });

  it('resume handler with valid number delegates to handleResumeByIndex', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const resumeCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'resume'
    );
    const handler = resumeCall![0].handler;
    const result = await handler({ args: '2' } as any);

    expect(result.text).toBe('resumed');
  });

  it('resume handler with invalid number returns usage hint', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const resumeCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'resume'
    );
    const handler = resumeCall![0].handler;
    const result = await handler({ args: '0' } as any);

    expect(result.text).toContain('用法');
  });

  it('resume handler rejects partial numeric strings', async () => {
    const api = createMockApi();
    plugin.register(api as any);

    const resumeCall = api.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'resume'
    );
    const handler = resumeCall![0].handler;
    const result = await handler({ args: '2abc' } as any);

    expect(result.text).toContain('用法');
  });
});
