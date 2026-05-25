// Scan local OpenClaw session transcript backups (.reset. files) to discover
// historical generations for a given route. This mirrors the behavior of the
// Python session-bridge's _expand_session_generations / _summarize_generation_file.

import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { RouteScope } from './types.js';

export interface GenerationInfo {
  sessionId: string;
  sessionFile: string;
  title: string;
  updatedAt: Date;
  lastMessagePreview: string;
  isCurrent: boolean;
  isRestorable: boolean;
}

export interface ScanOptions {
  agentId: string;
  route: RouteScope;
  currentSessionId: string;
  currentSessionKey: string;
  maxScanLinesPerFile?: number;
  activeTitle?: string;
}

export async function scanGenerations(options: ScanOptions): Promise<GenerationInfo[]> {
  const { agentId, route, currentSessionId, maxScanLinesPerFile = 500, activeTitle } = options;
  const sessionsDir = join(process.env.HOME || process.env.USERPROFILE || '', '.openclaw', 'agents', agentId, 'sessions');

  let entries: string[];
  try {
    entries = await readdir(sessionsDir);
  } catch {
    return [];
  }

  // Mirror the Python session-bridge: scan all .jsonl* transcript files,
  // including orphaned .jsonl (non-current active) and .deleted. backups.
  // Exclude plain .json config files (e.g. sessions.json).
  const candidateFiles = entries.filter((name) => name.includes('.jsonl') && !name.endsWith('.json'));

  // Process files in parallel batches to keep I/O concurrency bounded.
  const concurrency = 10;
  const results: GenerationInfo[] = [];

  for (let i = 0; i < candidateFiles.length; i += concurrency) {
    const batch = candidateFiles.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((fileName) =>
        summarizeGenerationFile(
          join(sessionsDir, fileName),
          route,
          currentSessionId,
          maxScanLinesPerFile,
          activeTitle
        )
      )
    );
    for (const info of batchResults) {
      if (info) results.push(info);
    }
  }

  return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

async function summarizeGenerationFile(
  filePath: string,
  route: RouteScope,
  currentSessionId: string,
  maxScanLines: number,
  activeTitle?: string
): Promise<GenerationInfo | null> {
  const fileName = filePath.split(/[\\/]/).pop() || '';
  const sessionId = fileName.split('.jsonl')[0];
  if (!sessionId || sessionId === currentSessionId) {
    return null;
  }

  const expectedLabel = (route.label || '').trim();
  if (!expectedLabel) {
    return null;
  }

  let matchedLabel = false;
  const messages: Array<{ role: string; text: string; timestamp?: string }> = [];
  let lineCount = 0;

  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const line of rl) {
      lineCount++;
      if (lineCount > maxScanLines && matchedLabel) {
        // Once we know the file belongs to this route, we can stop scanning
        // early. The messages we care about for preview are usually near the
        // end, but for MVP we accept the subset we already collected.
        break;
      }

      let event: unknown;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (!isRecord(event)) continue;
      const msg = event.message;
      if (!isRecord(msg)) continue;

      const text = extractTextContent(msg.content);
      if (typeof text === 'string' && text.length > 0) {
        if (!matchedLabel && generationTextMatchesLabel(text, expectedLabel)) {
          matchedLabel = true;
        }

        const role = String(msg.role || '');
        if ((role === 'user' || role === 'assistant') && lineCount <= maxScanLines) {
          const cleaned = cleanMessageText(text, role);
          if (cleaned) {
            messages.push({
              role,
              text: cleaned,
              timestamp: String(event.timestamp || msg.timestamp || ''),
            });
          }
        }
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  if (!matchedLabel) {
    return null;
  }

  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  const lastUser = userMessages[userMessages.length - 1]?.text || '';
  const lastAssistant = assistantMessages[assistantMessages.length - 1]?.text || '';
  const lastPreview = lastAssistant || lastUser;

  const titleSeed = userMessages[userMessages.length - 1]?.text || '';
  let title: string;
  if (activeTitle) {
    const suffix = titleSeed && titleSeed !== activeTitle ? titleSeed : '历史';
    title = `${activeTitle} · ${suffix}`;
  } else {
    title = titleSeed || '未命名对话';
  }

  // Derive updatedAt from the last message timestamp or file mtime
  let updatedAt: Date;
  const lastTimestamp = messages[messages.length - 1]?.timestamp;
  if (lastTimestamp) {
    const parsed = Date.parse(lastTimestamp);
    updatedAt = isNaN(parsed) ? await fileMtime(filePath) : new Date(parsed);
  } else {
    updatedAt = await fileMtime(filePath);
  }

  return {
    sessionId,
    sessionFile: fileName,
    title,
    updatedAt,
    lastMessagePreview: lastPreview,
    isCurrent: false,
    isRestorable: true,
  };
}

function generationTextMatchesLabel(text: string, expectedLabel: string): boolean {
  // 1. Exact JSON-field patterns (same as Python bridge)
  const patterns = [
    `"label": "${expectedLabel}"`,
    `"sender": "${expectedLabel}"`,
    `"sender_id": "${expectedLabel}"`,
  ];
  for (const p of patterns) {
    if (text.includes(p)) return true;
  }

  // 2. Extract JSON field values and compare normalized.
  //    NOTE: we intentionally do NOT strip parentheses here.
  //    "Veil(周威)" and "Veil（周威）" are distinct labels belonging to
  //    different routes (different organizations). Stripping them causes
  //    cross-route pollution. We only normalize case and whitespace.
  const normalizedExpected = normalizeForMatch(expectedLabel);
  const regex = /"(?:label|sender|sender_id)":\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (normalizeForMatch(m[1]) === normalizedExpected) {
      return true;
    }
  }

  return false;
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ''); // remove whitespace only
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  const parts: string[] = [];
  for (const item of content) {
    if (isRecord(item) && item.type === 'text' && typeof item.text === 'string') {
      parts.push(item.text);
    }
  }
  return parts.join('\n');
}

function cleanMessageText(text: string, role: string): string {
  let value = text.trim();
  if (role === 'user') {
    // Strip the OpenClaw metadata envelope that precedes the real user message.
    // OpenClaw prepends 1-2 JSON metadata blocks wrapped in ``` before the
    // actual user text. We remove them by splitting on ``` and discarding the
    // leading metadata segments.
    if (value.includes('```')) {
      const parts = value.split('```');
      // Typical envelope: Conversation info + Sender metadata = 4+ parts
      // Some formats have only Conversation info = 3+ parts
      if (value.includes('Sender (untrusted metadata):') && parts.length >= 4) {
        value = parts.slice(4).join('```').trim();
      } else if (
        (value.includes('Conversation info') || value.includes('untrusted metadata')) &&
        parts.length >= 3
      ) {
        value = parts.slice(2).join('```').trim();
      }
    }
    if (value.startsWith('[media attached:')) {
      return '[图片]';
    }
    if (value.startsWith('[Queued messages while agent was busy]')) {
      return '[排队消息]';
    }
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fileMtime(filePath: string): Promise<Date> {
  try {
    const s = await stat(filePath);
    return s.mtime;
  } catch {
    return new Date();
  }
}
