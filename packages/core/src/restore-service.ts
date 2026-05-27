// Restore route generation + read-back confirm.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { homedir } from 'node:os';
import type { GatewayClient } from './gateway-client.js';
import type { SessionHistoryService } from './session-history-service.js';
import type { ActorScope, RouteScope, RestoreResult, ResumeListItem } from './types.js';

export class RestoreService {
  constructor(
    private gateway: GatewayClient,
    private history: SessionHistoryService,
    private sessionsDir: string = process.env.OPENCLAW_SESSIONS_DIR || path.join(homedir(), '.openclaw/agents/main/sessions')
  ) {}

  async restoreSession(
    actor: ActorScope,
    route: RouteScope,
    displayIndex: number
  ): Promise<RestoreResult> {
    // 1. Recompute scoped list
    const items = await this.history.listSessions(actor, route);
    if (items.length === 0) {
      return {
        success: false,
        message: '当前聊天没有可恢复的历史对话。',
        error: 'invalid_index',
      };
    }

    // 2. Map displayIndex -> item
    const item = items.find((i) => i.displayIndex === displayIndex);
    if (!item) {
      return {
        success: false,
        message: `没有第 ${displayIndex} 个对话。请发送 /sessions 查看可选项。`,
        error: 'invalid_index',
      };
    }

    // 3. Validate selected session belongs to current actor+route
    const belongs = await this._validateBelongsToRoute(actor, item, route);
    if (!belongs) {
      return {
        success: false,
        message: '这个对话不属于当前聊天，已拒绝切换。',
        error: 'route_mismatch',
      };
    }

    // 4. Backup sessions.json
    const storePath = path.join(this.sessionsDir, 'sessions.json');
    if (!fs.existsSync(storePath)) {
      return {
        success: false,
        message: 'OpenClaw 会话存储未找到。',
        error: 'store_error',
      };
    }

    let store: Record<string, any>;
    try {
      store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    } catch {
      return {
        success: false,
        message: 'OpenClaw 会话存储格式错误。',
        error: 'store_error',
      };
    }

    // 5. Find route keys and modify
    const routeKeys = this._resolveRouteKeys(route);
    const existingKeys = routeKeys.filter((k) => typeof store[k] === 'object' && store[k] !== null);
    if (existingKeys.length === 0) {
      return {
        success: false,
        message: '当前路由在会话存储中未找到。',
        error: 'store_error',
      };
    }

    const targetFileName = `${item.sessionId}.jsonl`;
    const targetFilePath = path.join(this.sessionsDir, targetFileName);

    // Historical generations only have .jsonl.reset.timestamp files.
    // Copy the reset file to .jsonl so OpenClaw can load the full transcript.
    if (item.sessionFile && item.sessionFile.includes('.reset.')) {
      const sourcePath = path.join(this.sessionsDir, item.sessionFile);
      if (fs.existsSync(sourcePath)) {
        try {
          fs.copyFileSync(sourcePath, targetFilePath);
        } catch {
          return {
            success: false,
            message: '恢复会话文件失败。',
            error: 'store_error',
          };
        }
      }
    }

    const restoredUpdatedAt = item.updatedAt.getTime();

    for (const storeKey of existingKeys) {
      const entry = { ...store[storeKey] };
      entry.sessionId = item.sessionId;
      entry.sessionFile = targetFileName;
      entry.updatedAt = restoredUpdatedAt;
      store[storeKey] = entry;
    }

    // Atomic write with backup
    try {
      this._atomicWriteJsonWithBackup(storePath, store);
    } catch {
      return {
        success: false,
        message: '写入会话存储失败。',
        error: 'store_error',
      };
    }

    // 6. Read back via chat.history
    const confirmed = await this._readBackConfirmed(route.sessionKey, item.sessionId);
    if (!confirmed) {
      return {
        success: false,
        message: 'OpenClaw 未确认切换完成，后续消息不会被标记为已切换。',
        error: 'readback_failure',
      };
    }

    return {
      success: true,
      message: '已切换到历史对话。',
      restoredSessionId: item.sessionId,
    };
  }

  private async _validateBelongsToRoute(actor: ActorScope, item: ResumeListItem, route: RouteScope): Promise<boolean> {
    // Secondary safety check: recompute the scoped list with the same actor+route
    // and confirm the selected item is still present.
    const items = await this.history.listSessions(actor, route);
    return items.some((i) => i.sessionId === item.sessionId);
  }

  private _resolveRouteKeys(route: RouteScope): string[] {
    const keys: string[] = [];
    const rawKey = route.sessionKey;
    const agentId = 'main'; // TODO: make configurable
    for (const key of [rawKey, `agent:${agentId}:${rawKey}`]) {
      if (key && !keys.includes(key)) {
        keys.push(key);
      }
    }
    // Also include the raw key without agent: prefix if sessionKey uses that form
    if (rawKey && rawKey.startsWith('agent:')) {
      const stripped = rawKey.split(':', 2)[1] || '';
      if (stripped && !keys.includes(stripped)) {
        keys.push(stripped);
      }
    }
    return keys;
  }

  private _atomicWriteJsonWithBackup(storePath: string, data: unknown): void {
    const backupPath = `${storePath}.backup.${Date.now()}`;
    fs.copyFileSync(storePath, backupPath);
    const tmpPath = `${storePath}.tmp.${process.pid}.${crypto.randomUUID()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, storePath);
  }

  private async _readBackConfirmed(sessionKey: string, expectedSessionId: string): Promise<boolean> {
    try {
      const result = await this.gateway.chatHistory({ sessionKey, limit: 1 });
      return (result as any).sessionId === expectedSessionId;
    } catch {
      return false;
    }
  }
}
