import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanGenerations } from '../src/session-generation-scanner.js';
import type { RouteScope } from '../src/types.js';

function makeEvent(role: string, text: string, timestamp?: string) {
  return JSON.stringify({ type: 'message', message: { role, content: [{ type: 'text', text }] }, timestamp: timestamp || '2026-05-20T08:00:00.000Z' });
}

function makeEventWithStringContent(role: string, text: string, timestamp?: string) {
  return JSON.stringify({ type: 'message', message: { role, content: text }, timestamp: timestamp || '2026-05-20T08:00:00.000Z' });
}

describe('scanGenerations', () => {
  let tempDir: string;
  let originalSessionsDir: string | undefined;

  beforeEach(() => {
    originalSessionsDir = process.env.OPENCLAW_SESSIONS_DIR;
    tempDir = mkdtempSync(join(tmpdir(), 'oc-test-'));
    process.env.OPENCLAW_SESSIONS_DIR = join(tempDir, '.openclaw', 'agents', 'main', 'sessions');
  });

  afterEach(() => {
    process.env.OPENCLAW_SESSIONS_DIR = originalSessionsDir;
    rmSync(tempDir, { recursive: true, force: true });
  });

  function setupAgentDir() {
    const sessionsDir = join(tempDir, '.openclaw', 'agents', 'main', 'sessions');
    mkdirSync(sessionsDir, { recursive: true });
    return sessionsDir;
  }

  it('returns empty array when no reset files exist', async () => {
    setupAgentDir();
    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });
    expect(result).toEqual([]);
  });

  it('matches reset file containing expected label in metadata', async () => {
    const dir = setupAgentDir();
    const lines = [
      JSON.stringify({ type: 'session', id: 'hist1' }),
      makeEvent('user', 'Conversation info\n```json\n{\n  "sender_id": "Alice",\n  "label": "Alice"\n}\n```\nHello'),
      makeEvent('assistant', 'Hi there'),
    ];
    writeFileSync(join(dir, 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });

    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe('hist1');
    expect(result[0].title).toBe('Hello');
    expect(result[0].lastMessagePreview).toBe('Hi there');
    expect(result[0].lastUserMessage).toBe('Hello');
    expect(result[0].lastAssistantMessage).toBe('Hi there');
    expect(result[0].isCurrent).toBe(false);
  });

  it('ignores reset files that do not contain the label', async () => {
    const dir = setupAgentDir();
    writeFileSync(
      join(dir, 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z'),
      makeEvent('user', 'Hello from Bob')
    );

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });
    expect(result).toEqual([]);
  });

  it('ignores current session id', async () => {
    const dir = setupAgentDir();
    const lines = [
      makeEvent('user', 'Conversation info\n"label": "Alice"\nHello'),
    ];
    writeFileSync(join(dir, 's1.jsonl.reset.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });
    expect(result).toEqual([]);
  });

  it('includes deleted files', async () => {
    const dir = setupAgentDir();
    const lines = [
      makeEvent('user', 'Conversation info\n"label": "Alice"\nHello'),
    ];
    writeFileSync(join(dir, 'hist1.jsonl.deleted.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe('hist1');
  });

  it('includes orphaned .jsonl files (no reset suffix)', async () => {
    const dir = setupAgentDir();
    const text = 'Conversation info (untrusted metadata):\n```json\n{"label": "Alice"}\n```\n\nSender (untrusted metadata):\n```json\n{}\n```\n\nHello';
    const lines = [
      makeEvent('user', text),
      makeEvent('assistant', 'Hi'),
    ];
    writeFileSync(join(dir, 'orphan.jsonl'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe('orphan');
    expect(result[0].title).toBe('Hello');
  });

  it('uses activeTitle prefix when provided', async () => {
    const dir = setupAgentDir();
    const text = 'Conversation info (untrusted metadata):\n```json\n{"label": "Alice"}\n```\n\nSender (untrusted metadata):\n```json\n{}\n```\n\nHello';
    const lines = [
      makeEvent('user', text),
    ];
    writeFileSync(join(dir, 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k', activeTitle: 'Alice' });
    expect(result[0].title).toBe('Alice · Hello');
  });

  it('uses 历史 suffix when activeTitle equals titleSeed', async () => {
    const dir = setupAgentDir();
    const text = 'Conversation info (untrusted metadata):\n```json\n{"label": "Alice"}\n```\n\nSender (untrusted metadata):\n```json\n{}\n```\n\nAlice';
    const lines = [
      makeEvent('user', text),
    ];
    writeFileSync(join(dir, 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k', activeTitle: 'Alice' });
    expect(result[0].title).toBe('Alice · 历史');
  });

  it('matches exact label with full-width parentheses', async () => {
    const dir = setupAgentDir();
    const lines = [
      makeEvent('user', 'Conversation info\n"label": "Veil（周威）"\nHello'),
    ];
    writeFileSync(join(dir, 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Veil（周威）' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });

    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe('hist1');
  });

  it('does not cross-match half-width vs full-width parentheses labels', async () => {
    const dir = setupAgentDir();
    const lines = [
      makeEvent('user', 'Conversation info\n"label": "Veil(周威)"\nHello'),
    ];
    writeFileSync(join(dir, 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    // Request uses full-width parentheses — should NOT match half-width in file
    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Veil（周威）' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });

    expect(result).toHaveLength(0);
  });

  it('strips OpenClaw metadata envelope from user messages', async () => {
    const dir = setupAgentDir();
    // Real OpenClaw format: Conversation info block + Sender block, then real text
    const text = 'Conversation info (untrusted metadata):\n```json\n{"label": "Alice"}\n```\n\nSender (untrusted metadata):\n```json\n{}\n```\n\nReal message here';
    const lines = [
      makeEvent('user', text),
    ];
    writeFileSync(join(dir, 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });

    expect(result[0].title).toBe('Real message here');
  });

  it('handles string content (not array)', async () => {
    const dir = setupAgentDir();
    const lines = [
      makeEventWithStringContent('user', 'Conversation info (untrusted metadata):\n```json\n{"label": "Alice"}\n```\nHello'),
      makeEventWithStringContent('assistant', 'Hi'),
    ];
    writeFileSync(join(dir, 'hist1.jsonl.reset.2026-05-20T08-00-00.000Z'), lines.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Hello');
  });

  it('sorts results by updatedAt desc', async () => {
    const dir = setupAgentDir();
    const linesOld = [
      makeEvent('user', '"label": "Alice"\nOld', '2026-05-18T08:00:00.000Z'),
    ];
    const linesNew = [
      makeEvent('user', '"label": "Alice"\nNew', '2026-05-22T08:00:00.000Z'),
    ];
    writeFileSync(join(dir, 'old.jsonl.reset.2026-05-18T08-00-00.000Z'), linesOld.join('\n'));
    writeFileSync(join(dir, 'new.jsonl.reset.2026-05-22T08-00-00.000Z'), linesNew.join('\n'));

    const route: RouteScope = { provider: 'wecom', sessionKey: 'k', chatType: 'direct', label: 'Alice' };
    const result = await scanGenerations({ agentId: 'main', route, currentSessionId: 's1', currentSessionKey: 'k' });

    expect(result[0].sessionId).toBe('new');
    expect(result[1].sessionId).toBe('old');
  });
});
