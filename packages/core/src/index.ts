// Public API surface for @fyaic/openclaw-command-core

export type {
  ActorScope,
  RouteScope,
  ResumeListItem,
  SessionListOptions,
  SessionTrustSource,
  SessionHiddenReason,
  SessionHiddenSummary,
  SessionTrustSummary,
  SessionListDiagnostics,
  SessionListInspection,
  SessionSummary,
  GenerationSummary,
  RestoreResult,
  CommandResult,
  GatewaySession,
  GatewaySessionOrigin,
  GatewaySessionDeliveryContext,
  GatewayChatMessage,
  SessionCommandAdapter,
} from './types.js';

export { GatewayClient, GatewayError } from './gateway-client.js';
export type { SessionsListResult, ChatHistoryResult } from './gateway-client.js';
export { resolveActorScope } from './actor-scope-resolver.js';
export { resolveRouteScope } from './route-scope-resolver.js';
export { SessionHistoryService } from './session-history-service.js';
export { RestoreService } from './restore-service.js';
export {
  formatSessionList,
  formatResumeSuccess,
  formatResumeHint,
  formatResumeHelp,
  formatResumeUsage,
  formatResumeDebug,
  formatSessionsRestoreBoundary,
  formatError,
} from './response-formatter.js';
export { CommandRouter } from './command-router.js';
