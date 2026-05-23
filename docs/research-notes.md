# Research Notes

Date: 2026-05-23

## Local OpenClaw Version

Observed locally:

```text
OpenClaw 2026.3.8 (3caab92)
```

## Existing Native Chat Commands

OpenClaw README lists current chat commands:

- `/status`
- `/new` or `/reset`
- `/compact`
- `/think <level>`
- `/verbose on|off`
- `/usage off|tokens|full`
- `/restart`
- `/activation mention|always`

These cover lifecycle, status, context compression, model thinking level, output
verbosity, usage footers, gateway restart, and group activation. They do not
cover "show my conversation history and resume one".

## Existing Session Primitives

CLI:

```text
openclaw sessions
openclaw sessions --agent main
openclaw sessions --active 120
openclaw sessions --json
openclaw sessions cleanup
```

Gateway RPC capabilities observed in docs and local usage:

- `sessions.list`
- `sessions.preview`
- `sessions.describe`
- `sessions.resolve`
- `sessions.create`
- `sessions.patch`
- `sessions.reset`
- `sessions.get`
- `chat.history`

Current bridge implementation already uses:

- `sessions.list` for route discovery;
- `chat.history` for current generation preview and read-back;
- `sessions.reset` for new conversation;
- controlled route-store restore for historical generation switching until a
  formal restore RPC exists.

## WeCom Route Context

The WeCom channel already builds inbound message context with useful fields:

- `SessionKey`
- `AccountId`
- `OriginatingOrganization`
- `ChatType`
- `ConversationLabel`
- `SenderId`
- `SenderName`
- `CommandBody`

This means native commands can be route-scoped without A-side Side Panel help.

## Product Learning From Side Panel Work

The main lesson is that session switching must be real, not cosmetic:

1. Resolve sessions only under the current route scope.
2. Show current and historical generations in a user-readable list.
3. Restore the selected generation.
4. Read back through Gateway/session APIs.
5. Only then report success.

New conversation is route-level. Switch is generation-level.

## External References

- OpenClaw sessions CLI docs: https://docs.openclaw.ai/cli/sessions
- OpenClaw built-in slash command overview: https://www.stanza.dev/courses/openclaw-automation/slash-commands/openclaw-automation-builtin-commands
- OpenClaw Gateway protocol summary: https://github.com/openclaw/openclaw/blob/main/docs/gateway/protocol.md
- OpenClaw Control UI session resume request: https://github.com/openclaw/openclaw/issues/10599
- OpenClaw Control UI docs: https://docs.openclaw.ai/web/control-ui
- OpenClaw ACP bridge docs: https://github.com/openclaw/openclaw/blob/main/docs.acp.md
- Community and prior-art survey: [Prior art and community research](prior-art.md)
