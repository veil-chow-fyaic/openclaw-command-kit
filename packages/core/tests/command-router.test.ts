import { describe, it, expect, vi } from 'vitest';
import { CommandRouter } from '../src/command-router.js';
import { SessionHistoryService } from '../src/session-history-service.js';
import { RestoreService } from '../src/restore-service.js';
import type { ActorScope, RouteScope, SessionCommandAdapter, ResumeListItem } from '../src/types.js';

vi.mock('../src/session-history-service.js', () => ({
  SessionHistoryService: vi.fn().mockImplementation(() => ({
    listSessions: vi.fn(),
    inspectSessions: vi.fn(),
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
    expect(replyText).toContain('发送 /resume 序号 继续；/resume help 查看用法。');
  });

  it('handles /resume help without resolving history', async () => {
    const history = new SessionHistoryService({} as any) as any;
    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/resume help', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(history.listSessions).not.toHaveBeenCalled();
    const replyText = (adapter.deliverReply as any).mock.calls[0][1];
    expect(replyText).toContain('/resume 序号');
    expect(replyText).toContain('/sessions 只用于查看和搜索');
  });

  it('uses /resume non-numeric args as a search query', async () => {
    const history = new SessionHistoryService({} as any) as any;
    history.listSessions.mockResolvedValue([makeItem({ title: 'Auth0 调研' })]);

    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/resume auth0', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(history.listSessions).toHaveBeenCalledWith(actor, route, 'auth0', { mode: 'default' });
    expect(restore.restoreSession).not.toHaveBeenCalled();
  });

  it('uses /resume all for the full candidate list', async () => {
    const history = new SessionHistoryService({} as any) as any;
    history.listSessions.mockResolvedValue([makeItem()]);

    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/resume all', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(history.listSessions).toHaveBeenCalledWith(actor, route, undefined, { mode: 'all' });
  });

  it('handles /resume debug through diagnostics', async () => {
    const history = new SessionHistoryService({} as any) as any;
    history.inspectSessions.mockResolvedValue({
      items: [],
      diagnostics: {
        route,
        mode: 'default',
        rawCount: 3,
        trustedRawCount: 1,
        historicalCount: 0,
        allCount: 1,
        visibleCount: 1,
        currentCount: 1,
        hidden: [{ reason: 'route_mismatch_untrusted', count: 2 }],
        trust: [{ source: 'metadata', count: 1 }],
        warnings: [],
      },
    });

    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/resume debug', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(history.inspectSessions).toHaveBeenCalledWith(actor, route);
    expect(history.listSessions).not.toHaveBeenCalled();
    expect(restore.restoreSession).not.toHaveBeenCalled();
    const replyText = (adapter.deliverReply as any).mock.calls[0][1];
    expect(replyText).toContain('恢复诊断');
    expect(replyText).toContain('缺少可信路由证据：2');
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

  it('handles extra arguments on /resume N as usage error', async () => {
    const history = new SessionHistoryService({} as any) as any;
    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/resume 2 extra', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(restore.restoreSession).not.toHaveBeenCalled();
    const replyText = (adapter.deliverReply as any).mock.calls[0][1];
    expect(replyText).toContain('用法：/resume');
  });

  it('handles partial numeric /resume args as usage error', async () => {
    const history = new SessionHistoryService({} as any) as any;
    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/resume 2abc', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(restore.restoreSession).not.toHaveBeenCalled();
    const replyText = (adapter.deliverReply as any).mock.calls[0][1];
    expect(replyText).toContain('用法：/resume');
  });

  it('keeps /sessions numeric args as a view-only boundary', async () => {
    const history = new SessionHistoryService({} as any) as any;
    const restore = new RestoreService({} as any, history) as any;
    const router = new CommandRouter(history, restore);

    const result = await router.handle('/sessions 2', actor, route, adapter);
    expect(result.handled).toBe(true);
    expect(restore.restoreSession).not.toHaveBeenCalled();
    const replyText = (adapter.deliverReply as any).mock.calls[0][1];
    expect(replyText).toBe('/sessions 只用于查看和搜索。要继续第 2 个对话，请发送 /resume 2。');
  });
});
