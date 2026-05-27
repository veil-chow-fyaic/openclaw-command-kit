import { describe, it, expect } from 'vitest';
import {
  formatCommandsList,
  formatSessionList,
  formatResumeSuccess,
  formatError,
} from '../src/response-formatter.js';
import type { ResumeListItem } from '../src/types.js';

function makeItem(overrides: Partial<ResumeListItem> = {}): ResumeListItem {
  return {
    displayIndex: 1,
    sessionId: 's1',
    title: 'Test',
    updatedAt: new Date('2026-05-21T19:31:00'),
    lastMessagePreview: '',
    isCurrent: false,
    isRestorable: true,
    ...overrides,
  };
}

describe('formatCommandsList', () => {
  it('lists available commands and usage examples', () => {
    const text = formatCommandsList();
    expect(text).toContain('可用命令');
    expect(text).toContain('/commands');
    expect(text).toContain('/sessions');
    expect(text).toContain('/resume');
    expect(text).toContain('/resume N');
    expect(text).toContain('用法：/resume 2');
  });

  it('does not expose route or session identifiers', () => {
    const text = formatCommandsList();
    expect(text).not.toContain('session-');
    expect(text).not.toContain('sessionKey');
    expect(text).not.toContain('accountId');
  });
});

describe('formatSessionList', () => {
  it('returns empty message for empty list', () => {
    const text = formatSessionList([]);
    expect(text).toBe('当前聊天还没有可恢复的历史对话。');
  });

  it('formats list with preview and time on second line', () => {
    const items = [
      makeItem({ displayIndex: 1, title: '腾讯文档发布不了', updatedAt: new Date('2026-05-23T09:36:00'), lastMessagePreview: 'gog 的 OAuth token 过期了' }),
      makeItem({ displayIndex: 2, title: 'B端切换验收', updatedAt: new Date('2026-05-21T19:31:00') }),
    ];
    const text = formatSessionList(items);
    expect(text).toContain('可恢复的历史对话');
    expect(text).toContain('1. 腾讯文档发布不了');
    expect(text).toContain('gog 的 OAuth token 过期了');
    expect(text).toContain('2. B端切换验收');
    // Should NOT contain hint (hint is added by caller now)
    expect(text).not.toContain('发送 /resume');
  });

  it('truncates long preview', () => {
    const longPreview = 'a'.repeat(100);
    const items = [makeItem({ displayIndex: 1, title: '长摘要测试', lastMessagePreview: longPreview })];
    const text = formatSessionList(items);
    expect(text).toContain('…');
    expect(text).not.toContain('a'.repeat(50));
  });

  it('does not expose raw sessionId', () => {
    const items = [makeItem({ sessionId: 'secret-uuid-1234' })];
    const text = formatSessionList(items);
    expect(text).not.toContain('secret-uuid');
  });
});

describe('formatResumeSuccess', () => {
  it('includes title, date and last messages', () => {
    const text = formatResumeSuccess(makeItem({
      title: 'B端切换验收',
      lastUserMessage: 'testing-b 这个分支测试怎么样',
      lastAssistantMessage: '收到，测试正常',
    }));
    expect(text).toContain('已切换到历史对话');
    expect(text).toContain('B端切换验收');
    expect(text).toContain('最近聊到了');
    expect(text).toContain('你：testing-b 这个分支测试怎么样');
    expect(text).toContain('OpenClaw：收到，测试正常');
    expect(text).toContain('后续消息将进入这个上下文');
  });

  it('falls back to summary preview when no last messages', () => {
    const text = formatResumeSuccess(makeItem({
      title: 'B端切换验收',
      lastMessagePreview: '收到，测试正常',
    }));
    expect(text).toContain('摘要：收到，测试正常');
    expect(text).not.toContain('最近聊到了');
  });
});

describe('formatError', () => {
  it.each([
    ['actor', '无法确认当前用户身份'],
    ['route', '无法确认当前聊天范围'],
    ['invalid_index', '没有第 N 个对话'],
    ['route_mismatch', '已拒绝切换'],
    ['readback_failure', '未确认切换完成'],
  ] as const)('error=%s contains expected text', (code, snippet) => {
    expect(formatError(code)).toContain(snippet);
  });
});
