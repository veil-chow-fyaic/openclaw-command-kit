import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionHistoryService } from '../src/session-history-service.js';
import { GatewayClient } from '../src/gateway-client.js';
import type { ActorScope, RouteScope } from '../src/types.js';

vi.mock('../src/gateway-client.js', () => ({
  GatewayClient: vi.fn().mockImplementation(() => ({
    sessionsList: vi.fn(),
    chatHistory: vi.fn().mockResolvedValue({ messages: [] }),
  })),
}));

vi.mock('../src/session-generation-scanner.js', () => ({
  scanGenerations: vi.fn(),
}));

import { scanGenerations } from '../src/session-generation-scanner.js';

let testSessionsDir: string;

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
    testSessionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ock-sessions-'));
    process.env.OPENCLAW_SESSIONS_DIR = testSessionsDir;
  });

  afterEach(() => {
    delete process.env.OPENCLAW_SESSIONS_DIR;
    fs.rmSync(testSessionsDir, { recursive: true, force: true });
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

  it('includes same delivery route across sessionKey variants', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-default-弗忧联盟-veil（周威）',
          sessionId: 'with-org',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: 'Veil（周威）', to: 'Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Veil（周威）' },
          updatedAt: 1000,
        },
        {
          key: 'agent:main:wecom-default-veil（周威）',
          sessionId: 'without-org',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', label: 'Veil（周威）', to: 'Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Veil（周威）' },
          updatedAt: 3000,
        },
        {
          key: 'wecom-default-veil（周威）',
          sessionId: 'raw-key',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', label: 'Veil（周威）', to: 'wecom:Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'wecom:Veil（周威）' },
          updatedAt: 2000,
        },
        {
          key: 'agent:main:wecom-default-rosetta(郭子滇)',
          sessionId: 'other-person',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', label: 'Rosetta(郭子滇)', to: 'Rosetta(郭子滇)' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Rosetta(郭子滇)' },
          updatedAt: 4000,
        },
      ],
    });
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const veilRoute: RouteScope = {
      ...route,
      sessionKey: 'wecom-default-弗忧联盟-veil（周威）',
      label: 'Veil（周威）',
    };
    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, veilRoute);

    expect(items.map((item) => item.sessionId)).toEqual([
      'without-org',
      'raw-key',
      'with-org',
    ]);
  });

  it('supplements gateway sessions from local sessions.json when gateway omits raw store entries', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-default-veil（周威）',
          sessionId: 'gateway-current',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', label: 'Veil（周威）', to: 'Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Veil（周威）' },
          updatedAt: 3000,
        },
        {
          key: 'agent:main:wecom-default-弗忧联盟-veil（周威）',
          sessionId: 'gateway-org',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: 'Veil（周威）', to: 'Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Veil（周威）' },
          updatedAt: 1000,
        },
      ],
    });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:wecom-default-veil（周威）': {
          sessionId: 'gateway-current',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', label: 'Veil（周威）', to: 'Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Veil（周威）' },
          updatedAt: 3000,
        },
        'wecom-default-veil（周威）': {
          sessionId: 'local-raw-key',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', label: 'Veil（周威）', to: 'Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Veil（周威）' },
          sessionFile: 'local-raw-key.jsonl',
          updatedAt: 4000,
        },
      }),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const veilRoute: RouteScope = {
      ...route,
      sessionKey: 'wecom-default-veil（周威）',
      label: 'Veil（周威）',
    };
    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, veilRoute);

    expect(items.map((item) => item.sessionId)).toEqual([
      'local-raw-key',
      'gateway-current',
      'gateway-org',
    ]);
    expect(items[0].sessionFile).toBe('local-raw-key.jsonl');
  });

  it('includes unscoped manual sessions only in direct chats', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({ sessions: [] });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:explicit:meeting-follow-up': {
          sessionId: 'manual-session',
          sessionFile: 'manual-session.jsonl',
          updatedAt: 6000,
        },
        'agent:main:main': {
          sessionId: 'default-main',
          sessionFile: 'default-main.jsonl',
          updatedAt: 7000,
        },
      }),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const directItems = await service.listSessions(actor, route);
    expect(directItems.map((item) => item.sessionId)).toEqual(['manual-session']);
    expect(directItems[0].title).toBe('meeting-follow-up');
    expect(directItems[0].isCurrent).toBe(false);

    const groupItems = await service.listSessions(actor, { ...route, chatType: 'group' });
    expect(groupItems).toHaveLength(0);
  });

  it('prefers local store entries over gateway duplicates for manual sessions', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:manual-session',
          sessionId: 'manual-session',
          origin: { provider: 'webchat' },
          updatedAt: 6000,
        },
      ],
    });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:manual-session': {
          sessionId: 'manual-session',
          sessionFile: 'manual-session.jsonl',
          updatedAt: 6000,
        },
      }),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items).toHaveLength(1);
    expect(items[0].sessionId).toBe('manual-session');
    expect(items[0].sessionFile).toBe('manual-session.jsonl');
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
