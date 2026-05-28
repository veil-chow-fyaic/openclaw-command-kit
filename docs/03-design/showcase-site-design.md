# Showcase Site Design Specification

Date: 2026-05-28

Status: implementation-ready design spec for AIC-2627.

## Purpose

The showcase site must introduce OpenClaw Command Kit as an OpenClaw-native
slash-command plugin for session history and resume. It should feel crafted and
product-specific, but it must remain honest about the current release state:
source install is supported today, npm package names are reserved for a future
manual release, and the implemented command surface is `/sessions`, `/sessions
<query>`, `/resume`, `/resume <query>`, and `/resume N`.

The site is a public-facing design and product story, not a dashboard and not a
runtime UI. Its job is to help an external developer understand why the plugin
exists, how session scope is protected, what commands are available, and how to
install from source.

## Source Grounding

Use these repository documents as the product source of truth:

- `README.md`: product positioning, command table, architecture summary, current
  source-install status, and documentation links.
- `docs/01-getting-started/installation.md`: install commands, OpenClaw config,
  restart requirement, verification steps, and npm status.
- `docs/01-getting-started/quickstart.md`: short setup flow and expected command
  responses.
- `docs/02-commands/command-catalog.md`: implemented command semantics, examples,
  constraints, and error responses.
- `docs/02-commands/resume-command-spec.md`: resume behavior, query mode, and
  safety rules.
- `docs/03-design/architecture.md`: OpenClaw extension plugin architecture,
  core/plugin package split, and channel-agnostic boundary.
- `docs/03-design/security-contract.md`: actor isolation, route isolation,
  restore safety, command parsing safety, response safety, and release safety.
- `docs/03-design/release-distribution.md`: current source distribution path,
  future npm wording, package metadata, and release prohibitions.

Do not invent feature claims outside those documents. In particular, do not
claim npm availability, cloud hosting, global semantic session search, a
dashboard, per-channel custom adapters, or support for unrelated agent runtimes.

## Product Facts The Site Must Communicate

- OpenClaw Command Kit is an OpenClaw extension plugin.
- It registers native chat commands through `openclaw/plugin-sdk`
  `registerCommand()`.
- Commands are evaluated before LLM dispatch and replies return through the same
  OpenClaw channel.
- The core command semantics are channel-agnostic and live in `packages/core/`.
- The OpenClaw plugin glue lives in `packages/plugin/`.
- `PluginCommandContext` does not include every route field, so the plugin
  reverse-lookups route metadata through `sessions.list`.
- Session history is sensitive. The command layer requires actor scope and route
  scope before listing or restoring anything.
- Query mode is read-only. `/sessions <query>` and `/resume <query>` only filter
  already-scoped results.
- `/resume N` recomputes the scoped list, maps the displayed index, validates
  ownership, mutates session state only after validation, and reports success
  only after read-back confirmation.
- Normal responses never expose raw session IDs.
- Current install path: clone, install dependencies, build, symlink
  `packages/plugin`, configure OpenClaw, restart the gateway, then verify with
  `/sessions`.

## Reference Method

The MakeMePulse 2019 "Nomadic Tribe" reference should inform method only, not
visual identity. The useful qualities are:

- Chaptered pacing: the experience is framed as a journey through distinct
  interactive chapters rather than one generic landing page.
- Tactile scene changes: motion and interaction help the visitor feel progress,
  not just decoration.
- High-craft illustration and texture: visual detail creates memory, but the
  detail must support the story.
- Lightweight mystery: visitors discover the next scene through scroll, hover,
  and focused reveals.
- Technical showmanship with restraint: the reference uses WebGL and animation,
  but the effect is strongest when it clarifies a narrative beat.

External references used for method grounding:

- MakeMePulse case study for Nomadic Tribe:
  https://d10nhj8asc9jmx.cloudfront.net/case-study/nomadic-tribe/
- Live reference URL:
  https://2019.makemepulse.com/
- Communication Arts note on MakeMePulse portfolio design and WebGL approach:
  https://www.commarts.com/webpicks/makemepulse

