// Scan local OpenClaw session transcript backups (.reset. files) to discover
// historical generations for a given route. This mirrors the behavior of the
// Python session-bridge's _expand_session_generations / _summarize_generation_file.

import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { RouteScope } from './types.js';
import {
  cleanTranscriptText,
  isGoodPreviewText,
  isGoodTitleSeed,
  truncateForTitle,
} from './session-text.js';

export interface GenerationInfo {
  sessionId: string;
  sessionFile: string;
  title: string;
  updatedAt: Date;
  lastMessagePreview: string;
  lastUserMessage?: string;
  lastAssistantMessage?: string;
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
  const sessionsDir =
    process.env.OPENCLAW_SESSIONS_DIR || join(homedir(), '.openclaw', 'agents', agentId, 'sessions');

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
          const cleaned = cleanTranscriptText(text, role);
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

  const titleUser = userMessages.find((m) => isGoodTitleSeed(m.text))?.text || '';
  const titleAssistant = assistantMessages.find((m) => isGoodTitleSeed(m.text))?.text || '';
  const previewUsers = userMessages.filter((m) => isGoodPreviewText(m.text));
  const previewAssistants = assistantMessages.filter((m) => isGoodPreviewText(m.text));
  const lastUser = previewUsers[previewUsers.length - 1]?.text || '';
  const lastAssistant = previewAssistants[previewAssistants.length - 1]?.text || '';
  const lastPreview = lastAssistant || lastUser;

  const titleSeed = titleUser || titleAssistant ? truncateForTitle(titleUser || titleAssistant, 28) : '';
  const title = titleSeed && titleSeed !== activeTitle ? titleSeed : '历史对话';

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
    lastUserMessage: lastUser || undefined,
    lastAssistantMessage: lastAssistant || undefined,
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
