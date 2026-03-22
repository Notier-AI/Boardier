# Contributing to Boardier

Thank you for your interest in contributing to Boardier! This is a community-driven project and we welcome all contributions.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your work: `git checkout -b feature/my-feature`
4. **Make your changes** following the guidelines below
5. **Test** your changes locally
6. **Push** to your fork and **open a pull request**

## Development Setup

The Boardier source is pure TypeScript with React. No build step is required for the library itself — it's consumed directly by the website and any integrating project.

### Website (Next.js)

```bash
cd website
npm install
npm run dev
```

### Regenerating Documentation

After adding or changing `@boardier-*` annotations:

```bash
npx tsx scripts/parseDocsFromSource.ts
```

This updates `website/src/data/docs.json`, which powers the `/docs` page.

### Regenerating Changelog

After adding modules with new `@boardier-since` versions:

```bash
npx tsx scripts/generateChangelog.ts
```

This updates `website/src/data/changelog.json`, which powers the `/changelog` page.

**Adding a new release:**

1. Tag all new/changed modules with `@boardier-since X.Y.Z` in their JSDoc header
2. Add an entry to the `VERSION_META` map in `scripts/generateChangelog.ts` with the version, date, and a one-line summary
3. Run `npx tsx scripts/parseDocsFromSource.ts` (docs first — changelog reads `docs.json`)
4. Run `npx tsx scripts/generateChangelog.ts`
5. Verify with `npm run build` in `website/`

## Code Structure

| Directory | Purpose |
|-----------|---------|
| `core/` | Engine, Scene, Renderer, History, Clipboard, type definitions |
| `elements/` | Element type implementations (render, hit-test, bounds) |
| `tools/` | Tool implementations (select, shape, line, freehand, etc.) |
| `themes/` | Theme types and presets |
| `ui/` | React components (canvas wrapper, toolbar, panels, overlays) |
| `utils/` | Pure utilities (math, colors, export, rough drawing, mermaid) |
| `scripts/` | Build-time scripts (docs parser, changelog generator) |
| `website/` | Next.js marketing site, demo, and docs |

## Coding Guidelines

### TypeScript

- Use strict TypeScript. Avoid `any` unless absolutely necessary.
- Prefer `interface` over `type` for object shapes.
- Use discriminated unions (like `BoardierElement`) instead of class hierarchies.

### Element System

Each element type lives in its own file under `elements/` and must:

1. Import `registerElement` from `elements/base.ts`
2. Implement three functions: `render()`, `hitTest()`, `getBounds()`
3. Call `registerElement(type, render, hitTest, getBounds)` at module level
4. Add a factory function in `elements/base.ts`

### Tool System

Each tool extends `BaseTool` from `tools/BaseTool.ts` and must:

1. Set a `readonly type` property matching a `BoardierToolType`
2. Override the relevant pointer/key handlers
3. Be registered in the `BoardierEngine` constructor's tool map

### Documentation Annotations

Every module should have a `@boardier-module` JSDoc block at the top:

```ts
/**
 * @boardier-module category/moduleName
 * @boardier-category Core | Elements | Tools | Themes | UI | Utilities | AI
 * @boardier-description What this module does.
 * @boardier-since 0.1.0
 * @boardier-usage `example code here`
 * @boardier-see OtherModule
 */
```

> **Important:** The `@boardier-since` tag drives the `/changelog` page. When adding a new module or adding significant new exports to an existing module as part of a release, set `@boardier-since` to the target version (e.g. `0.3.0`). This is how we track what shipped in each release without maintaining a manual changelog.

When **modifying** an existing module (not creating a new one), add a `@boardier-changed` tag instead. You can have multiple `@boardier-changed` tags — one per version that touched the module:

```ts
/**
 * @boardier-module core/types
 * @boardier-category Core
 * @boardier-description All type definitions…
 * @boardier-since 0.1.0
 * @boardier-changed 0.2.0 Added zigzag and zigzag-line to FillStyle
 * @boardier-changed 0.3.0 Added gradient fill options
 */
```

