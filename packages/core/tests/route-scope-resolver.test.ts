import { describe, it, expect } from 'vitest';
import { resolveRouteScope } from '../src/route-scope-resolver.js';

describe('resolveRouteScope', () => {
  it('returns RouteScope when sessionKey and chatType are present', () => {
    const result = resolveRouteScope({
      provider: 'wecom',
      sessionKey: 'key123',
      chatType: 'direct',
      accountId: 'acc1',
      organization: 'org1',
      label: 'Test Chat',
    });
    expect(result).not.toBeNull();
    expect(result!.sessionKey).toBe('key123');
    expect(result!.chatType).toBe('direct');
  });

  it('returns null when sessionKey is missing', () => {
    const result = resolveRouteScope({ provider: 'wecom', chatType: 'direct' });
    expect(result).toBeNull();
  });

  it('returns null when chatType is missing', () => {
    const result = resolveRouteScope({ provider: 'wecom', sessionKey: 'key' });
    expect(result).toBeNull();
  });

  it('normalizes single -> direct', () => {
    const result = resolveRouteScope({ provider: 'wecom', sessionKey: 'key', chatType: 'single' });
    expect(result!.chatType).toBe('direct');
  });

  it('normalizes chatroom -> group', () => {
    const result = resolveRouteScope({ provider: 'wecom', sessionKey: 'key', chatType: 'chatroom' });
    expect(result!.chatType).toBe('group');
  });

  it('normalizes private -> direct', () => {
    const result = resolveRouteScope({ provider: 'wecom', sessionKey: 'key', chatType: 'private' });
    expect(result!.chatType).toBe('direct');
  });

  it('trims sessionKey', () => {
    const result = resolveRouteScope({ provider: 'wecom', sessionKey: '  key  ', chatType: 'direct' });
    expect(result!.sessionKey).toBe('key');
  });
});