The Command Kit site must not copy MakeMePulse protected assets, copy, chapter
names, compositions, characters, scene layouts, soundtrack direction, brand
marks, color identity, or Moebius-inspired imagery. Translate the method into an
original OpenClaw-specific interface story about routes, actors, scoped lists,
and safe restoration.

## Design Thesis

Working theme: "Recover the right conversation without breaking scope."

The site should feel like a field guide to controlled session travel: a
developer sees a map of chat routes, each route contains private conversation
generations, and Command Kit provides small native commands that safely inspect
or restore the right generation. The visual metaphor is not time travel fantasy
or generic AI magic. It is disciplined routing, verified handoff, and careful
state restoration.

Core feeling:

- Quietly technical, not corporate SaaS.
- Crafted and tactile, not template marketing.
- Open-source credible, not vaporware.
- Security-conscious, not fear-driven.
- Product-specific from the first viewport.

## Visual System

### Logo Direction

Use a low-fidelity original mark concept, not final production logo art:

- Shape: an open claw-like bracket formed from three short command strokes around
  a route node. It should read as "command capture" or "scoped grip", not as an
  animal illustration.
- Construction: one central route dot, two nested path lines, one slash-command
  cursor.
- Avoid: literal claws, mascots, MakeMePulse-like creatures, generic terminal
  icons, and OpenAI-style knots.
- Usage: small mark in the top bar, larger outline mark in the opening scene,
  favicon candidate, and watermark-scale line art in the install section.

### Palette

Use a balanced, high-contrast palette that avoids a one-note purple, dark slate,
cream, or orange theme.

Recommended tokens:

| Role | Hex | Use |
|---|---:|---|
| Ink | `#101214` | Primary text and command labels |
| Paper | `#F7F4EE` | Base background, warm but not beige-dominant |
| Signal Blue | `#246BFD` | Active command strokes and focus rings |
| Circuit Green | `#17A673` | Safe scoped state and verified read-back |
| Clay Red | `#C64B3C` | Fail-closed warnings and blocked routes |
| Brass | `#B88A2D` | Small highlights, indexes, route markers |
| Graphite | `#3A3E45` | Secondary text, diagrams, code panel borders |
| Mist | `#E4E7EA` | Dividers and quiet panels |

Use blue and green as functional accents, not full-page gradients. The base
should mix paper, ink, graphite, and measured accent colors so the site reads as
a technical artifact with illustrated warmth.

### Typography

Use system-first typography unless AIC-2627 intentionally adds a font asset:

- Interface and body: `Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`.
- Code and command chips: `JetBrains Mono`, `SFMono-Regular`, `ui-monospace`.
- Headings: same sans family with tighter hierarchy, no negative letter
  spacing, no viewport-width font scaling.
- Chinese command examples must render cleanly with system CJK fallbacks.

Text should be compact and implementation-oriented. Avoid oversized marketing
headlines inside panels. Reserve the largest type for the first viewport only.

### Texture And Shape Language

- Route lines: thin, slightly irregular connector lines between route nodes.
- Session generations: stacked paper tabs or transcript leaves, never generic
  "chat bubble" decoration.
- Scope boundaries: transparent rings or clipped route cells that show which
  sessions are inside the current actor and route.
- Verified restore: a small read-back pulse moving from selected generation to
  active route.
- Error states: closed gates or crossed route lines, not red alert banners.
- Background texture: subtle grain or scanned-paper noise under 4% opacity.
- Cards: only for repeated command examples or compact code panels; keep radius
  at 8px or less.

Do not use floating orb backgrounds, abstract gradient blobs, dashboard widgets,
or decorative nested cards.

## Page Information Architecture

The site can be a single long-form page with anchored sections. The first screen
must show the product name, the command surface, and a real product visualization
before any generic value proposition.

Recommended sections:

1. First viewport: "OpenClaw Command Kit"
2. Command story: `/sessions`, query mode, `/resume`, `/resume N`
3. Scope safety: actor scope plus route scope
4. Restore path: validate, backup, restore, read back
5. Install from source: clone, build, symlink, configure, restart, verify
6. Architecture: core package plus plugin package
7. Documentation and GitHub calls to action
8. Anti-patterns and release status footnote

Do not add a separate marketing landing page before this content. The usable
product story is the homepage.

## First Viewport

