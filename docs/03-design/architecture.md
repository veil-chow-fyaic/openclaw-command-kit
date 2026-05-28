# Architecture

## Goal

Build an OpenClaw-specific, channel-agnostic command layer that fills missing
native chat commands without duplicating OpenClaw storage.

## Preferred Integration Point

The commands are implemented as an **OpenClaw Extension Plugin** using the
`openclaw/plugin-sdk` `registerCommand()` API. This provides:

- Native slash-command feel in any channel (WeCom, Telegram, Slack, Discord, WebChat, etc.)
- Execution before built-in commands and LLM dispatch
- Automatic reply delivery back through the same channel
- No modification to OpenClaw source code or compiled `dist/`
- Independent package metadata for a future npm release; current installs build
  from source and link `packages/plugin`

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

### Extension Plugin (`packages/plugin/`)

Thin glue layer between OpenClaw's `plugin-sdk` and the channel-agnostic `core`.

- `index.ts` — Exports `OpenClawPluginDefinition`; calls `api.registerCommand()` for `sessions` and `resume`
- `scope-deriver.ts` — Reverse-lookup `ActorScope` + `RouteScope` from `PluginCommandContext` via `sessions.list` RPC
- `command-handlers.ts` — Wraps core services; handles `/sessions`, `/resume`, `/resume N`

The plugin receives `PluginCommandContext` which contains `senderId`, `channel`, `to`, `accountId`, `messageThreadId` but **no `sessionKey` or `organization`**. It reverse-lookups these by matching `deliveryContext` metadata from `sessions.list`.

### Command Router (`packages/core/`)

Parses:

- `/sessions`
- `/sessions <query>`
- `/resume`
- `/resume <number|query>`

The router must preserve existing OpenClaw commands such as `/new`, `/reset`, `/status`, and `/compact`.

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

### Actor Scope Resolver

Builds the current command issuer from trusted channel context.

```ts
interface ActorScope {
  provider: string;
  accountId?: string;
  organization?: string;
  senderId: string;
  senderDisplayName?: string;
}
```

Actor scope is required for command authorization and future interaction state.
It must not be derived from display names alone. In group chats, actor scope
prevents a later pending picker from being completed by a different sender. In
direct chats, actor scope protects cases where multiple enterprise users can see
similar external contacts or labels.

If actor or route scope is missing, the command layer should return a clear
fail-closed response before any session listing or search.

### Session History Service

Responsibilities:

- list current + historical generations under an actor-authorized route;
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
  actorId?: string;
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

### Phase 1: Core Library

Implement channel-agnostic core in `packages/core/`:

- `GatewayClient` — typed wrapper for `openclaw gateway call`
- `ActorScopeResolver` / `RouteScopeResolver` — fail-closed scope validation
- `SessionHistoryService` — scoped session listing
- `RestoreService` — session restore with read-back confirmation
- `ResponseFormatter` — Chinese reply formatting
- `CommandRouter` — parse `/sessions`, `/resume`, `/resume N`

### Phase 2: Extension Plugin

Implement OpenClaw extension plugin in `packages/plugin/`:

- `scope-deriver.ts` — reverse-lookup scopes from `PluginCommandContext`
- `command-handlers.ts` — delegate to core services
- `index.ts` — `OpenClawPluginDefinition` with `registerCommand()` calls

### Phase 3: Search

Implemented:

- `/sessions <query>`;
- `/resume <query>`;

Future interaction work, such as pending selection state or richer titles, must
stay actor- and route-scoped.

## Security Notes

- A session list is sensitive. Never return sessions outside the current route.
- The current actor must be resolved before any list or restore operation.
- Display labels are not authorization.
- Query search must happen after scoped filtering.
- Numeric selection must be resolved from a freshly computed scoped list.
- MVP should not interpret bare numeric replies as picker selections.
- Any future pending picker must be keyed by actor and route.
- Success requires route read-back confirmation.
