// Core types for OpenClaw session command kit.
// Channel-agnostic. No WeCom-specific types here.

export interface ActorScope {
  provider: string;
  accountId?: string;
  organization?: string;
  senderId: string;
  senderDisplayName?: string;
}

export interface RouteScope {
  provider: string;
  accountId?: string;
  organization?: string;
  chatType: 'direct' | 'group' | 'thread' | 'unknown';
  sessionKey: string;
  label?: string;
  conversationId?: string;
  threadId?: string;
}

export interface ResumeListItem {
  displayIndex: number;
  sessionId: string;
  title: string;
  updatedAt: Date;
  lastMessagePreview: string;
  lastUserMessage?: string;
  lastAssistantMessage?: string;
  isCurrent: boolean;
  isRestorable: boolean;
  sessionFile?: string;
}

export interface SessionSummary {
  sessionId: string;
  title?: string;
  updatedAt: Date;
  generationCount: number;
  generations: GenerationSummary[];
}

export interface GenerationSummary {
  generationId: string;
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  lastMessagePreview?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredSessionId?: string;
  error?: 'invalid_index' | 'route_mismatch' | 'readback_failure' | 'store_error';
}

export interface CommandResult {
  handled: boolean;
  replyText?: string;
  error?: string;
}

export interface GatewaySessionOrigin {
  provider?: string;
  surface?: string;
  chatType?: string;
  from?: string;
  to?: string;
  accountId?: string;
  organization?: string;
  label?: string;
}

export interface GatewaySessionDeliveryContext {
  channel?: string;
  to?: string;
  accountId?: string;
  organization?: string;
}

export interface GatewaySession {
  id: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  key?: string;
  sessionKey?: string;
  sessionId?: string;
  displayName?: string;
  origin?: GatewaySessionOrigin;
  deliveryContext?: GatewaySessionDeliveryContext;
}

export interface GatewayChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface SessionCommandAdapter {
  resolveActorScope(msgCtx: unknown): ActorScope | null;
  resolveRouteScope(msgCtx: unknown): RouteScope | null;
  deliverReply(routeScope: RouteScope, text: string): Promise<void>;
  shouldIntercept?(rawText: string): boolean;
}
