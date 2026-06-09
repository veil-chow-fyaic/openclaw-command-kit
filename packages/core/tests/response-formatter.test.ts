import { describe, it, expect } from 'vitest';
import {
  formatSessionList,
  formatResumeSuccess,
  formatResumeHint,
  formatResumeHelp,
  formatResumeUsage,
  formatSessionsRestoreBoundary,
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
    expect(text).toContain('可恢复的历史对话（2 个）');
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

  it('marks current item inline instead of duplicating a current header', () => {
    const items = [
      makeItem({ displayIndex: 1, title: 'Veil（周威）', isCurrent: true, lastMessagePreview: '最近在排查 session 列表' }),
      makeItem({ displayIndex: 2, title: '历史排查', isCurrent: false }),
    ];
    const text = formatSessionList(items, items[0]);
    expect(text).toContain('1. 当前对话');
    expect(text).toContain('最近在排查 session 列表');
    expect(text).toContain('2. 历史排查');
    expect(text).not.toContain('当前：');
  });

  it('shows visible count and search hint when the list overflows', () => {
    const items = Array.from({ length: 12 }, (_, idx) =>
      makeItem({
        displayIndex: idx + 1,
        sessionId: `s${idx + 1}`,
        title: `对话 ${idx + 1}`,
      })
    );
    const text = formatSessionList(items);
    expect(text).toContain('最近可恢复的历史对话（显示 10 / 共 12 个）');
    expect(text).toContain('… 还有 2 个，可发送 /sessions 关键词 搜索');
  });

  it('explains preserved indexes when the visible list is not sequential', () => {
    const text = formatSessionList([
      makeItem({ displayIndex: 8, title: 'Auth0 调研' }),
    ]);

    expect(text).toContain('8. Auth0 调研');
    expect(text).toContain('编号按完整候选列表保留');
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

describe('formatResumeHint', () => {
  it('returns the complete resume hint without test markers', () => {
    const text = formatResumeHint();
    expect(text).toBe('发送 /resume 序号 继续；/resume help 查看用法。');
    expect(text).not.toContain('【OCK】');
  });
});

describe('resume command helper text', () => {
  it('documents canonical resume commands and sessions boundaries', () => {
    const text = formatResumeHelp();
    expect(text).toContain('/resume 序号');
    expect(text).toContain('/resume 关键词');
    expect(text).toContain('/resume all');
    expect(text).toContain('/sessions 是查看历史的别名');
    expect(text).toContain('/sessions 只用于查看和搜索');
  });

  it('explains numeric sessions arguments without restoring', () => {
    expect(formatSessionsRestoreBoundary(2)).toBe('/sessions 只用于查看和搜索。要继续第 2 个对话，请发送 /resume 2。');
  });

  it('formats compact resume usage', () => {
    expect(formatResumeUsage()).toContain('/resume help');
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
