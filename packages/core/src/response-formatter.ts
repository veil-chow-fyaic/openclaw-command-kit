// Format chat-friendly Chinese reply text.

import type { ResumeListItem } from './types.js';

export function formatSessionList(
  items: ResumeListItem[],
  _currentItem?: ResumeListItem,
  maxItems = 10
): string {
  if (items.length === 0) {
    return '当前聊天还没有可恢复的历史对话。';
  }

  const shownCount = Math.min(items.length, maxItems);
  const header =
    items.length > maxItems
      ? `最近可恢复的历史对话（显示 ${shownCount} / 共 ${items.length} 个）`
      : `可恢复的历史对话（${items.length} 个）`;
  let lines: string[] = [header];
  lines.push('');

  const displayItems = items.slice(0, maxItems);
  for (const item of displayItems) {
    const timeStr = formatSmartTime(item.updatedAt);
    const preview = item.lastMessagePreview
      ? truncate(item.lastMessagePreview, 40)
      : '';
    const title = item.isCurrent ? '当前对话' : item.title;
    lines.push(`${item.displayIndex}. ${title} · ${timeStr}`);
    if (preview) {
      lines.push(`   ${preview}`);
    }
  }

  if (hasNonSequentialIndexes(displayItems)) {
    lines.push('   （编号按完整候选列表保留，可发送 /resume all 查看上下文）');
  }

  if (items.length > maxItems) {
    lines.push(`   … 还有 ${items.length - maxItems} 个，可发送 /sessions 关键词 搜索`);
  }

  return lines.join('\n');
}

export function formatResumeSuccess(item: ResumeListItem): string {
  const parts: string[] = ['已切换到历史对话', ''];
  parts.push(`对话：${item.title}`);
  parts.push(`时间：${formatSmartTime(item.updatedAt)}`);

  if (item.lastUserMessage || item.lastAssistantMessage) {
    parts.push('');
    parts.push('最近聊到了：');
    if (item.lastUserMessage) {
      parts.push(`你：${truncate(item.lastUserMessage, 60)}`);
    }
    if (item.lastAssistantMessage) {
      parts.push(`OpenClaw：${truncate(item.lastAssistantMessage, 60)}`);
    }
  } else if (item.lastMessagePreview) {
    parts.push(`摘要：${truncate(item.lastMessagePreview, 60)}`);
  }

  parts.push('');
  parts.push('后续消息将进入这个上下文。');

  return parts.join('\n');
}

export function formatResumeHint(): string {
  return '发送 /resume 序号 继续；/resume help 查看用法。';
}

export function formatResumeHelp(): string {
  return [
    '历史对话命令',
    '',
    '/resume - 查看当前聊天可恢复的历史对话',
    '/resume 序号 - 继续对应历史对话',
    '/resume 关键词 - 搜索历史对话',
    '/resume all - 查看完整候选列表',
    '/resume help - 查看本帮助',
    '',
    '/sessions 是查看历史的别名：',
    '/sessions - 等同 /resume',
    '/sessions 关键词 - 等同 /resume 关键词',
    '/sessions all - 等同 /resume all',
    '',
    '注意：恢复对话只使用 /resume 序号。/sessions 只用于查看和搜索。',
  ].join('\n');
}

export function formatSessionsRestoreBoundary(index: number): string {
  return `/sessions 只用于查看和搜索。要继续第 ${index} 个对话，请发送 /resume ${index}。`;
}

export function formatResumeUsage(): string {
  return '用法：/resume、/resume 序号、/resume 关键词、/resume all、/resume help';
}

export function formatError(
  error: 'actor' | 'route' | 'invalid_index' | 'route_mismatch' | 'readback_failure' | 'store_error',
  params?: { index?: number }
): string {
  switch (error) {
    case 'actor':
      return '无法确认当前用户身份，已拒绝查看历史对话。';
    case 'route':
      return '无法确认当前聊天范围，已拒绝查看历史对话。';
    case 'invalid_index':
      return `没有第 ${params?.index ?? 'N'} 个对话。请发送 /sessions 查看可选项。`;
    case 'route_mismatch':
      return '这个对话不属于当前聊天，已拒绝切换。';
    case 'readback_failure':
      return 'OpenClaw 未确认切换完成，后续消息不会被标记为已切换。';
    case 'store_error':
      return '操作失败，请稍后重试。';
    default:
      return '操作失败，请稍后重试。';
  }
}

function formatSmartTime(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  const timeStr = d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return `昨天 ${timeStr}`;
  if (days < 7) return `${days} 天前 ${timeStr}`;
  return d.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string, maxLen: number): string {
  const cleaned = text.replace(/\r?\n/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + '…';
}

function hasNonSequentialIndexes(items: ResumeListItem[]): boolean {
  if (items.length === 0) return false;
  if (items[0].displayIndex !== 1) return true;
  return items.some((item, idx) => idx > 0 && item.displayIndex !== items[idx - 1].displayIndex + 1);
}
