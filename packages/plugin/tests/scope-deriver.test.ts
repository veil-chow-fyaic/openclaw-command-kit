import { describe, it, expect, vi } from 'vitest';
import { deriveScopes } from '../src/scope-deriver.js';
import { GatewayClient } from '@openclaw-commands/core';

function mockGateway(sessions: any[]) {
  return {
    sessionsList: vi.fn().mockResolvedValue({ sessions }),
  } as unknown as GatewayClient;
}

describe('deriveScopes', () => {
  it('returns null when senderId is missing', async () => {
    const gateway = mockGateway([]);
    const result = await deriveScopes(
      { channel: 'wecom', to: 'Alice', senderId: '' },
      gateway
    );
    expect(result).toBeNull();
  });

  it('returns null when to is missing', async () => {
    const gateway = mockGateway([]);
    const result = await deriveScopes(
      { channel: 'wecom', senderId: 'userA' },
      gateway
    );
    expect(result).toBeNull();
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

    expect(result).not.toBeNull();
    expect(result!.actor.provider).toBe('wecom');
    expect(result!.actor.senderId).toBe('userA');
    expect(result!.route.sessionKey).toBe('wecom-default-org1-alice');
    expect(result!.route.chatType).toBe('direct');
    expect(result!.route.organization).toBe('org1');
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

    expect(result).not.toBeNull();
    expect(result!.route.chatType).toBe('group');
  });

  it('returns null when no session matches deliveryContext', async () => {
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

    expect(result).toBeNull();
  });

  it('returns null for unsupported channels', async () => {
    const gateway = mockGateway([
      {
        deliveryContext: { channel: 'telegram', to: 'telegram:12345' },
        origin: { provider: 'telegram', chatType: 'direct' },
      },
    ]);

    const result = await deriveScopes(
      { channel: 'telegram', senderId: 'userA', to: 'telegram:12345' },
      gateway
    );

    expect(result).toBeNull();
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

    expect(result).not.toBeNull();
    expect(result!.route.sessionKey).toBe('wecom-default-org1-alice');
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

    expect(result).not.toBeNull();
    expect(result!.route.threadId).toBe('42');
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

    expect(result).not.toBeNull();
    expect(result!.route.sessionKey).toBe('wecom-default-org1-veil');
  });
});
