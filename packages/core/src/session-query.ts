import type { ResumeListItem } from './types.js';

export function filterSessionsByQuery(
  items: ResumeListItem[],
  query?: string
): ResumeListItem[] {
  const normalizedQuery = normalizeSessionQuery(query);
  if (!normalizedQuery) return items;

  const queryTerms = normalizedQuery.split(' ').filter(Boolean);
  return items.filter((item) => {
    const haystack = buildSearchText(item);
    return (
      haystack.includes(normalizedQuery) ||
      queryTerms.every((term) => haystack.includes(term))
    );
  });
}

export function normalizeSessionQuery(query?: string): string {
  return (query ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('zh-CN');
}

function buildSearchText(item: ResumeListItem): string {
  return [
    item.title,
    item.lastMessagePreview,
    item.lastUserMessage,
    item.lastAssistantMessage,
    ...formatDateSearchLabels(item.updatedAt),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeSessionQuery(value))
    .join('\n');
}

function formatDateSearchLabels(date: Date): string[] {
  if (Number.isNaN(date.getTime())) return [];

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    date.toISOString(),
    `${year}-${pad(month)}-${pad(day)}`,
    `${year}/${pad(month)}/${pad(day)}`,
    `${month}月${day}日`,
    `${pad(hours)}:${pad(minutes)}`,
  ];
}
