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

  it('marks only the newest exact route item as current', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-default-veil（周威）',
          sessionId: 'older-exact',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', label: 'Veil（周威）', to: 'Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Veil（周威）' },
          updatedAt: 1000,
        },
        {
          key: 'agent:main:wecom-default-veil（周威）',
          sessionId: 'newer-exact',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', label: 'Veil（周威）', to: 'Veil（周威）' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Veil（周威）' },
          updatedAt: 3000,
        },
      ],
    });
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const veilRoute: RouteScope = {
      ...route,
      sessionKey: 'wecom-default-veil（周威）',
      label: 'Veil（周威）',
    };
    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, veilRoute);

    expect(items.filter((item) => item.isCurrent)).toHaveLength(1);
    expect(items.find((item) => item.isCurrent)?.sessionId).toBe('newer-exact');
    expect(items.find((item) => item.sessionId === 'older-exact')?.title).toBe('同一路由历史对话');
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

  it('excludes unscoped sessions without route metadata', async () => {
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
    expect(directItems).toHaveLength(0);

    const groupItems = await service.listSessions(actor, { ...route, chatType: 'group' });
    expect(groupItems).toHaveLength(0);
  });

  it('does not expose unscoped cron sessions across direct routes', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-default-弗忧联盟-rosetta(郭子滇)',
          sessionId: 'rosetta-current',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: 'Rosetta(郭子滇)', to: 'Rosetta(郭子滇)' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Rosetta(郭子滇)' },
          updatedAt: 8000,
        },
      ],
    });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:wecom-default-弗忧联盟-rosetta(郭子滇)': {
          sessionId: 'rosetta-current',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: 'Rosetta(郭子滇)', to: 'Rosetta(郭子滇)' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: 'Rosetta(郭子滇)' },
          sessionFile: 'rosetta-current.jsonl',
          updatedAt: 8000,
        },
        'agent:main:cron:greeting-evening-1900': {
          sessionId: 'tommy-greeting',
          sessionFile: 'tommy-greeting.jsonl',
          updatedAt: 9000,
        },
        'agent:main:cron:greeting-veil-1430': {
          sessionId: 'veil-greeting',
          sessionFile: 'veil-greeting.jsonl',
          updatedAt: 7000,
        },
        'agent:main:explicit:tommy-rosetta-mention': {
          sessionId: 'tommy-rosetta-mention',
          sessionFile: 'tommy-rosetta-mention.jsonl',
          updatedAt: 6500,
        },
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'tommy-greeting.jsonl'),
      JSON.stringify({
        timestamp: '2026-06-09T11:00:00.000Z',
        message: { role: 'assistant', content: 'Tommy，晚上好。' },
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'tommy-rosetta-mention.jsonl'),
      [
        JSON.stringify({
          timestamp: '2026-06-09T10:59:00.000Z',
          message: { role: 'user', content: '你当前在 **WeCom 单聊**（Tommy（曹旭升））里，请回复这个聊天。' },
        }),
        JSON.stringify({
          timestamp: '2026-06-09T11:00:00.000Z',
          message: { role: 'assistant', content: '后续可以让 Rosetta(郭子滇) 也看一下这个方案。' },
        }),
      ].join('\n'),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const rosettaRoute: RouteScope = {
      ...route,
      sessionKey: 'wecom-default-弗忧联盟-rosetta(郭子滇)',
      label: 'Rosetta(郭子滇)',
    };
    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, rosettaRoute, undefined, { mode: 'all' });

    expect(items.map((item) => item.sessionId)).toEqual(['rosetta-current']);
  });

  it('prefers local store entries over gateway duplicates when scoped', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-default-弗忧联盟-周威',
          sessionId: 'manual-session',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威', to: '周威' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: '周威' },
          updatedAt: 6000,
        },
      ],
    });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:wecom-default-弗忧联盟-周威': {
          sessionId: 'manual-session',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威', to: '周威' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: '周威' },
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

  it('replaces weak fallback titles with transcript-derived titles and previews', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({ sessions: [] });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:gateway-fallback-45b17dce-923f-4844-8473-75b34b6d9347': {
          sessionId: 'fallback-session',
          sessionFile: 'fallback-session.jsonl',
          updatedAt: 6000,
        },
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'fallback-session.jsonl'),
      [
        JSON.stringify({
          timestamp: '2026-06-08T09:59:00.000Z',
          message: { role: 'user', content: '你当前在 **WeCom 单聊**（Veil（周威））里，请回复这个聊天。' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T09:59:30.000Z',
          message: { role: 'user', content: 'Downloading @fyaic/openclaw-command-kit@0.1.13' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T10:00:00.000Z',
          message: { role: 'user', content: '帮我检查 OpenClaw 的 sessions 插件为什么只显示两个' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T10:02:00.000Z',
          message: { role: 'assistant', content: '原因是 gateway list 漏掉了本地 store 条目。 MEDIA:/Users/fuyo-aic/report.pdf' },
        }),
      ].join('\n'),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('帮我检查 OpenClaw 的 sessions 插件为什么只显示两个');
    expect(items[0].lastMessagePreview).toBe('原因是 gateway list 漏掉了本地 store 条目。');
    expect(items[0].lastUserMessage).toBe('帮我检查 OpenClaw 的 sessions 插件为什么只显示两个');
    expect(items[0].lastAssistantMessage).toBe('原因是 gateway list 漏掉了本地 store 条目。');
  });

  it('ignores gateway progress facts and command replies when summarizing transcripts', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({ sessions: [] });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:explicit:gateway-fallback-45b17dce-923f-4844-8473-75b34b6d9347': {
          sessionId: 'fallback-session',
          sessionFile: 'fallback-session.jsonl',
          updatedAt: 6000,
        },
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'fallback-session.jsonl'),
      [
        JSON.stringify({
          timestamp: '2026-06-08T09:58:00.000Z',
          message: { role: 'user', content: '你当前在 **WeCom 单聊**（周威）里，请回复这个聊天。' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T09:59:00.000Z',
          message: { role: 'assistant', content: 'ACP gateway progress fact: session list refreshed for route wecom-default-veil' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T10:00:00.000Z',
          message: { role: 'user', content: '继续完善 /resume 列表展示体验' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T10:01:00.000Z',
          message: { role: 'assistant', content: '可恢复的历史对话（2 个）\n\n1. 当前对话 · 刚刚' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T10:02:00.000Z',
          message: { role: 'assistant', content: '已经把低信号标题过滤掉。' },
        }),
      ].join('\n'),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('继续完善 /resume 列表展示体验');
    expect(items[0].lastMessagePreview).toBe('已经把低信号标题过滤掉。');
  });

  it('hides sessions that only contain background task and diagnostic noise', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({ sessions: [] });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:explicit:gateway-fallback-background': {
          sessionId: 'background-only',
          sessionFile: 'background-only.jsonl',
          updatedAt: 7000,
        },
        'agent:main:acp-tool-token-check': {
          sessionId: 'acp-only',
          sessionFile: 'acp-only.jsonl',
          updatedAt: 6000,
        },
        'agent:main:codex-openclaw-web-cbp-check': {
          sessionId: 'web-check',
          sessionFile: 'web-check.jsonl',
          updatedAt: 5000,
        },
        'agent:main:explicit:meeting-follow-up-abc': {
          sessionId: 'meeting-follow-up-abc',
          sessionFile: 'meeting-follow-up-abc.jsonl',
          updatedAt: 4500,
        },
        'agent:main:explicit:testing': {
          sessionId: 'testing',
          sessionFile: 'testing.jsonl',
          updatedAt: 4300,
        },
        'agent:main:explicit:human-session': {
          sessionId: 'human',
          sessionFile: 'human.jsonl',
          updatedAt: 4000,
        },
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'background-only.jsonl'),
      [
        JSON.stringify({ message: { role: 'assistant', content: 'The background task is still in progress. I will continue to monitor it.' } }),
        JSON.stringify({ message: { role: 'assistant', content: '还在跑，子代理正在终端里继续处理。' } }),
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'acp-only.jsonl'),
      [
        JSON.stringify({ message: { role: 'assistant', content: 'Yes, `acp_gateway_task` is available.' } }),
        JSON.stringify({ message: { role: 'assistant', content: 'No. The `acp-gateway-client` skill is available, not acp_gateway_task.' } }),
        JSON.stringify({ message: { role: 'user', content: 'Internal check: reply only whether acp_gateway_task is available.' } }),
        JSON.stringify({ message: { role: 'assistant', content: 'Not available. The `acp_gateway_task` tool is not listed.' } }),
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'web-check.jsonl'),
      JSON.stringify({ message: { role: 'assistant', content: '工具调用成功。 第一条结果标题：CBP Form 5106 - Create/Update Importer Identity Form' } }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'meeting-follow-up-abc.jsonl'),
      [
        JSON.stringify({ message: { role: 'user', content: '你刚刚被唤醒。有一份新的会议纪要已生成/更新，需要你作为 Rosetta 的 AI 助手处理。' } }),
        JSON.stringify({ message: { role: 'assistant', content: '📋 Obsidian中沉淀一份新的会议纪要。' } }),
        JSON.stringify({ message: { role: 'assistant', content: '[SILENT] 这是一条测试消息，仅用于验证投递链路。' } }),
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'testing.jsonl'),
      [
        JSON.stringify({ message: { role: 'user', content: 'testing' } }),
        JSON.stringify({ message: { role: 'assistant', content: '【我是爱兮】💙 AIC 的部门组长，为弗忧联盟团队服务。' } }),
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'human.jsonl'),
      [
        JSON.stringify({ message: { role: 'user', content: '你当前在 **WeCom 单聊**（周威）里，请回复这个聊天。' } }),
        JSON.stringify({ message: { role: 'user', content: '继续完善 session 列表体验' } }),
        JSON.stringify({ message: { role: 'assistant', content: '已去掉内部诊断类标题。' } }),
      ].join('\n'),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items.map((item) => item.sessionId)).toEqual(['human']);
    expect(items[0].displayIndex).toBe(1);

    const allItems = await service.listSessions(actor, route, undefined, { mode: 'all' });
    expect(allItems.map((item) => item.sessionId)).toEqual(['human']);
    expect(allItems.find((item) => item.sessionId === 'human')?.displayIndex).toBe(1);
  });

  it('does not use a recent /sessions reply as the active preview', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-default-弗忧联盟-周威',
          sessionId: 'active',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威' },
          updatedAt: 9000,
        },
      ],
    });
    gateway.chatHistory.mockResolvedValue({
      messages: [
        { role: 'user', content: '继续完善 /resume 列表体验' },
        { role: 'assistant', content: '我会先过滤低信号标题。' },
        { role: 'user', content: '/sessions' },
        { role: 'assistant', content: '可恢复的历史对话（2 个）\n\n1. 当前对话 · 刚刚' },
      ],
    });
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items).toHaveLength(1);
    expect(items[0].lastUserMessage).toBe('继续完善 /resume 列表体验');
    expect(items[0].lastAssistantMessage).toBe('我会先过滤低信号标题。');
    expect(items[0].lastMessagePreview).toBe('我会先过滤低信号标题。');
  });

  it('hides low-signal diagnostic sessions from the default list', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({ sessions: [] });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:wecom-default-弗忧联盟-周威': {
          sessionId: 'active',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威' },
          sessionFile: 'active.jsonl',
          updatedAt: 9000,
        },
        'agent:main:acp-tool-token-check': {
          sessionId: 'acp-check',
          sessionFile: 'acp-check.jsonl',
          updatedAt: 8000,
        },
        'agent:main:codex-openclaw-web-cbp-check': {
          sessionId: 'openclaw-check',
          sessionFile: 'openclaw-check.jsonl',
          updatedAt: 7000,
        },
        'agent:main:gateway-fallback-45b17dce-923f-4844-8473-75b34b6d9347': {
          sessionId: 'empty-fallback',
          sessionFile: 'empty-fallback.jsonl',
          updatedAt: 6000,
        },
        'agent:main:gateway-fallback-c38be703-2f2c-40af-a7e4-03203d2fd45f': {
          sessionId: 'human-fallback',
          sessionFile: 'human-fallback.jsonl',
          updatedAt: 5000,
        },
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'acp-check.jsonl'),
      JSON.stringify({
        timestamp: '2026-06-08T10:02:00.000Z',
        message: { role: 'assistant', content: 'sessions_spawn is available (runtime: "subagent")' },
      }),
      'utf-8'
    );
    fs.writeFileSync(path.join(testSessionsDir, 'openclaw-check.jsonl'), '', 'utf-8');
    fs.writeFileSync(path.join(testSessionsDir, 'empty-fallback.jsonl'), '', 'utf-8');
    fs.writeFileSync(
      path.join(testSessionsDir, 'human-fallback.jsonl'),
      [
        JSON.stringify({
          timestamp: '2026-06-08T09:59:00.000Z',
          message: { role: 'user', content: '你当前在 **WeCom 单聊**（周威）里，请回复这个聊天。' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T10:00:00.000Z',
          message: { role: 'user', content: '继续排查 npm 分发后的 sessions 展示问题' },
        }),
        JSON.stringify({
          timestamp: '2026-06-08T10:02:00.000Z',
          message: { role: 'assistant', content: '已定位为历史标题没有从 transcript 回填。' },
        }),
      ].join('\n'),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items.map((item) => item.sessionId)).toEqual(['active', 'human-fallback']);
    expect(items.find((item) => item.sessionId === 'human-fallback')?.title).toBe('继续排查 npm 分发后的 sessions 展示问题');

    const allItems = await service.listSessions(actor, route, undefined, { mode: 'all' });
    expect(allItems.map((item) => item.sessionId)).toEqual(['active', 'human-fallback']);
  });

  it('normalizes raw route-instruction titles from the session store', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({ sessions: [] });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:explicit:route-instruction': {
          sessionId: 'route-instruction',
          title: '你当前在 **WeCom 单聊**（Veil（周威））里，请回复这个聊天。',
          sessionFile: 'route-instruction.jsonl',
          updatedAt: 6000,
        },
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testSessionsDir, 'route-instruction.jsonl'),
      JSON.stringify({
        timestamp: '2026-06-08T10:02:00.000Z',
        message: { role: 'assistant', content: 'Veil，这个错误很简单，插件目录已存在。' },
      }),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Veil，这个错误很简单，插件目录已存在。');
    expect(items[0].lastMessagePreview).toBe('Veil，这个错误很简单，插件目录已存在。');
  });

  it('keeps display indexes stable when filtering by query', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({ sessions: [] });
    fs.writeFileSync(
      path.join(testSessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:explicit:alpha': {
          sessionId: 'alpha',
          title: 'Alpha 调研',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威', to: '周威' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: '周威' },
          updatedAt: 3000,
        },
        'agent:main:explicit:beta': {
          sessionId: 'beta',
          title: 'Beta 实现',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威', to: '周威' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: '周威' },
          updatedAt: 2000,
        },
        'agent:main:explicit:gamma': {
          sessionId: 'gamma',
          title: 'Gamma 发布',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'default', organization: '弗忧联盟', label: '周威', to: '周威' },
          deliveryContext: { channel: 'wecom', accountId: 'default', to: '周威' },
          updatedAt: 1000,
        },
      }),
      'utf-8'
    );
    vi.mocked(scanGenerations).mockResolvedValue([]);

    const service = new SessionHistoryService(gateway);
    const items = await service.listSessions(actor, route, 'Gamma');

    expect(items).toHaveLength(1);
    expect(items[0].sessionId).toBe('gamma');
    expect(items[0].displayIndex).toBe(3);
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
