// Format chat-friendly Chinese reply text.
export function formatSessionList(items, _currentItem, maxItems = 10) {
    if (items.length === 0) {
        return '当前聊天还没有可恢复的历史对话。';
    }
    const shownCount = Math.min(items.length, maxItems);
    const header = items.length > maxItems
        ? `最近可恢复的历史对话（显示 ${shownCount} / 共 ${items.length} 个）`
        : `可恢复的历史对话（${items.length} 个）`;
    let lines = [header];
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
export function formatResumeSuccess(item) {
    const parts = ['已切换到历史对话', ''];
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
    }
    else if (item.lastMessagePreview) {
        parts.push(`摘要：${truncate(item.lastMessagePreview, 60)}`);
    }
    parts.push('');
    parts.push('后续消息将进入这个上下文。');
    return parts.join('\n');
}
export function formatResumeHint() {
    return '发送 /resume 序号 继续；/resume help 查看用法。';
}
export function formatResumeHelp() {
    return [
        '历史对话命令',
        '',
        '/resume - 查看当前聊天可恢复的历史对话',
        '/resume 序号 - 继续对应历史对话',
        '/resume 关键词 - 搜索历史对话',
        '/resume all - 查看完整候选列表',
        '/resume debug - 查看当前聊天的恢复诊断',
        '/resume help - 查看本帮助',
        '',
        '/sessions 是查看历史的别名：',
        '/sessions - 等同 /resume',
        '/sessions 关键词 - 等同 /resume 关键词',
        '/sessions all - 等同 /resume all',
        '/sessions debug - 等同 /resume debug',
        '',
        '注意：恢复对话只使用 /resume 序号。/sessions 只用于查看和搜索。',
    ].join('\n');
}
export function formatSessionsRestoreBoundary(index) {
    return `/sessions 只用于查看和搜索。要继续第 ${index} 个对话，请发送 /resume ${index}。`;
}
export function formatResumeUsage() {
    return '用法：/resume、/resume 序号、/resume 关键词、/resume all、/resume debug、/resume help';
}
export function formatResumeDebug(diagnostics) {
    const route = diagnostics.route;
    const lines = [
        '恢复诊断',
        '',
        `频道：${route.provider}`,
        `会话：${route.sessionKey}`,
        `类型：${route.chatType}`,
    ];
    if (route.accountId)
        lines.push(`账号：${route.accountId}`);
    if (route.organization)
        lines.push(`组织：${route.organization}`);
    if (route.label)
        lines.push(`标签：${route.label}`);
    lines.push('');
    lines.push(`原始候选：${diagnostics.rawCount}`);
    lines.push(`可信路由候选：${diagnostics.trustedRawCount}`);
    lines.push(`历史扫描补充：${diagnostics.historicalCount}`);
    lines.push(`完整可恢复：${diagnostics.allCount}`);
    lines.push(`当前显示：${diagnostics.visibleCount}`);
    lines.push(`当前标记：${diagnostics.currentCount}`);
    if (diagnostics.trust.length > 0) {
        lines.push('');
        lines.push('可信来源：');
        for (const item of diagnostics.trust) {
            lines.push(`- ${formatTrustSource(item.source)}：${item.count}`);
        }
    }
    if (diagnostics.hidden.length > 0) {
        lines.push('');
        lines.push('过滤原因：');
        for (const item of diagnostics.hidden) {
            lines.push(`- ${formatHiddenReason(item.reason)}：${item.count}`);
        }
    }
    if (diagnostics.warnings.length > 0) {
        lines.push('');
        lines.push('警告：');
        for (const warning of diagnostics.warnings) {
            lines.push(`- ${warning}`);
        }
    }
    lines.push('');
    lines.push('说明：debug 只展示统计，不展示被过滤会话内容。');
    return lines.join('\n');
}
export function formatError(error, params) {
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
function formatSmartTime(d) {
    const now = Date.now();
    const diff = now - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1)
        return '刚刚';
    if (minutes < 60)
        return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    const timeStr = d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1)
        return `昨天 ${timeStr}`;
    if (days < 7)
        return `${days} 天前 ${timeStr}`;
    return d.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function truncate(text, maxLen) {
    const cleaned = text.replace(/\r?\n/g, ' ').trim();
    if (cleaned.length <= maxLen)
        return cleaned;
    return cleaned.slice(0, maxLen) + '…';
}
function hasNonSequentialIndexes(items) {
    if (items.length === 0)
        return false;
    if (items[0].displayIndex !== 1)
        return true;
    return items.some((item, idx) => idx > 0 && item.displayIndex !== items[idx - 1].displayIndex + 1);
}
function formatTrustSource(source) {
    switch (source) {
        case 'metadata':
            return 'OpenClaw 路由元数据';
        case 'local_route_instruction':
            return '本地路由指令';
        case 'historical_scan':
            return '历史扫描';
        default:
            return source;
    }
}
function formatHiddenReason(reason) {
    switch (reason) {
        case 'actor_missing':
            return '缺少用户身份';
        case 'actor_account_mismatch':
            return '用户账号与聊天账号不一致';
        case 'actor_organization_mismatch':
            return '用户组织与聊天组织不一致';
        case 'missing_session_id':
            return '缺少 sessionId';
        case 'missing_session_key':
            return '缺少 sessionKey';
        case 'provider_mismatch':
            return '频道不一致';
        case 'account_mismatch':
            return '账号不一致';
        case 'organization_mismatch':
            return '组织不一致';
        case 'chat_type_mismatch':
            return '聊天类型不一致';
        case 'route_mismatch_untrusted':
            return '缺少可信路由证据';
        case 'low_signal_default':
            return '默认视图隐藏低信号会话';
        case 'query_filtered':
            return '关键词过滤未命中';
        default:
            return reason;
    }
}
//# sourceMappingURL=response-formatter.js.map