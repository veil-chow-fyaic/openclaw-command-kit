import type { ResumeListItem, SessionListDiagnostics } from './types.js';
export declare function formatSessionList(items: ResumeListItem[], _currentItem?: ResumeListItem, maxItems?: number): string;
export declare function formatResumeSuccess(item: ResumeListItem): string;
export declare function formatResumeHint(): string;
export declare function formatResumeHelp(): string;
export declare function formatSessionsRestoreBoundary(index: number): string;
export declare function formatResumeUsage(): string;
export declare function formatResumeDebug(diagnostics: SessionListDiagnostics): string;
export declare function formatError(error: 'actor' | 'route' | 'invalid_index' | 'route_mismatch' | 'readback_failure' | 'store_error', params?: {
    index?: number;
}): string;
//# sourceMappingURL=response-formatter.d.ts.map