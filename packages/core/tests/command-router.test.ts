import { describe, it, expect, vi } from 'vitest';
import { CommandRouter } from '../src/command-router.js';
import { SessionHistoryService } from '../src/session-history-service.js';
import { RestoreService } from '../src/restore-service.js';
import type { ActorScope, RouteScope, SessionCommandAdapter, ResumeListItem } from '../src/types.js';

vi.mock('../src/session-history-service.js', () => ({
  SessionHistoryService: vi.fn().mockImplementation(() => ({
    listSessions: vi.fn(),
  })),
}));

vi.mock('../src/restore-service.js', () => ({
  RestoreService: vi.fn().mockImplementation(() => ({
    restoreSession: vi.fn(),
  })),
}));

const actor: ActorScope = { provider: 'wecom', senderId: 'u1' };
const route: RouteScope = { provider: 'wecom', sessionKey: 'k1', chatType: 'direct' };

const adapter: SessionCommandAdapter = {
  resolveActorScope: () => actor,
  resolveRouteScope: () => route,
  deliverReply: vi.fn(),
  shouldIntercept: (text) => text.startsWith('/sessions') || text.startsWith('/resume'),
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

describe('CommandRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles /sessions', async () => {
    const history = new SessionHistoryService({} as any) as any;
    history.listSessions.mockResolvedValue([makeItem()]);

    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/sessions', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(adapter.deliverReply).toHaveBeenCalled();
  });

  it('handles /resume (no arg)', async () => {
    const history = new SessionHistoryService({} as any) as any;
    history.listSessions.mockResolvedValue([makeItem()]);

    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/resume', actor, route, adapter);
    expect(result.handled).toBe(true);
    const replyText = (adapter.deliverReply as any).mock.calls[0][1];
    expect(replyText).toContain('/resume N');
  });

  it('handles /resume N', async () => {
    const history = new SessionHistoryService({} as any) as any;
    history.listSessions.mockResolvedValue([makeItem({ displayIndex: 2, sessionId: 's2' })]);

    const restore = new RestoreService({} as any, history) as any;
    restore.restoreSession.mockResolvedValue({
      success: true,
      restoredSessionId: 's2',
    });

    const router = new CommandRouter(history, restore);
    const result = await router.handle('/resume 2', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(restore.restoreSession).toHaveBeenCalledWith(actor, route, 2);
  });

  it('rejects bare numeric replies like "2"', async () => {
    const history = new SessionHistoryService({} as any) as any;
    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('2', actor, route, adapter);
    expect(result.handled).toBe(false);
  });

  it('rejects partial matches like /session', async () => {
    const history = new SessionHistoryService({} as any) as any;
    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/session', actor, route, adapter);
    expect(result.handled).toBe(false);
  });

  it('rejects extra arguments on /resume N', async () => {
    const history = new SessionHistoryService({} as any) as any;
    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/resume 2 extra', actor, route, adapter);
    expect(result.handled).toBe(false);
  });
});
