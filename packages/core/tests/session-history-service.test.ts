import { describe, it, expect, vi } from 'vitest';
import { SessionHistoryService } from '../src/session-history-service.js';
import { GatewayClient } from '../src/gateway-client.js';
import type { ActorScope, RouteScope } from '../src/types.js';

vi.mock('../src/gateway-client.js', () => ({
  GatewayClient: vi.fn().mockImplementation(() => ({
    sessionsList: vi.fn(),
  })),
}));

vi.mock('../src/session-generation-scanner.js', () => ({
  scanGenerations: vi.fn(),
}));

import { scanGenerations } from '../src/session-generation-scanner.js';

const actor: ActorScope = {
  provider: 'wecom',
  senderId: 'user123',
  accountId: 'default',
  organization: '弗忧联盟',
};

const route: RouteScope = {
  provider: 'wecom',
  sessionKey: 'wecom-default-弗忧联盟-周威',
  chatType: 'direct',
  accountId: 'default',
  organization: '弗忧联盟',
  label: '周威',
};

describe('SessionHistoryService', () => {
  beforeEach(() => {
    vi.mocked(scanGenerations).mockReset();
  });

  it('returns empty list when gateway returns no sessions', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({ sessions: [] });

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);
    expect(items).toHaveLength(0);
  });

  it('filters sessions by route scope', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        { key: 'agent:main:wecom-default-弗忧联盟-周威', sessionId: 's1', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威' }, updatedAt: 1000 },
        { key: 'agent:main:wecom-default-弗忧联盟-学习园地', sessionId: 's2', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '学习园地' }, updatedAt: 2000 },
      ],
    });
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);
    expect(items).toHaveLength(1);
    expect(items[0].sessionId).toBe('s1');
    expect(items[0].displayIndex).toBe(1);
    expect(items[0].isCurrent).toBe(true);
  });

  it('sorts by updatedAt desc', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        { key: 'agent:main:wecom-default-弗忧联盟-周威', sessionId: 'older', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟' }, updatedAt: 1000 },
        { key: 'agent:main:wecom-default-弗忧联盟-周威', sessionId: 'newer', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟' }, updatedAt: 3000 },
      ],
    });
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);
    expect(items[0].sessionId).toBe('newer');
    expect(items[1].sessionId).toBe('older');
  });

  it('excludes sessions from different provider', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        { key: 'agent:main:wecom-default-弗忧联盟-周威', sessionId: 's1', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟' }, updatedAt: 1000 },
      ],
    });
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const differentRoute: RouteScope = { ...route, provider: 'telegram' };
    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, differentRoute);
    expect(items).toHaveLength(0);
  });

  it('merges historical generations from local scan', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        { key: 'agent:main:wecom-default-弗忧联盟-周威', sessionId: 'active1', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威' }, updatedAt: 5000 },
      ],
    });
    vi.mocked(scanGenerations).mockResolvedValue([
      {
        sessionId: 'hist1',
        sessionFile: 'hist1.jsonl.reset.xxx',
        title: '历史对话 1',
        updatedAt: new Date(3000),
        lastMessagePreview: '最后消息 1',
        isCurrent: false,
        isRestorable: true,
      },
      {
        sessionId: 'hist2',
        sessionFile: 'hist2.jsonl.reset.xxx',
        title: '历史对话 2',
        updatedAt: new Date(8000),
        lastMessagePreview: '最后消息 2',
        isCurrent: false,
        isRestorable: true,
      },
    ]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items).toHaveLength(3);
    // Sorted by updatedAt desc: hist2 (8000), active1 (5000), hist1 (3000)
    expect(items[0].sessionId).toBe('hist2');
    expect(items[0].displayIndex).toBe(1);
    expect(items[0].isCurrent).toBe(false);

    expect(items[1].sessionId).toBe('active1');
    expect(items[1].displayIndex).toBe(2);
    expect(items[1].isCurrent).toBe(true);

    expect(items[2].sessionId).toBe('hist1');
    expect(items[2].displayIndex).toBe(3);
    expect(items[2].isCurrent).toBe(false);
  });

  it('skips scan when route label is missing', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        { key: 'agent:main:wecom-default-弗忧联盟-周威', sessionId: 's1', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟' }, updatedAt: 1000 },
      ],
    });

    const noLabelRoute: RouteScope = { ...route, label: undefined };
    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, noLabelRoute);

    expect(items).toHaveLength(1);
    expect(scanGenerations).not.toHaveBeenCalled();
  });

  it('returns active sessions even when scan throws', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        { key: 'agent:main:wecom-default-弗忧联盟-周威', sessionId: 's1', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威' }, updatedAt: 1000 },
      ],
    });
    vi.mocked(scanGenerations).mockRejectedValue(new Error('disk read error'));

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items).toHaveLength(1);
    expect(items[0].sessionId).toBe('s1');
  });

  it('deduplicates historical generations already present in active sessions', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        { key: 'agent:main:wecom-default-弗忧联盟-周威', sessionId: 'dup1', chatType: 'direct', origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威' }, updatedAt: 5000 },
      ],
    });
    vi.mocked(scanGenerations).mockResolvedValue([
      {
        sessionId: 'dup1',
        sessionFile: 'dup1.jsonl.reset.xxx',
        title: '历史标题',
        updatedAt: new Date(3000),
        lastMessagePreview: '预览',
        isCurrent: false,
        isRestorable: true,
      },
      {
        sessionId: 'hist2',
        sessionFile: 'hist2.jsonl.reset.xxx',
        title: '历史 2',
        updatedAt: new Date(8000),
        lastMessagePreview: '预览 2',
        isCurrent: false,
        isRestorable: true,
      },
    ]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items).toHaveLength(2);
    expect(items.some((i) => i.sessionId === 'dup1' && i.isCurrent)).toBe(true);
    expect(items.some((i) => i.sessionId === 'hist2')).toBe(true);
  });
});
