import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('openclaw/plugin-sdk', () => ({
  emptyPluginConfigSchema: vi.fn(() => ({})),
}));

vi.mock('openclaw/plugin-sdk/plugins/types', () => ({
  // Types-only; no runtime values needed for this test
}));

import plugin from '../src/index.js';
import { SessionCommandHandlers } from '../src/command-handlers.js';

vi.mock('../src/command-handlers.js', () => ({
  SessionCommandHandlers: vi.fn(() => ({
    handleSessions: vi.fn().mockResolvedValue({ text: 'sessions list' }),
    handleResume: vi.fn().mockResolvedValue({ text: 'resume list' }),
    handleResumeByIndex: vi.fn().mockResolvedValue({ text: 'resumed' }),
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

  it('registers sessions and resume commands', () => {
    const api = createMockApi();
    plugin.register(api as any);

    expect(api.registerCommand).toHaveBeenCalledTimes(2);
    expect(api.registerCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'sessions',
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
    const result = await handler({ args: 'abc' } as any);

    expect(result.text).toContain('用法');
  });

  it('resume handler rejects partial numeric strings like "2abc"', async () => {
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