The first viewport should read as a product scene, not a split hero template.

Content:

- H1: `OpenClaw Command Kit`
- Supporting line: `Native session commands for OpenClaw: list scoped history,
  filter safely, and resume by explicit index.`
- Primary CTA: `View GitHub`
- Secondary CTA: `Read install guide`
- Inline command rail: `/sessions`, `/sessions <query>`, `/resume`,
  `/resume <query>`, `/resume N`
- Small release note: `Current release: install from source.`

Visual:

- Full-bleed illustrated route map or canvas-like scene, not a card.
- Center-left active OpenClaw route labeled "current chat route".
- Several transcript leaves arranged as prior generations inside the same route
  boundary.
- Two dimmed neighboring route cells outside the boundary to make isolation
  visible.
- A command cursor entering `/sessions`, then a scoped list appearing as
  numbered transcript leaves.

First-viewport requirements:

- The product name must be visible without relying on tiny nav text.
- At least part of the next section must be visible on desktop and mobile.
- The visual must show actual product concepts: routes, sessions, command list,
  and explicit resume index.
- Do not hide product content behind a dark, blurred, atmospheric background.

## Section Details

### 1. Command Story

Goal: show the implemented commands as a practical sequence.

Layout:

- A horizontal command rail on desktop; a vertically scrollable command list on
  mobile.
- Each command has one compact repeated item with icon, command, purpose, and
  safety note.
- A live-feeling transcript panel shows expected response shapes from the docs.

Content inventory:

| Command | Message |
|---|---|
| `/sessions` | Lists current and historical conversations for this chat route. |
| `/sessions <query>` | Filters the scoped list by title, preview, message snippet, or time label. |
| `/resume` | Shows the same scoped list with a stronger instruction to use `/resume N`. |
| `/resume <query>` | Shows filtered candidates without changing session state. |
| `/resume N` | Switches to the displayed numbered generation after validation and read-back. |

Use a short example based on the docs:

```text
可恢复的历史对话

当前：周威 · 刚刚

1. 腾讯文档发布不了
   gog 的 OAuth token 过期了... · 5月23日 09:36

发送 /resume 1 切换到第 1 个历史对话。
```

Do not display raw `sessionId` values.

### 2. Scope Safety

Goal: make the security model visually memorable.

Layout:

- Two-column technical diagram on desktop; stacked diagram on mobile.
- Left side: actor scope, route scope, and required inputs.
- Right side: "fail closed" examples.

Key copy:

- `No actor, no action.`
- `No route, no action.`
- `Search happens only after scoped filtering.`
- `Display labels are never authorization.`

Visual behavior:

- Hovering actor scope highlights `senderId`, `provider`, optional `accountId`,
  optional `organization`.
- Hovering route scope highlights `provider`, optional `accountId`, optional
  `organization`, `chatType`, and `sessionKey`.
- Routes outside the active scope should dim, not disappear, so the boundary is
  obvious.

### 3. Restore Path

Goal: show why `/resume N` is controlled and explicit.

Use a five-step path:

1. Recompute the scoped session list.
2. Map `N` to the freshly displayed item.
3. Validate actor and route ownership.
4. Restore the selected generation with backup.
5. Read back through OpenClaw before reporting success.

Animation:

- The selected numbered leaf moves into the active route only after validation.
- A green read-back pulse confirms the route state.
- If the viewer toggles a "route mismatch" example, the leaf stops at a closed
  boundary and the message changes to a concise fail-closed state.

Do not imply bare numeric replies are supported. Include a small note:
`Only /resume N switches. Sending 2 by itself does nothing in MVP.`

### 4. Install From Source

Goal: make current setup obvious and avoid false npm claims.

Required install steps:

```bash
git clone https://github.com/veil-chow-fyaic/openclaw-command-kit.git
cd openclaw-command-kit
npm install
npm run build
mkdir -p "$HOME/.openclaw/extensions"
ln -sfn "$(pwd)/packages/plugin" "$HOME/.openclaw/extensions/openclaw-command-kit"
```

Required config excerpt:

```json
{
  "plugins": {
    "allow": ["wecom", "openclaw-command-kit"],
    "load": {
      "paths": ["/Users/yourname/.openclaw/extensions/openclaw-command-kit"]
    },
    "entries": {
      "openclaw-command-kit": { "enabled": true }
    }
  }
}
```

