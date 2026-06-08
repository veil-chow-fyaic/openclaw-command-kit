import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionCommandHandlers } from '../src/command-handlers.js';
import { deriveScopes } from '../src/scope-deriver.js';
import {
  SessionHistoryService,
  RestoreService,
  formatSessionList,
  formatResumeSuccess,
  formatError,
} from '@fyaic/core';
import type { PluginCommandContext } from 'openclaw/plugin-sdk/plugins/types';

vi.mock('../src/scope-deriver.js', () => ({
  deriveScopes: vi.fn(),
}));

function mockCtx(overrides: Partial<PluginCommandContext> = {}): PluginCommandContext {
  return {
    channel: 'wecom',
    senderId: 'userA',
    to: 'Alice',
    accountId: 'default',
    args: '',
    commandBody: '',
    config: {},
    ...overrides,
  } as PluginCommandContext;
}

function mockScopes() {
  return {
    actor: { provider: 'wecom', senderId: 'userA', accountId: 'default' },
    route: {
      provider: 'wecom',
      sessionKey: 'wecom-default-org1-Alice',
      chatType: 'direct' as const,
      accountId: 'default',
      organization: 'org1',
      label: 'Alice',
    },
  };
}

function mockItem(index: number, overrides: Partial<any> = {}) {
  return {
    displayIndex: index,
    sessionId: `session-${index}`,
    title: `对话 ${index}`,
    updatedAt: new Date('2026-05-20T10:00:00Z'),
    lastMessagePreview: '最后消息',
    isCurrent: false,
    isRestorable: true,
    ...overrides,
  };
}

describe('SessionCommandHandlers', () => {
  let handlers: SessionCommandHandlers;
  let mockHistory: { listSessions: ReturnType<typeof vi.fn> };
  let mockRestore: { restoreSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHistory = { listSessions: vi.fn() };
    mockRestore = { restoreSession: vi.fn() };
    handlers = new SessionCommandHandlers(
      undefined,
      mockHistory as unknown as SessionHistoryService,
      mockRestore as unknown as RestoreService
    );
  });

  describe('handleSessions', () => {
    it('returns formatted list when scopes resolve', async () => {
      vi.mocked(deriveScopes).mockResolvedValue(mockScopes());
      mockHistory.listSessions.mockResolvedValue([
        mockItem(1),
        mockItem(2),
      ]);

      const result = await handlers.handleSessions(mockCtx());

      expect(deriveScopes).toHaveBeenCalledWith(mockCtx(), expect.anything());
      expect(mockHistory.listSessions).toHaveBeenCalled();
      expect(result.text).toContain('可恢复的历史对话');
      expect(result.text).not.toContain('【OCK】');
    });

    it('returns fail-closed message when actor scope cannot be derived', async () => {
      vi.mocked(deriveScopes).mockResolvedValue({ reason: 'actor' });

      const result = await handlers.handleSessions(mockCtx());

      expect(result.text).toBe(formatError('actor'));
      expect(mockHistory.listSessions).not.toHaveBeenCalled();
    });
  });

  describe('handleResume', () => {
    it('returns list with extra hint when scopes resolve', async () => {
      vi.mocked(deriveScopes).mockResolvedValue(mockScopes());
      mockHistory.listSessions.mockResolvedValue([mockItem(1)]);

      const result = await handlers.handleResume(mockCtx());

      expect(result.text).toContain('可恢复的历史对话');
      expect(result.text).toContain('发送 /resume N 切换到第 N 个历史对话。');
      expect(result.text).not.toContain('【OCK】');
    });

    it('returns fail-closed message when route scope cannot be derived', async () => {
      vi.mocked(deriveScopes).mockResolvedValue({ reason: 'route' });

      const result = await handlers.handleResume(mockCtx());

      expect(result.text).toBe(formatError('route'));
    });
  });

  describe('handleResumeByIndex', () => {
    it('returns success text when restore succeeds', async () => {
      vi.mocked(deriveScopes).mockResolvedValue(mockScopes());
      mockRestore.restoreSession.mockResolvedValue({
        success: true,
        restoredSessionId: 'session-2',
        message: 'ok',
      });
      mockHistory.listSessions.mockResolvedValue([
        mockItem(1),
        mockItem(2, { sessionId: 'session-2', title: '目标对话' }),
      ]);

      const result = await handlers.handleResumeByIndex(mockCtx(), 2);

      expect(mockRestore.restoreSession).toHaveBeenCalledWith(
        mockScopes().actor,
        mockScopes().route,
        2
      );
      expect(result.text).toContain('已切换到历史对话');
      expect(result.text).toContain('目标对话');
    });

    it('returns generic success when restored item not found in readback', async () => {
      vi.mocked(deriveScopes).mockResolvedValue(mockScopes());
      mockRestore.restoreSession.mockResolvedValue({
        success: true,
        restoredSessionId: 'session-99',
        message: 'ok',
      });
      mockHistory.listSessions.mockResolvedValue([
        mockItem(1),
        mockItem(2),
      ]);

      const result = await handlers.handleResumeByIndex(mockCtx(), 2);

      expect(result.text).toBe('已切换，但无法读取对话信息。');
    });

    it('returns formatted error when restore fails', async () => {
      vi.mocked(deriveScopes).mockResolvedValue(mockScopes());
      mockRestore.restoreSession.mockResolvedValue({
        success: false,
        error: 'invalid_index',
        message: 'bad',
      });

      const result = await handlers.handleResumeByIndex(mockCtx(), 999);

      expect(result.text).toBe(formatError('invalid_index', { index: 999 }));
    });

    it('returns fail-closed message when route scope cannot be derived', async () => {
      vi.mocked(deriveScopes).mockResolvedValue({ reason: 'route' });

      const result = await handlers.handleResumeByIndex(mockCtx(), 1);

      expect(result.text).toBe(formatError('route'));
      expect(mockRestore.restoreSession).not.toHaveBeenCalled();
    });

    it('returns fallback error when error field is missing', async () => {
      vi.mocked(deriveScopes).mockResolvedValue(mockScopes());
      mockRestore.restoreSession.mockResolvedValue({
        success: false,
        message: 'something went wrong',
      });

      const result = await handlers.handleResumeByIndex(mockCtx(), 1);

      expect(result.text).toBe(formatError('readback_failure', { index: 1 }));
    });
  });
});
