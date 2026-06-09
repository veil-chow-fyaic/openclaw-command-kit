import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestoreService } from '../src/restore-service.js';
import { GatewayClient } from '../src/gateway-client.js';
import { SessionHistoryService } from '../src/session-history-service.js';
import type { ActorScope, RouteScope, ResumeListItem } from '../src/types.js';

vi.mock('node:fs');
vi.mock('../src/gateway-client.js', () => ({
  GatewayClient: vi.fn().mockImplementation(() => ({
    chatHistory: vi.fn(),
  })),
}));

vi.mock('../src/session-history-service.js', () => ({
  SessionHistoryService: vi.fn().mockImplementation(() => ({
    listSessions: vi.fn(),
  })),
}));

import * as fs from 'node:fs';

const actor: ActorScope = {
  provider: 'wecom',
  senderId: 'user123',
};

const route: RouteScope = {
  provider: 'wecom',
  sessionKey: 'wecom-default-弗忧联盟-周威',
  chatType: 'direct',
};

function makeItem(overrides: Partial<ResumeListItem> = {}): ResumeListItem {
  return {
    displayIndex: 1,
    sessionId: 's1',
    title: 'Test',
    updatedAt: new Date(),
    lastMessagePreview: '',
    isCurrent: false,
    isRestorable: true,
    ...overrides,
  };
}

describe('RestoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invalid_index when displayIndex does not exist', async () => {
    const gateway = new GatewayClient() as any;
    const history = new SessionHistoryService(gateway) as any;
    history.listSessions.mockResolvedValue([makeItem({ displayIndex: 1 })]);

    const service = new RestoreService(gateway, history, '/tmp/sessions');
    const result = await service.restoreSession(actor, route, 999);
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_index');
    expect(history.listSessions).toHaveBeenCalledWith(actor, route, undefined, { mode: 'all' });
  });

  it('returns invalid_index when scoped list is empty', async () => {
    const gateway = new GatewayClient() as any;
    const history = new SessionHistoryService(gateway) as any;
    history.listSessions.mockResolvedValue([]);

    const service = new RestoreService(gateway, history, '/tmp/sessions');
    const result = await service.restoreSession(actor, route, 1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_index');
  });

  it('returns store_error when sessions.json does not exist', async () => {
    const gateway = new GatewayClient() as any;
    const history = new SessionHistoryService(gateway) as any;
    history.listSessions.mockResolvedValue([makeItem({ displayIndex: 1 })]);
    (fs.existsSync as any).mockReturnValue(false);

    const service = new RestoreService(gateway, history, '/tmp/sessions');
    const result = await service.restoreSession(actor, route, 1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('store_error');
  });

  it('restores session, creates backup, and confirms on read-back', async () => {
    const gateway = new GatewayClient() as any;
    gateway.chatHistory.mockResolvedValue({ sessionId: 's1' });

    const history = new SessionHistoryService(gateway) as any;
    history.listSessions.mockResolvedValue([makeItem({ displayIndex: 1, sessionId: 's1' })]);

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({
      'agent:main:wecom-default-弗忧联盟-周威': { sessionId: 'old', sessionFile: '/tmp/old.jsonl' },
    }));
    (fs.copyFileSync as any).mockImplementation(() => {});
    (fs.writeFileSync as any).mockImplementation(() => {});
    (fs.renameSync as any).mockImplementation(() => {});

    const service = new RestoreService(gateway, history, '/tmp/sessions');
    const result = await service.restoreSession(actor, route, 1);

    expect(result.success).toBe(true);
    expect(fs.copyFileSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.renameSync).toHaveBeenCalled();
  });

  it('copies reset file to jsonl when restoring historical generation', async () => {
    const gateway = new GatewayClient() as any;
    gateway.chatHistory.mockResolvedValue({ sessionId: 'hist1' });

    const history = new SessionHistoryService(gateway) as any;
    history.listSessions.mockResolvedValue([
      makeItem({ displayIndex: 1, sessionId: 'hist1', sessionFile: 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z' }),
    ]);

    (fs.existsSync as any).mockImplementation((p: string) => p.includes('.reset.') || p.includes('sessions.json'));
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({
      'agent:main:wecom-default-弗忧联盟-周威': { sessionId: 'old', sessionFile: '/tmp/sessions/old.jsonl' },
    }));
    (fs.copyFileSync as any).mockImplementation(() => {});
    (fs.writeFileSync as any).mockImplementation(() => {});
    (fs.renameSync as any).mockImplementation(() => {});

    const service = new RestoreService(gateway, history, '/tmp/sessions');
    const result = await service.restoreSession(actor, route, 1);

    expect(result.success).toBe(true);
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/tmp/sessions/hist1.jsonl.reset.2026-05-20T08-00-00.000Z',
      '/tmp/sessions/hist1.jsonl'
    );
  });

  it('returns store_error when reset file copy fails', async () => {
    const gateway = new GatewayClient() as any;
    gateway.chatHistory.mockResolvedValue({ sessionId: 'hist1' });

    const history = new SessionHistoryService(gateway) as any;
    history.listSessions.mockResolvedValue([
      makeItem({ displayIndex: 1, sessionId: 'hist1', sessionFile: 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z' }),
    ]);

    (fs.existsSync as any).mockImplementation((p: string) => p.includes('.reset.') || p.includes('sessions.json'));
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({
      'agent:main:wecom-default-弗忧联盟-周威': { sessionId: 'old', sessionFile: '/tmp/sessions/old.jsonl' },
    }));
    (fs.copyFileSync as any).mockImplementation(() => { throw new Error('disk full'); });

    const service = new RestoreService(gateway, history, '/tmp/sessions');
    const result = await service.restoreSession(actor, route, 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('store_error');
  });

  it('returns readback_failure when read-back does not confirm', async () => {
    const gateway = new GatewayClient() as any;
    gateway.chatHistory.mockResolvedValue({ sessionId: 'different' });

    const history = new SessionHistoryService(gateway) as any;
    history.listSessions.mockResolvedValue([makeItem({ displayIndex: 1, sessionId: 's1' })]);

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({
      'agent:main:wecom-default-弗忧联盟-周威': { sessionId: 'old' },
    }));
    (fs.copyFileSync as any).mockImplementation(() => {});
    (fs.writeFileSync as any).mockImplementation(() => {});
    (fs.renameSync as any).mockImplementation(() => {});

    const service = new RestoreService(gateway, history, '/tmp/sessions');
    const result = await service.restoreSession(actor, route, 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('readback_failure');
  });
});