Required restart step:

```bash
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
```

Verification:

- Send `/sessions` in any OpenClaw channel.
- Try `/sessions <query>` to confirm scoped filtering.
- Use `/resume N` only with a displayed index.

Display a restrained release-status note:
`npm package names are reserved for a future manual release. They are not the
current supported install path.`

### 5. Architecture

Goal: prove this is a real OpenClaw plugin, not a side-panel workaround.

Diagram:

```text
Channel Message
  -> OpenClaw Core Dispatch
  -> Extension Plugin registerCommand()
  -> Scope Deriver
  -> Core Command Router
  -> SessionHistoryService / RestoreService
  -> ResponseFormatter
  -> Same Channel Reply
```

Show two package lanes:

- `packages/core`: command router, scope resolvers, session history service,
  restore service, response formatter, gateway client.
- `packages/plugin`: `registerCommand()` entry, scope deriver, command handlers,
  plugin manifest.

Boundary copy:

- `OpenClaw is the source of truth for sessions.`
- `No WeCom Side Panel fallback.`
- `No local user/contact/session mapping pool.`
- `No generic agent-runtime abstraction.`

### 6. Documentation And Calls To Action

CTAs should be practical:

- `GitHub repository`
- `Quick start`
- `Installation guide`
- `Command catalog`
- `Security contract`
- `Architecture`

Use text links or small icon buttons. Do not create large marketing cards for
each document.

## Interaction And Motion

Motion should be meaningful, limited, and testable.

Required animations:

- Opening route-map reveal: route boundary draws first, command cursor second,
  transcript leaves third.
- Command rail hover/focus: selected command highlights the matching transcript
  output and route-state effect.
- Scoped filtering: non-matching leaves fade to 30% opacity after the scoped
  boundary is already visible.
- Restore path: selected index moves through validate, backup, restore, and
  read-back checkpoints.
- Fail-closed toggle: invalid route crosses the boundary and shows a blocked
  state without moving the leaf.
- Install section: steps check off as the reader scrolls, but the code remains
  static and copyable.

Timing:

- Micro-interactions: 120-180ms.
- Scene transitions: 350-700ms.
- Avoid scroll-jacking. Scroll should remain native and predictable.
- Avoid looping animations that compete with reading.

Reduced motion:

- Respect `prefers-reduced-motion`.
- Replace path travel with instant state changes and subtle opacity shifts.
- Keep all content visible without relying on animation timing.

Input states:

- Mouse hover and keyboard focus must produce equivalent command highlighting.
- Touch devices should use tap-to-select, not hover-only behavior.
- Focus rings use Signal Blue and must meet contrast requirements.

## Responsive Strategy

Desktop:

- First viewport uses a wide route-map scene with anchored product copy.
- Command rail can be horizontal.
- Architecture diagram can use two package lanes.
- Keep visible next-section hint at the viewport bottom.

Tablet:

- Route map stays visible but reduces neighboring route cells.
- Command rail may wrap to two rows.
- Code blocks must scroll horizontally without breaking layout.

Mobile:

- First viewport stacks copy above an interactive route scene.
- Command rail becomes a compact vertical list.
- Route map should reduce to one active route, one outside route, and three
  transcript leaves.
- CTAs become full-width rows only if labels fit; otherwise use icon plus short
  text.
- No text may overlap visuals, buttons, or code blocks.
- Keep code readable at normal font sizes; do not scale typography with viewport
  width.

Minimum browser targets for visual QA:

- Desktop: 1440 x 900.
- Mobile: 390 x 844.
- Optional wide desktop: 1728 x 1117.

## Asset Direction

AIC-2627 may create original lightweight assets:

- SVG or CSS route-map line art.
- Small command icons using an existing icon library if the implementation stack
  already includes one. If not, use simple inline SVG only for original route
  marks and command symbols.
- Subtle noise texture generated in CSS or as a tiny local bitmap.
- Product diagrams built from HTML/CSS/SVG so they stay inspectable and
  accessible.

Do not use:

