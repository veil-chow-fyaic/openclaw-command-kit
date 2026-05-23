# Architecture

## Goal

Build an OpenClaw-specific, channel-agnostic command layer that fills missing
native chat commands without duplicating OpenClaw storage.

## Preferred Integration Point

The command should live near OpenClaw native slash-command handling, because it
must work in any chat channel where OpenClaw receives a message.

It should not depend on:

- WeCom Side Panel;
- A-side cloud backend;
- bridge-local mapping JSON;
- browser UI state.

It should also not try to normalize unrelated agent runtimes such as Claude
Code, Codex CLI, Gemini CLI, or other tools. The reusable boundary is OpenClaw's
own Gateway, session store, transcript format, slash-command handler, and
channel runtime context.

## Core Components

### Command Router

Parses:

- `/sessions`
- `/sessions <count|query>`
- `/resume`
- `/resume <number|query>`

The router must preserve existing OpenClaw commands such as `/new`, `/reset`,
`/status`, and `/compact`.

### Route Scope Resolver

Builds the current route from inbound message context.

For WeCom, available context includes:

- `SessionKey`
- `AccountId`
- `OriginatingOrganization`
- `ChatType`
- `ConversationLabel`
- `SenderId`
- `SenderName`

For other channels, the resolver should map equivalent fields into a common
shape:

```ts
interface RouteScope {
  provider: string;
  accountId?: string;
  organization?: string;
  chatType: "direct" | "group" | "thread" | "unknown";
  sessionKey: string;
  label?: string;
  senderId?: string;
}
```

### Session History Service

Responsibilities:

- list current + historical generations under a route;
- build safe display summaries;
- expose only authorized scoped results;
- hide raw ids by default.

Possible future Gateway RPCs:

- `sessions.generations.list({ sessionKey })`
- `sessions.generations.restore({ sessionKey, sessionId })`
- `sessions.generations.search({ sessionKey, query })`

### Restore Service

Responsibilities:

- validate selected `session_id`;
- restore active route;
- create backup before mutable store writes if store-level restore is used;
- read back through Gateway/session API;
- return explicit success/failure state.

## Data Model

```ts
interface ResumeListItem {
  index: number;
  sessionId: string;
  sessionKey: string;
  title: string;
  updatedAt?: string;
  preview?: string;
  isCurrent: boolean;
  isEmpty: boolean;
  restorable: boolean;
  contextUsed?: number;
  contextWindow?: number;
}
```

## Implementation Phases

### Phase 0: Spec Package

This repository: docs and shared design.

### Phase 1: Native MVP

Implement inside OpenClaw command handling:

- `/sessions`
- `/resume`
- `/resume N`

Use current Gateway/session primitives and the proven bridge restore strategy.

### Phase 2: Shared Library

Extract route-scoped list/restore helpers so channel integrations and control UI
can reuse the same semantics.

### Phase 3: Search And Interaction

Add:

- `/sessions <query>`;
- `/resume <query>`;
- optional pending selection state;
- better session titles and summaries.

## Security Notes

- A session list is sensitive. Never return sessions outside the current route.
- Display labels are not authorization.
- Query search must happen after scoped filtering.
- Numeric selection must be resolved from a freshly computed scoped list.
- Success requires route read-back confirmation.
