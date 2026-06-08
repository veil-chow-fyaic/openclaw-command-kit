import { describe, it, expect, vi } from 'vitest';
import { deriveScopes } from '../src/scope-deriver.js';
import { GatewayClient } from '@fyaic/core';
import type { ActorScope, RouteScope } from '@fyaic/core';

function mockGateway(sessions: any[]) {
  return {
    sessionsList: vi.fn().mockResolvedValue({ sessions }),
  } as unknown as GatewayClient;
}

function expectSuccess(result: Awaited<ReturnType<typeof deriveScopes>>): asserts result is {
  actor: ActorScope;
  route: RouteScope;
} {
  expect('actor' in result).toBe(true);
}

describe('deriveScopes', () => {
  it('returns actor failure when senderId is missing', async () => {
    const gateway = mockGateway([]);
    const result = await deriveScopes(
      { channel: 'wecom', to: 'Alice', senderId: '' },
      gateway
    );
    expect(result).toEqual({ reason: 'actor' });
  });

  it('returns route failure when to is missing', async () => {
    const gateway = mockGateway([]);
    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA' },
      gateway
    );
    expect(result).toEqual({ reason: 'route' });
  });

  it('derives WeCom scopes from matching session', async () => {
    const gateway = mockGateway([
      {
        key: 'agent:main:wecom-default-org1-Alice',
        deliveryContext: {
          channel: 'wecom',
          to: 'Alice',
          accountId: 'default',
          organization: 'org1',
        },
        origin: {
          provider: 'wecom',
          chatType: 'direct',
          accountId: 'default',
          organization: 'org1',
        },
      },
    ]);

    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA', to: 'Alice', accountId: 'default' },
      gateway
    );

    expectSuccess(result);
    expect(result.actor.provider).toBe('wecom');
    expect(result.actor.senderId).toBe('userA');
    expect(result.route.sessionKey).toBe('wecom-default-org1-alice');
    expect(result.route.chatType).toBe('direct');
    expect(result.route.organization).toBe('org1');
  });

  it('uses newest matching delivery route when multiple sessionKey variants exist', async () => {
    const gateway = mockGateway([
      {
        key: 'agent:main:wecom-default-弗忧联盟-veil（周威）',
        sessionId: 'older',
        deliveryContext: {
          channel: 'wecom',
          to: 'Veil（周威）',
          accountId: 'default',
        },
        origin: {
          provider: 'wecom',
          chatType: 'direct',
          accountId: 'default',
          organization: '弗忧联盟',
          to: 'Veil（周威）',
        },
        updatedAt: 1000,
      },
      {
        key: 'agent:main:wecom-default-veil（周威）',
        sessionId: 'newer',
        deliveryContext: {
          channel: 'wecom',
          to: 'Veil（周威）',
          accountId: 'default',
        },
        origin: {
          provider: 'wecom',
          chatType: 'direct',
          accountId: 'default',
          to: 'Veil（周威）',
        },
        updatedAt: 3000,
      },
    ]);

    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA', to: 'Veil（周威）', accountId: 'default' },
      gateway
    );

    expectSuccess(result);
    expect(result.route.sessionKey).toBe('wecom-default-veil（周威）');
    expect(result.route.organization).toBeUndefined();
  });

  it('derives group chat type correctly', async () => {
    const gateway = mockGateway([
      {
        key: 'agent:main:wecom-default-org1-TeamChat',
        deliveryContext: {
          channel: 'wecom',
          to: 'TeamChat',
          accountId: 'default',
          organization: 'org1',
        },
        origin: {
          provider: 'wecom',
          chatType: 'group',
          accountId: 'default',
          organization: 'org1',
        },
      },
    ]);

    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA', to: 'TeamChat', accountId: 'default' },
      gateway
    );

    expectSuccess(result);
    expect(result.route.chatType).toBe('group');
  });

  it('returns route failure when no session matches deliveryContext', async () => {
    const gateway = mockGateway([
      {
        deliveryContext: { channel: 'wecom', to: 'Bob', accountId: 'default' },
        origin: { provider: 'wecom', chatType: 'direct' },
      },
    ]);

    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA', to: 'Alice', accountId: 'default' },
      gateway
    );

    expect(result).toEqual({ reason: 'route' });
  });

  it('derives scopes for non-WeCom channels when delivery metadata matches', async () => {
    const gateway = mockGateway([
      {
        key: 'agent:main:telegram-default-12345',
        deliveryContext: { channel: 'telegram', to: 'telegram:12345' },
        origin: { provider: 'telegram', chatType: 'direct' },
      },
    ]);

    const result = await deriveScopes(
      { channel: 'telegram', senderId: 'userA', to: 'telegram:12345' },
      gateway
    );

    expectSuccess(result);
    expect(result.actor.provider).toBe('telegram');
    expect(result.route.sessionKey).toBe('telegram-default-12345');
  });

  it('handles missing accountId gracefully', async () => {
    const gateway = mockGateway([
      {
        key: 'agent:main:wecom-default-org1-Alice',
        deliveryContext: {
          channel: 'wecom',
          to: 'Alice',
          accountId: 'default',
          organization: 'org1',
        },
        origin: {
          provider: 'wecom',
          chatType: 'direct',
          accountId: 'default',
          organization: 'org1',
        },
      },
    ]);

    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA', to: 'Alice' },
      gateway
    );

    expectSuccess(result);
    expect(result.route.sessionKey).toBe('wecom-default-org1-alice');
  });

  it('converts messageThreadId to string', async () => {
    const gateway = mockGateway([
      {
        key: 'agent:main:wecom-default-org1-Alice',
        deliveryContext: {
          channel: 'wecom',
          to: 'Alice',
          accountId: 'default',
          organization: 'org1',
        },
        origin: {
          provider: 'wecom',
          chatType: 'direct',
          accountId: 'default',
          organization: 'org1',
        },
      },
    ]);

    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA', to: 'Alice', accountId: 'default', messageThreadId: 42 },
      gateway
    );

    expectSuccess(result);
    expect(result.route.threadId).toBe('42');
  });

  it('lower-cases chatLabel in sessionKey to match OpenClaw storage format', async () => {
    // OpenClaw stores session keys with lower-cased labels (e.g. "veil"),
    // but PluginCommandContext.to preserves original casing (e.g. "Veil").
    const gateway = mockGateway([
      {
        key: 'agent:main:wecom-default-org1-veil',
        deliveryContext: {
          channel: 'wecom',
          to: 'Veil',
          accountId: 'default',
          organization: 'org1',
        },
        origin: {
          provider: 'wecom',
          chatType: 'direct',
          accountId: 'default',
          organization: 'org1',
        },
      },
    ]);

    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA', to: 'Veil', accountId: 'default' },
      gateway
    );

    expectSuccess(result);
    expect(result.route.sessionKey).toBe('wecom-default-org1-veil');
  });
});
