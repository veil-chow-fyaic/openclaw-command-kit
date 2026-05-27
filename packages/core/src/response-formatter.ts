// Format chat-friendly Chinese reply text.

import type { ResumeListItem } from './types.js';

export function formatSessionList(
  items: ResumeListItem[],
  currentItem?: ResumeListItem,
  maxItems = 10
): string {
  if (items.length === 0) {
    return '当前聊天还没有可恢复的历史对话。';
  }

  let lines: string[] = ['可恢复的历史对话'];
  lines.push('');

  if (currentItem) {
    lines.push(`当前：${currentItem.title} · ${formatRelativeTime(currentItem.updatedAt)}`);
    lines.push('');
  }

  const displayItems = items.slice(0, maxItems);
  for (const item of displayItems) {
    const timeStr = formatDateTime(item.updatedAt);
    const preview = item.lastMessagePreview
      ? truncate(item.lastMessagePreview, 40)
      : '';
    lines.push(`${item.displayIndex}. ${item.title}`);
    if (preview) {
      lines.push(`   ${preview} · ${timeStr}`);
    } else {
      lines.push(`   ${timeStr}`);
    }
  }

  if (items.length > maxItems) {
    lines.push(`   … 还有 ${items.length - maxItems} 个历史对话`);
  }

  return lines.join('\n');
}

export function formatResumeSuccess(item: ResumeListItem): string {
  const parts: string[] = ['已切换到历史对话', ''];
  parts.push(`对话：${item.title}`);
  parts.push(`时间：${formatDateTime(item.updatedAt)}`);

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

export function formatError(error: 'actor' | 'route' | 'invalid_index' | 'route_mismatch' | 'readback_failure' | 'store_error'): string {
  switch (error) {
    case 'actor':
      return '无法确认当前用户身份，已拒绝查看历史对话。';
    case 'route':
      return '无法确认当前聊天范围，已拒绝查看历史对话。';
    case 'invalid_index':
      return '没有第 N 个对话。请发送 /sessions 查看可选项。';
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

function formatDateTime(d: Date): string {
  return d.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return formatDateTime(d);
}

function truncate(text: string, maxLen: number): string {
  const cleaned = text.replace(/\r?\n/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + '…';
}
