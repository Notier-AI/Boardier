# Boardier

A free, open source, AI-focused whiteboard engine built purely for the community. No license needed.

Built by [Notier.ai](https://notier.ai).

## What is Boardier?

Boardier is a **themeable, extensible canvas-based whiteboard** shipped as a React component. It runs entirely in the browser using HTML Canvas 2D — no server required for rendering. The engine is designed from the ground up with AI integration in mind: structured element data, a programmatic API for LLM agents, and Mermaid diagram conversion are all built in.

## Features

- **16 element types** — rectangles, ellipses, diamonds, lines, arrows, freehand, text, icons, markers, checkboxes, radio groups, frames, images, embeds, tables, and comments
- **Hand-drawn aesthetic** — configurable roughness (0 = clean, 2 = sketchy) powered by a seeded PRNG for stable rendering
- **Full theming** — light, dark, and custom themes via a single `BoardierTheme` object
- **Tool system** — select, shape, line, freehand, text, pan, eraser, icon, marker, image, and widget tools
- **AI-ready API** — `searchElements()`, `getSceneSummary()`, `getSceneStats()`, `moveElement()`, `resizeElement()`, `setElementColor()`, `panTo()`, `selectElements()`, and more, designed for LLM agents
- **Multi-page support** — create, rename, delete, and switch between pages/slides
- **Presentation mode** — fullscreen slide presentation with keyboard navigation
- **Export** — PNG, SVG, and JSON export
- **Mermaid → Boardier** — convert Mermaid flowchart syntax into positioned canvas elements
- **Undo/redo** — full-scene snapshot history with configurable depth
- **Copy/paste** — in-memory clipboard with offset pasting
- **Smart guides** — alignment guides shown during drag
- **Minimap** — overview navigation panel
- **Draggable UI panels** — toolbar, zoom, export panels can be repositioned
- **100% client-side** — no server, no database, no API keys shipped

## Quick Start

```tsx
import { BoardierCanvas, defaultTheme } from 'boardier';

function App() {
  return (
    <BoardierCanvas
      theme={defaultTheme}
      config={{ showGrid: true, snapToGrid: true }}
      onChange={(elements) => console.log('Scene updated:', elements.length)}
    />
  );
}
```

## API Overview

> [!NOTE]
> The following overview may not always be up to date. To see the full docs, please visit [Boardier Docs](https://boardier.dev/docs).

### `<BoardierCanvas />`

The main React component. Props:

| Prop | Type | Description |
|------|------|-------------|
| `config` | `BoardierConfig` | Read-only mode, grid, snap, zoom limits, layout |
| `theme` | `BoardierTheme` | Visual theme for the entire engine |
| `initialScene` | `BoardierSceneData` | Pre-load a saved scene |
| `onChange` | `(elements: BoardierElement[]) => void` | Called when elements change |
| `onSelectionChange` | `(ids: string[]) => void` | Called when selection changes |
| `onViewChange` | `(viewState: ViewState) => void` | Called on pan/zoom |

### `BoardierCanvasRef`

Access the engine via `React.useRef`:

```tsx
const ref = useRef<BoardierCanvasRef>(null);

// Get raw engine instance
ref.current?.getEngine();

// Export
const blob = await ref.current?.exportToPNG();
const svg = ref.current?.exportToSVG();
const json = ref.current?.exportToJSON();

// Scene persistence
const data = ref.current?.getSceneData();
ref.current?.loadScene(data);
```

### `BoardierEngine`

For advanced/headless usage:

```ts
import { BoardierEngine, defaultTheme } from 'boardier';

const engine = new BoardierEngine(canvasElement, { showGrid: true }, defaultTheme);

engine.setTool('rectangle');
engine.undo();
engine.redo();
engine.deleteSelected();
engine.selectAll();
engine.zoomToFit();

// AI-facing API
const summary = engine.getSceneSummary();
const results = engine.searchElements('button');
engine.moveElement(elementId, 100, 200);
```

### Element Factories

```ts
import { createRectangle, createText, createArrow } from 'boardier';

const rect = createRectangle({ x: 100, y: 100, width: 200, height: 100 });
const text = createText({ x: 150, y: 300, text: 'Hello' });
const arrow = createArrow({ x: 100, y: 100 });
```

### Themes

```ts
import { defaultTheme, defaultDarkTheme, createNotierTheme } from 'boardier';

// Use built-in themes
<BoardierCanvas theme={defaultTheme} />
<BoardierCanvas theme={defaultDarkTheme} />

// Create a custom theme
const myTheme: BoardierTheme = {
  ...defaultTheme,
  canvasBackground: '#f0f0f0',
  elementDefaults: {
    ...defaultTheme.elementDefaults,
    strokeColor: '#e03131',
  },
};
```

### Mermaid Conversion

```ts
import { mermaidToBoardier } from 'boardier';

const elements = mermaidToBoardier(`
  graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do something]
    B -->|No| D[Do nothing]
`);

// Add to scene
ref.current?.getEngine().scene.addElements(elements);
```

## Documentation

Full auto-generated documentation is available at the `/docs` endpoint of the website, built from `@boardier-*` JSDoc annotations in the source code.

To regenerate the docs data:

```bash
npx tsx scripts/parseDocsFromSource.ts
```

## Project Structure

```
boardier/
├── index.ts              # Public API entry point
├── core/                 # Engine, Scene, Renderer, History, Clipboard, Types
├── elements/             # 16 element types + registry/factory system
├── tools/                # 13 tool implementations + base class
├── themes/               # Theme types + default/dark/notier themes
├── ui/                   # React UI components (canvas, toolbar, panels, etc.)
├── utils/                # Math, colors, export, ID gen, rough drawing, mermaid parser
├── scripts/              # Build-time scripts (docs parser)
└── website/              # Next.js marketing site + /demo + /docs
```

## Annotation System

Boardier uses custom `@boardier-*` JSDoc tags for documentation generation:

| Tag | Purpose |
|-----|---------|
| `@boardier-module` | Module identifier |
| `@boardier-category` | Grouping (Core, Elements, Tools, Themes, UI, Utilities) |
| `@boardier-description` | Module description |
| `@boardier-since` | Version introduced |
| `@boardier-usage` | Code example |
| `@boardier-see` | Cross-references |
| `@boardier-ai` | AI-specific notes |
| `@boardier-type` | Type documentation |
| `@boardier-class` | Class documentation |
| `@boardier-function` | Function documentation |
| `@boardier-param` | Parameter documentation |
| `@boardier-props` | React props interface |
| `@boardier-ref` | React ref interface |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Community

Boardier is a community project. No license restrictions — use it however you'd like. Built with care by [Notier.ai](https://notier.ai).
