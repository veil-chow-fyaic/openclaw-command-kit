# Slash Command Prior Art

Date: 2026-05-28

This note compares mainstream coding-agent slash-command surfaces to guide the
OpenClaw Command Kit v2 command set. It focuses on command semantics, not UI
styling, because OpenClaw commands must work in chat channels where keyboard
pickers and terminal-only panels are unavailable.

## Sources

- [Claude Code commands](https://code.claude.com/docs/en/commands)
- [Codex CLI slash commands](https://developers.openai.com/codex/cli/slash-commands)
- [Kimi Code slash commands](https://www.kimi.com/code/docs/en/kimi-code-cli/reference/slash-commands.html)
- [Gemini CLI commands](https://google-gemini.github.io/gemini-cli/docs/cli/commands.html)
- [Gemini CLI current command reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/commands.md)

## Command Matrix

| Command family | Claude Code | Codex CLI | Kimi Code | Gemini CLI | OpenClaw implication |
|---|---|---|---|---|---|
| Help and discovery | `/help` | Slash popup, `/status`, `/debug-config` | `/help`, `/version` | `/help`, `/commands list` | Keep discovery small. Command output should teach the next exact command, not expose internals. |
| Session list and resume | `/resume [session]`, `/clear [name]` keeps prior conversation available | `/resume`, `/new`, `/fork`, `/side`, `/clear` | `/sessions` with `/resume` alias; `/new`; `/fork` | `/resume` browser, `/chat` alias and checkpoint subcommands | Session recovery is a mainstream first-class command. OpenClaw should ship scoped `/sessions`, `/resume`, `/resume N` first. |
| Branch, fork, rewind | `/branch` or `/fork`, `/rewind` | `/fork`, `/side` | `/undo`, `/fork` | `/rewind`, `/restore` | Useful, but higher risk. Defer until route-scoped restore is proven. |
| Context compaction | `/compact`, `/context`, `/btw` | `/compact`, `/side` | `/compact`, `/btw` | `/compress` | OpenClaw already has context/lifecycle commands. Do not duplicate unless OpenClaw lacks native behavior. |
| Model and runtime controls | `/model`, `/effort`, `/status`, `/usage`, `/config` | `/model`, `/fast`, `/personality`, `/permissions`, `/status` | `/model`, `/usage`, `/theme`, `/reload` | `/model`, `/settings`, `/stats`, `/theme` | Keep Command Kit out of model, theme, usage, and runtime settings. These belong to OpenClaw core. |
| Permissions and safety | `/permissions`, `/sandbox`, `/doctor`, `/plan`, `/goal` | `/permissions`, `/approve`, `/plan`, `/goal` | `/plan`, `/yolo`, `/debug` | `/permissions`, `/policies`, `/plan`, `/privacy` | Copy the fail-closed safety posture, not broad permission management. Reject any auto-approve or unsafe mode command. |
| MCP, tools, extensibility | `/mcp`, `/skills`, `/plugin`, `/agents`, `/hooks` | `/mcp`, `/skills`, `/plugins`, `/apps`, `/hooks`, `/agent` | `/mcp`, `/hooks`, `/skill:<name>`, `/flow:<name>`, `/add-dir` | `/mcp`, `/commands`, `/extensions`, `/skills`, `/agents`, `/tools` | Defer. Command Kit should not become a generic agent runtime extension layer. |
| Review and shipping | `/diff`, `/code-review`, `/review`, `/security-review`, `/autofix-pr` | `/diff`, `/review`, `/copy` | `/task`, `/vis` support operational workflows | `/setup-github`, stats/tools commands | Out of scope for session recovery. Review commands need repo and PR context, not chat-route context. |
| Import, export, rename | `/export`, `/rename` | `/copy`, `/title` | `/export`, `/import`, `/title` alias `/rename` | `/chat share`, checkpoint tags | Later. Requires clear OpenClaw metadata ownership and privacy rules. |

## Patterns Worth Copying

1. Session recovery is normal command-layer behavior.
   Claude, Codex, Kimi, and Gemini all expose a way to return to prior
   conversations or saved checkpoints. This supports adding a native OpenClaw
   command path instead of forcing users into a separate dashboard.

2. Listing and loading are distinct user actions.
   Kimi's `/sessions`, Gemini's browser, and Claude/Codex resume pickers all
   separate "show choices" from "continue this one". OpenClaw should preserve
   this split with `/sessions` as read-only and `/resume N` as the mutating
   action.

3. Interactive pickers need a channel-safe adaptation.
   Terminal agents can rely on arrow keys and modal browsers. OpenClaw chat
   channels cannot. A numbered list with an explicit `/resume N` command is the
   simplest channel-agnostic equivalent.

4. Commands are control-plane operations.
   Mainstream tools use slash commands for session, model, permissions, tools,
   and workflow control. They are not ordinary prompts. OpenClaw plugin
   commands should therefore bypass LLM interpretation and return deterministic
   responses.

## Patterns To Avoid For The MVP

1. Global session search.
   Gemini and Kimi can safely scope by working directory. OpenClaw's equivalent
   scope is not a directory; it is the exact channel route. Global or fuzzy
   search before route resolution would violate the security contract.

2. Bare numeric selection.
   Terminal pickers can treat Enter on a selected row as confirmation. Chat
   channels should not treat a plain `2` message as a restore command. Require
   `/resume 2`.

3. Runtime setting sprawl.
   Commands such as `/model`, `/theme`, `/usage`, `/permissions`, and `/mcp`
   are important, but OpenClaw already owns core runtime settings. Command Kit
   should stay focused on the session-recovery gap.

4. Unsafe convenience modes.
   Commands like Kimi's `/yolo` are explicit auto-approve controls for a local
   CLI. They do not belong in a multi-channel chat command kit.

## OpenClaw-Specific Takeaway

The most defensible v2 command set is intentionally narrow:

- `/sessions`: read-only list of current-route sessions.
- `/resume`: read-only picker text with a stronger switch hint.
- `/resume N`: restore the N-th item from a freshly recomputed scoped list.

This copies the mainstream session-resume concept, adapts interactive selection
to channel text, and rejects broad CLI control commands that do not belong to an
OpenClaw session-recovery plugin.