These `@boardier-changed` tags appear in the changelog under a separate **"Changed"** section with an orange indicator, distinct from new modules which appear under **"New"** in green.

For individual exports, use:

- `@boardier-class` for classes
- `@boardier-function` for functions
- `@boardier-type` for types/interfaces
- `@boardier-param` for parameters
- `@boardier-ai` for AI-specific notes
- `@boardier-changed` for recording what changed in a version (on existing modules)

### Styling

- UI components use inline styles with theme values — no CSS framework.
- The hand-drawn aesthetic comes from `roughDraw.ts` utilities, not CSS.
- Theme values are passed through `ToolContext` and component props.

## Adding a New Element Type

1. Define the interface in `core/types.ts` extending `BoardierElementBase`
2. Add it to the `BoardierElement` union and `BoardierElementType`
3. Create `elements/myElement.ts` with render/hitTest/getBounds + register call
4. Add a factory function in `elements/base.ts`
5. Import the element module in `core/Renderer.ts` and `utils/export.ts`
6. Add a tool in `tools/` (or use `WidgetTool` for simple click-to-place)
7. Register the tool in `core/Engine.ts`
8. Add a toolbar button in `ui/Toolbar.tsx`
9. Add `@boardier-module` annotations
10. Run `npx tsx scripts/parseDocsFromSource.ts` to update docs

## Adding a New Tool

1. Create `tools/MyTool.ts` extending `BaseTool`
2. Implement pointer/key handlers
3. Register in `core/Engine.ts` constructor
4. Add `@boardier-module` annotations
5. Add a toolbar entry in `ui/Toolbar.tsx`

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Add `@boardier-*` annotations to any new modules/exports
- Add `@boardier-changed` annotations to any modified modules
- Test the demo page (`/demo`) to verify nothing is broken
- Run `npm run build` in `website/` to verify the build passes

## AI-Assisted Contributions & Vibe Coding

> **We do not recommend using AI agents ("vibe coding") to contribute to Boardier.** This is an intentionally-designed system with subtle architectural patterns, registration-based side effects, and an annotation-driven documentation pipeline. AI agents frequently break these patterns in ways that are difficult to catch.

That said, if you do choose to use an AI coding agent, we provide an **[AGENTS.md](AGENTS.md)** file with structured instructions that many popular agents (GitHub Copilot, Cursor, Cline, etc.) can consume. It describes the architecture, patterns, pitfalls, and rules. Simply feed it to the AI per-prompt or load it as a skill, or, recommended, use it as instructions file.

### Policy for AI-assisted PRs

1. **Disclosure is required.** If any part of your PR was generated by an AI agent, you must disclose this in the PR description. No exceptions.
2. **Elevated review bar.** AI-assisted PRs will be held to a **higher standard of scrutiny** than manually-written code — not lower. Every change or addition must be understood and verified by the submitter.
3. **You are responsible for the output.** "The AI wrote it" is not an excuse for bugs, broken imports, missing annotations, or regressions. If you submit it, you own it.
4. **Full testing required.** AI-assisted changes must include:
   - A passing `npm run build` in `website/`
   - Manual verification on the `/demo` page
   - Verification that `/docs` and `/changelog` render correctly if annotations were touched
   - A description of exactly what you tested and how
5. **Annotation compliance.** AI agents often skip or botch `@boardier-*` annotations. Double-check every new and modified file has correct `@boardier-module`, `@boardier-since`, and `@boardier-changed` tags.
6. **Import integrity.** A known failure mode of agent-driven edits is silently consuming or breaking import lines. Verify all imports in every modified file.

PRs that appear to be bulk AI-generated without evidence of human review will be closed without merge.

## Reporting Issues

When reporting bugs, please include:

- Steps to reproduce
- Expected behaviour
- Actual behaviour
- Browser and OS

## Community

This is a community project by [Notier.ai](https://notier.ai). All contributions are welcome — from typo fixes to major features.