- MakeMePulse screenshots or exported assets.
- Moebius-style character or landscape imitation.
- Stock photos that do not show product concepts.
- Dark blurred background media.
- Decorative gradient orbs or bokeh blobs.
- Final logo assets that claim production approval.

## Accessibility And Content Quality

- Maintain WCAG AA text contrast.
- Every interactive control needs a visible focus state.
- Commands in code style must also be readable by screen readers as text.
- Use semantic headings in the same order as the page story.
- Do not rely on color alone for fail-closed or verified states.
- Keep CTA labels literal and short.
- Keep Chinese examples intact and legible.
- Include `aria-label` values for icon-only controls if any are used.

## Browser Validation Checklist For AIC-2627

Before opening the implementation PR, run local browser verification and capture
evidence for at least desktop and mobile.

Desktop checks at 1440 x 900:

- First viewport shows `OpenClaw Command Kit`, the command rail, source-install
  status, and a real route/session visual.
- A hint of the next section is visible without scrolling.
- Route-map visual is nonblank and not cropped in a way that hides product
  meaning.
- Command hover/focus changes the matching transcript or route state.
- `/resume N` restore path animation reaches read-back confirmation.
- Fail-closed state blocks an invalid route visually and textually.
- Install code blocks are readable and copyable.
- No text overlaps cards, buttons, code, diagrams, or navigation.

Mobile checks at 390 x 844:

- Product name remains the first-viewport signal.
- The command list and CTAs fit without horizontal page scroll.
- Route scene simplifies but still shows active route, outside route, and
  transcript leaves.
- Tap interactions replace hover-only behavior.
- Code blocks scroll inside their containers, not the whole page.
- Text remains readable and does not use viewport-width font scaling.
- A hint of the next section is visible.

Reduced-motion check:

- Enable reduced motion and confirm all content remains visible.
- Animated transitions become static or opacity-only state changes.
- No required information depends on animation playback.

Canvas/SVG asset check, if applicable:

- Confirm the route scene has non-background pixels after load.
- Confirm command interactions alter visible pixels or DOM state.
- Confirm assets load from local repo paths and do not depend on protected
  external reference materials.

## Implementation Guardrails

- Build the actual showcase page first; do not build a separate marketing splash.
- Keep the project OpenClaw-specific and channel-agnostic.
- Keep source install as the current install path.
- Do not add frontend dependencies unless AIC-2627 explicitly justifies them and
  validates the package impact.
- Do not touch npm publishing, GitHub settings, `main`, or OpenClaw production
  configuration.
- Do not implement unsupported commands as live features.
- Do not imply `/sessions <query>` is global or semantic search.
- Do not imply `/resume <query>` switches automatically.
- Do not show raw session IDs in ordinary UI examples.
- Do not copy dashboard UI from other projects.
- Do not introduce a local mapping pool or WeCom-specific fallback into the
  product story.

## Anti-Patterns

Avoid these outcomes:

- Generic AI landing page with abstract gradients and empty promises.
- Hero headline that says only "Command your sessions" without showing actual
  commands.
- Split hero with a decorative card on one side and product text on the other.
- Full page of feature cards before the visitor understands `/sessions` and
  `/resume`.
- Visual identity borrowed from MakeMePulse, Nomadic Tribe, Moebius, OpenAI, or
  terminal-template aesthetics.
- Screenshots or media that do not show the actual product model.
- Dark, blurred, cropped background that makes the product impossible to inspect.
- Claims that npm install is supported today.
- Claims that the plugin manages sessions outside OpenClaw.
- Copy that generalizes to Claude Code, Codex CLI, Gemini CLI, or unrelated
  runtimes.

## Handoff Acceptance For AIC-2627

AIC-2627 can treat this spec as ready when its implementation plan maps directly
to these deliverables:

- A single polished showcase page.
- First viewport product scene with real command surface.
- Original visual system and low-fidelity logo direction.
- Command story backed by current docs.
- Scope safety section backed by the security contract.
- Restore path section with validation and read-back.
- Source-install section with current commands and config.
- Architecture section showing plugin plus core packages.
- Desktop, mobile, and reduced-motion browser evidence.
- Explicit proof that no protected MakeMePulse assets, copy, brand elements, or
  compositions were copied.
