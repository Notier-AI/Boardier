# AI Agent Instructions for Boardier

> **Disclaimer:** This file exists as a reference for contributors who choose to use AI coding agents. The Boardier project **does not recommend vibe coding** — we believe in intentional, well-understood changes. That said, we recognise agents can be useful tools when used responsibly, so this file provides the guardrails.

## Overview

Boardier is a free, open source, AI-focused whiteboard library written in TypeScript + React. It uses a hand-drawn aesthetic powered by roughjs-style rendering. The codebase is structured as a pure library (no build step) consumed by a Next.js website in the `website/` subfolder.

## Project Structure

```
boardier/
├── core/           # Engine, Scene, Renderer, History, Clipboard, types
├── elements/       # Element renderers (rectangle, ellipse, line, freehand, etc.)
├── tools/          # Tool implementations (select, shape, text, freehand, etc.)
├── themes/         # Theme types and presets
├── ui/             # React UI components (canvas, toolbar, panels, overlays)
├── utils/          # Pure utilities (math, colors, export, roughDraw, mermaid)
├── ai/             # AI modules (schema, layout, htmlConverter, prompt bridge)
├── scripts/        # Build scripts (docs parser, changelog generator)
├── website/        # Next.js marketing site, /demo, /docs, /changelog
├── index.ts        # Public API barrel export
├── CONTRIBUTING.md # Human contribution guide
└── AGENTS.md       # This file
```

## Architecture Principles

1. **Discriminated unions over class hierarchies.** All elements are plain objects typed via `BoardierElement` (a union in `core/types.ts`). There are no element base classes.
2. **Registration pattern.** Each element type calls `registerElement(type, render, hitTest, getBounds)` at module level. Tools are registered in the `Engine` constructor.
3. **Pure functions where possible.** Layout algorithms, math helpers, and render helpers are stateless.
4. **Inline styles for UI.** UI components use inline styles with theme tokens — no CSS framework inside the library.
5. **The website is separate.** The `website/` folder is a Next.js app that imports the library directly. It has its own styles (Tailwind), fonts, and build pipeline.

## Key Files You Must Understand

- **`core/types.ts`** — Every type definition. Read this first.
- **`elements/base.ts`** — Factory functions and the registration system.
- **`core/Engine.ts`** — The main orchestrator. Tool switching, event routing, state management.
- **`core/Scene.ts`** — The element store. CRUD operations on elements.
- **`core/Renderer.ts`** — The render loop. Imports all element modules to trigger registration.
- **`utils/renderHelpers.ts`** — Shared fill pattern and stroke rendering used by every shape.
- **`index.ts`** — The public API. Everything exported here is the library's contract.

## Annotation System

Every source file has a JSDoc header with `@boardier-*` tags. These are **not decorative** — they power the auto-generated `/docs` and `/changelog` pages.

### Required annotations for new modules

```ts
/**
 * @boardier-module category/moduleName
 * @boardier-category Core | Elements | Tools | Themes | UI | Utilities | AI | Build
 * @boardier-description What this module does.
 * @boardier-since X.Y.Z
 */
```

### When modifying existing modules

Add a `@boardier-changed` tag (you can have multiple):

```ts
/**
 * @boardier-changed X.Y.Z Description of what changed
 */
```

This drives the "Changed" section of the changelog. **Do not skip this.**

### Regenerating docs and changelog

After any annotation changes:

```bash
npx tsx scripts/parseDocsFromSource.ts   # docs.json first
npx tsx scripts/generateChangelog.ts      # reads docs.json
```

## Rules for AI Agents

### DO

- Read `core/types.ts` before generating any element-related code.
- Follow the existing patterns exactly. Look at a similar file before creating a new one.
- Add `@boardier-module` annotations to every new file.
- Add `@boardier-changed` annotations when modifying existing files.
- Run `npm run build` in `website/` before considering any change complete.
- Keep changes minimal and focused. One feature or fix per change.
- Write code that a human can read and verify in under 5 minutes.
- Preserve all existing imports — the annotation system previously broke imports when replacements consumed adjacent lines.

### DO NOT

- Do not refactor code you weren't asked to touch.
- Do not add dependencies without explicit instruction.
- Do not modify `core/types.ts` without understanding the full ripple effect across every element, tool, and renderer.
- Do not generate large files. If a file exceeds ~300 lines, split it.
- Do not guess at API shapes — read the source.
- Do not use `any` unless there is genuinely no alternative.
- Do not bypass TypeScript strict mode or suppress errors with `@ts-ignore`.
- Do not create abstractions for one-time operations.
- Do not add error handling for impossible states.
- Do not touch the `website/` styles or layout unless specifically asked — they use an entirely different system (Tailwind, Caveat/Kalam fonts, sketch CSS classes).
- Do not use libraries which are not well known or ones that do not allow commercial use.

## Adding an Element Type

1. Define interface in `core/types.ts` extending `BoardierElementBase`
2. Add to `BoardierElement` union and `BoardierElementType`
3. Create `elements/myElement.ts` — implement `render()`, `hitTest()`, `getBounds()`
4. Call `registerElement(...)` at module level
5. Add factory in `elements/base.ts`
6. Import in `core/Renderer.ts` and `utils/export.ts`
7. Add tool (or extend `WidgetTool`)
8. Register tool in `core/Engine.ts`
9. Add toolbar button in `ui/Toolbar.tsx`
10. Add `@boardier-module` annotation

## Adding a Tool

1. Create `tools/MyTool.ts` extending `BaseTool`
2. Set `readonly type` matching a `BoardierToolType`
3. Override pointer/key handlers
4. Register in `Engine` constructor
5. Add toolbar entry
6. Add `@boardier-module` annotation

## Testing Changes

There is no test suite yet (contributions welcome). Verify changes by:

1. `npm run build` in `website/` — must pass with zero errors
2. Check the `/demo` page in the browser — interact with the canvas
3. Check `/docs` and `/changelog` if annotations changed
4. Manually test the specific feature you changed

## Common Pitfalls

- **Import order matters for registration.** Element modules must be imported in `Renderer.ts` before the render loop runs.
- **The `seed` field on elements** controls roughjs determinism. Always pass it through; never omit it.
- **Coordinate system:** `(x, y)` is the top-left of the element bounding box, not center.
- **Rotation:** stored in radians, applied around the element center in renderers.
- **`fillStyle: 'none'`** means no fill — it's not the same as `'solid'` with transparent color.
