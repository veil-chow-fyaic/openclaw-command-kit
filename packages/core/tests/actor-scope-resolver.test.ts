import { describe, it, expect } from 'vitest';
import { resolveActorScope } from '../src/actor-scope-resolver.js';

describe('resolveActorScope', () => {
  it('returns ActorScope when senderId is present', () => {
    const result = resolveActorScope({
      provider: 'wecom',
      senderId: 'user123',
      senderDisplayName: 'Alice',
      accountId: 'acc1',
      organization: 'org1',
    });
    expect(result).not.toBeNull();
    expect(result!.senderId).toBe('user123');
    expect(result!.provider).toBe('wecom');
    expect(result!.senderDisplayName).toBe('Alice');
  });

  it('returns null when senderId is missing', () => {
    const result = resolveActorScope({ provider: 'wecom' });
    expect(result).toBeNull();
  });

  it('returns null when senderId is empty string', () => {
    const result = resolveActorScope({ provider: 'wecom', senderId: '' });
    expect(result).toBeNull();
  });

  it('returns null when senderId is whitespace only', () => {
    const result = resolveActorScope({ provider: 'wecom', senderId: '   ' });
    expect(result).toBeNull();
  });

  it('trims senderId', () => {
    const result = resolveActorScope({ provider: 'wecom', senderId: '  user  ' });
    expect(result!.senderId).toBe('user');
  });
});
