import { describe, it, expect, vi } from 'vitest';
import { SessionHistoryService } from '../src/session-history-service.js';
import { GatewayClient } from '../src/gateway-client.js';
import { resolveActorScope } from '../src/actor-scope-resolver.js';
import { resolveRouteScope } from '../src/route-scope-resolver.js';
import type { ActorScope, RouteScope } from '../src/types.js';

vi.mock('../src/gateway-client.js', () => ({
  GatewayClient: vi.fn().mockImplementation(() => ({
    sessionsList: vi.fn(),
  })),
}));

const actorA: ActorScope = {
  provider: 'wecom',
  senderId: 'userA',
  accountId: 'acc1',
  organization: 'org1',
};

const actorB: ActorScope = {
  provider: 'wecom',
  senderId: 'userB',
  accountId: 'acc1',
  organization: 'org1',
};

const routeDirect: RouteScope = {
  provider: 'wecom',
  sessionKey: 'wecom-acc1-org1-Alice',
  chatType: 'direct',
  accountId: 'acc1',
  organization: 'org1',
};

const routeGroup: RouteScope = {
  provider: 'wecom',
  sessionKey: 'wecom-acc1-org1-TeamChat',
  chatType: 'group',
  accountId: 'acc1',
  organization: 'org1',
};

describe('Actor isolation', () => {
  it('fail-closed when senderId is missing', () => {
    const result = resolveActorScope({ provider: 'wecom' });
    expect(result).toBeNull();
  });

  it('returns different scopes for different senders', () => {
    const scopeA = resolveActorScope({
      provider: 'wecom',
      senderId: 'userA',
    });
    const scopeB = resolveActorScope({
      provider: 'wecom',
      senderId: 'userB',
    });
    expect(scopeA!.senderId).not.toBe(scopeB!.senderId);
  });
});

describe('Route isolation', () => {
  it('fail-closed when sessionKey is missing', () => {
    const result = resolveRouteScope({ provider: 'wecom', chatType: 'direct' });
    expect(result).toBeNull();
  });

  it('fail-closed when chatType is missing', () => {
    const result = resolveRouteScope({ provider: 'wecom', sessionKey: 'key' });
    expect(result).toBeNull();
  });

  it('direct and group routes do not mix', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-acc1-org1-Alice',
          sessionId: 's-direct',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'acc1', organization: 'org1' },
          updatedAt: 1000,
        },
        {
          key: 'agent:main:wecom-acc1-org1-TeamChat',
          sessionId: 's-group',
          chatType: 'group',
          origin: { provider: 'wecom', accountId: 'acc1', organization: 'org1' },
          updatedAt: 2000,
        },
      ],
    });

    const service = new SessionHistoryService(gateway);
    const directItems = await service.listSessions(actorA, routeDirect);
    const groupItems = await service.listSessions(actorA, routeGroup);

    expect(directItems).toHaveLength(1);
    expect(directItems[0].sessionId).toBe('s-direct');
    expect(groupItems).toHaveLength(1);
    expect(groupItems[0].sessionId).toBe('s-group');
  });

  it('different sessionKey does not leak sessions', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-acc1-org1-Alice',
          sessionId: 's1',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'acc1', organization: 'org1' },
          updatedAt: 1000,
        },
      ],
    });

    const service = new SessionHistoryService(gateway);
    const differentRoute: RouteScope = {
      ...routeDirect,
      sessionKey: 'wecom-acc1-org1-Bob',
    };
    const items = await service.listSessions(actorA, differentRoute);
    expect(items).toHaveLength(0);
  });

  it('different organization does not leak sessions', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-acc1-org1-Alice',
          sessionId: 's1',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'acc1', organization: 'org1' },
          updatedAt: 1000,
        },
      ],
    });

    const service = new SessionHistoryService(gateway);
    const differentRoute: RouteScope = {
      ...routeDirect,
      organization: 'org2',
    };
    const items = await service.listSessions(actorA, differentRoute);
    expect(items).toHaveLength(0);
  });

  it('actor-route account mismatch fails closed', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-acc1-org1-Alice',
          sessionId: 's1',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'acc1', organization: 'org1' },
          updatedAt: 1000,
        },
      ],
    });

    const service = new SessionHistoryService(gateway);
    const mismatchedActor = { ...actorA, accountId: 'acc2' };
    const items = await service.listSessions(mismatchedActor, routeDirect);
    expect(items).toHaveLength(0);
  });

  it('actor-route organization mismatch fails closed', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-acc1-org1-Alice',
          sessionId: 's1',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'acc1', organization: 'org1' },
          updatedAt: 1000,
        },
      ],
    });

    const service = new SessionHistoryService(gateway);
    const mismatchedActor = { ...actorA, organization: 'org2' };
    const items = await service.listSessions(mismatchedActor, routeDirect);
    expect(items).toHaveLength(0);
  });

  it('missing senderId fails closed', async () => {
    const gateway = new GatewayClient() as any;
    gateway.sessionsList.mockResolvedValue({
      sessions: [
        {
          key: 'agent:main:wecom-acc1-org1-Alice',
          sessionId: 's1',
          chatType: 'direct',
          origin: { provider: 'wecom', accountId: 'acc1', organization: 'org1' },
          updatedAt: 1000,
        },
      ],
    });

    const service = new SessionHistoryService(gateway);
    const emptyActor = { provider: 'wecom', senderId: '' };
    const items = await service.listSessions(emptyActor as any, routeDirect);
    expect(items).toHaveLength(0);
  });
});
