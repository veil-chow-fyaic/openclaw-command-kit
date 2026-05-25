// Validate ActorScope; fail-closed.

import type { ActorScope } from './types.js';

export interface ActorScopeInput {
  provider: string;
  senderId?: string;
  senderDisplayName?: string;
  accountId?: string;
  organization?: string;
}

export function resolveActorScope(input: ActorScopeInput): ActorScope | null {
  if (!input.senderId || input.senderId.trim().length === 0) {
    return null;
  }
  return {
    provider: input.provider,
    senderId: input.senderId.trim(),
    senderDisplayName: input.senderDisplayName,
    accountId: input.accountId,
    organization: input.organization,
  };
}
