export function cleanTranscriptText(text: string, role: string): string {
  let value = text.trim();

  if (role === 'user') {
    value = stripOpenClawMetadataEnvelope(value);

    if (value.startsWith('[media attached:')) {
      return '[图片]';
    }
    if (value.startsWith('[Queued messages while agent was busy]')) {
      return '[排队消息]';
    }
  }

  return cleanDisplayText(value);
}

export function cleanDisplayText(text: string): string {
  const value = text
    .replace(/\bMEDIA:\S+/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (value === 'NO_REPLY') return '';
  return value;
}

export function isGoodTitleSeed(text: string): boolean {
  return isMeaningfulConversationText(text, { forTitle: true });
}

export function isGoodPreviewText(text: string): boolean {
  return isMeaningfulConversationText(text, { forTitle: false });
}

export function shortenText(text: string, limit: number): string {
  const cleaned = cleanDisplayText(text);
  if (cleaned.length <= limit) return cleaned;
  return cleaned.slice(0, limit) + '…';
}

export function truncateForTitle(text: string, maxLen: number): string {
  const cleaned = cleanDisplayText(text);
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + '…';
}

function stripOpenClawMetadataEnvelope(text: string): string {
  if (!text.includes('```')) return text;

  const parts = text.split('```');
  if (text.includes('Sender (untrusted metadata):') && parts.length >= 4) {
    return parts.slice(4).join('```').trim();
  }
  if ((text.includes('Conversation info') || text.includes('untrusted metadata')) && parts.length >= 3) {
    return parts.slice(2).join('```').trim();
  }

  return text;
}

function isMeaningfulConversationText(text: string, options: { forTitle: boolean }): boolean {
  const value = cleanDisplayText(text);
  if (value.length < 2) return false;
  if (options.forTitle && value.startsWith('/')) return false;
  if (/^\/(sessions|resume|whereami)(?:\s|$)/i.test(value)) return false;
  if (value === '[图片]' || value === '[排队消息]') return false;
  if (value === 'NO_REPLY') return false;

  if (isOpenClawMetadata(value)) return false;
  if (isPackageManagerNoise(value)) return false;
  if (isGatewayOrRuntimeNoise(value)) return false;
  if (isCommandReplyText(value)) return false;

  return true;
}

function isOpenClawMetadata(value: string): boolean {
  if (value.startsWith('Conversation info')) return true;
  if (value.startsWith('你当前在 **WeCom')) return true;
  if (/^\[[A-Z][a-z]{2}\s+\d{4}-\d{2}-\d{2}/.test(value)) return true;
  return false;
}

function isPackageManagerNoise(value: string): boolean {
  if (/^downloading\s+@/i.test(value)) return true;
  if (/^added\s+\d+\s+packages?/i.test(value)) return true;
  if (/^up to date,\s+audited/i.test(value)) return true;
  if (/^npm\s+(warn|notice|error)\b/i.test(value)) return true;
  return false;
}

function isGatewayOrRuntimeNoise(value: string): boolean {
  if (/^(acp\s+)?gateway\s+progress\s+fact\b/i.test(value)) return true;
  if (/^acp\s+gateway\b/i.test(value)) return true;
  if (/^yes,?\s+`?acp_gateway_task`?\s+is available\.?$/i.test(value)) return true;
  if (/^no\.?\s+the\s+`?acp-gateway-client`?\s+skill\s+is\s+avai/i.test(value)) return true;
  if (/^no,?\s+`?acp_gateway_task`?\s+is\s+not\s+explicitly/i.test(value)) return true;
  if (/^internal check:\s*reply only whether\s+acp_gateway/i.test(value)) return true;
  if (/^not available\.\s+the\s+`?acp_gateway_task`?\b/i.test(value)) return true;
  if (/^`?acp_gateway_task`?\s+is available\.?$/i.test(value)) return true;
  if (/^sessions_spawn is available\b/i.test(value)) return true;
  if (/^the background task is still (in progress|running)\b/i.test(value)) return true;
  if (/^还在(跑|处理中|处理|运行)/.test(value)) return true;
  if (/^后台任务(还在|正在|继续)/.test(value)) return true;
  if (/^子代理正在/.test(value)) return true;
  if (/^工具调用成功。?\s*第一条结果标题[:：]/.test(value)) return true;
  if (/^拿到了。?\s*搜索到了\s+OpenClaw\s+官网/i.test(value)) return true;
  if (/^你刚刚被唤醒。有一份新的会议纪要已生成\/更新/.test(value)) return true;
  if (/^📋?\s*Obsidian中沉淀一份新的会议纪要/.test(value)) return true;
  if (/^\[SILENT\]\s*这是一条测试消息/.test(value)) return true;
  if (/^testing$/i.test(value)) return true;
  if (/^【我是爱兮】/.test(value)) return true;
  if (/^tool call error:/i.test(value)) return true;
  if (/^command timeout\b/i.test(value)) return true;
  if (/^http request timed out after\b/i.test(value)) return true;
  if (/^__tabby_mcp_exec_ok__$/i.test(value)) return true;
  return false;
}

function isCommandReplyText(value: string): boolean {
  if (/^(最近)?可恢复的历史对话[（(]/.test(value)) return true;
  if (/^当前聊天还没有可恢复的历史对话/.test(value)) return true;
  if (/^发送 \/resume\b/.test(value)) return true;
  if (/^历史对话命令$/.test(value)) return true;
  if (/^\/sessions 只用于查看和搜索/.test(value)) return true;
  if (/^用法：\/resume/.test(value)) return true;
  if (/^已切换到历史对话/.test(value)) return true;
  if (/^当前会话信息/.test(value)) return true;
  if (/^无法确认当前用户身份/.test(value)) return true;
  if (/^无法确认当前聊天范围/.test(value)) return true;
  if (/^没有找到匹配 ".+" 的历史对话/.test(value)) return true;
  return false;
}
