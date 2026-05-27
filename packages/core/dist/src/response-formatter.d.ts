import type { ResumeListItem } from './types.js';
export declare function formatSessionList(items: ResumeListItem[], currentItem?: ResumeListItem, maxItems?: number): string;
export declare function formatResumeSuccess(item: ResumeListItem): string;
export declare function formatError(error: 'actor' | 'route' | 'invalid_index' | 'route_mismatch' | 'readback_failure' | 'store_error'): string;
//# sourceMappingURL=response-formatter.d.ts.map