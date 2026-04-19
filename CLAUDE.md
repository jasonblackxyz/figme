# FigMe

ASCII-grid design tool for the readme-app ecosystem. The readme-app renders its entire UI as a monospace character grid — every pixel is a cell, every border is a box-drawing character, every color is a style-key. FigMe provides a Figma-like design surface that understands these constraints natively so the PM can visually compose layouts and export structured specs.

## Dual-Audience Architecture

FigMe serves two consumers simultaneously:

- **Human PM** — visual drag-and-drop canvas, layers panel, property inspector, zoom/pan
- **AI coding agent (Claude in Chrome)** — reads designs via DOM structure, per-cell `data-col` / `data-row` attributes, a live `[data-spec="full-document"]` JSON panel, and `FIGME_STATE` / `FIGME_PROPERTY_CHANGE` console events. Mutates designs via `window.FigMe.*` (see `src/features/agent-api/`). A **raw briefing mode** (UI store `agentBriefingMode: 'full' | 'raw'`) swaps the default constrained briefing for unconstrained capability docs — per user preference, raw mode must remain purely descriptive, never prescriptive. No canvas rendering — everything is semantic HTML so the agent never needs screenshots.

## Core Domain Constraint

**Grid cells are the atomic unit.** No sub-cell positioning anywhere. Padding, kerning, spacing, dimensions — all measured in integer cells. Everything snaps to the grid. Default: IBM Plex Mono 14px, line-height 1.35, producing ~8.4px × 18.9px cells.

## Architecture

Strict layered architecture, enforced by ESLint:

```
Primitives (src/primitives/)  — pure logic, no React, no store imports
    ↓ consumed by
Stores (src/stores/)          — Zustand state (document, tool, UI, viewport)
Features (src/features/)      — business logic with UI awareness
Renderer (src/renderer/)      — React components for grid display
Hooks (src/hooks/)            — custom React hooks
    ↓ composed in
App (src/App.tsx)             — shell layout (CSS Grid: toolbar, layers, canvas, properties, status bar)
```

**Boundary rule:** `src/primitives/` must NOT import from `@features`, `@stores`, or `@renderer`. This is ESLint-enforced via both alias-based patterns (`@features/*`) and relative path patterns (`**/features/*`), preventing any bypass through relative imports.

## Key Primitives (`src/primitives/`)

| Module | Purpose |
|--------|---------|
| `grid-engine` | Cell measurement, pixel↔grid conversion, snapping, rect math, viewport presets |
| `stamp-system` | StampBuffer (chars[][] + styles[][]) — the intermediate representation between logic and rendering. Border stamps (rounded/double/section/custom), fill, merge |
| `style-system` | 56 StyleKey palette mirroring readme-app's theme. StyleDef = {color, bg, fontWeight?} |
| `document-model` | Layer/Page/Document CRUD. LayerKinds: border-box, text-block, figlet-text, divider, image, edge-path, group, component, canvas |
| `color-utils` | Color conversion and manipulation helpers used across features |
| `layout-engine` | **@experimental** Guides, auto-layout (direction/gap/padding/alignment), alignment computation — stubs, deferred to Tier 2 |
| `figlet-engine` | **@experimental** FLF font parsing, ASCII art text rendering — stubs, deferred to Tier 2 |
| `char-registry` | Searchable Unicode character catalog (39 chars currently, ~500 planned for Tier 2), categories, in-memory favorites/recents |
| `image-pipeline` | **@experimental** Image→ASCII conversion (5 styles: classic, smooth, braille, contour, hatch) — stubs, deferred to Tier 2 |
| `pattern-fill` | Repeating tile patterns for rectangular region fills |
| `text-flow` | Text layout, word-wrap, line breaking within bounded regions |

## Stores (`src/stores/`)

All exported as hooks: `useDocumentStore`, `useToolStore`, `useUiStore`, `useViewportStore`.

- Document store has undo/redo (max 50 entries) and per-tab auto-save to localStorage/IndexedDB
- Tool store tracks active tool (select, border-box, text-block, figlet-text, divider, image, edge-path, hand, draw)
- UI store tracks panel state, selection, `agentBriefingMode`, and draw-tool state (brush size, eraser)
- Immutable state updates throughout (spread, slice, map, filter — never mutate)

## Commands

```
npm run dev           # Vite dev server
npm run build         # tsc -b && vite build
npm run test          # Vitest single run
npm run test:watch    # Vitest watch mode
npm run test:coverage # Coverage report
npm run lint          # ESLint
npm run typecheck     # tsc -b --noEmit
```

## Code Conventions

- **TypeScript strict mode** — noUnusedLocals, noUnusedParameters, noUncheckedIndexedAccess
- **Path aliases** — `@primitives`, `@stores`, `@features`, `@renderer`, `@hooks`, `@shared` (configured in both tsconfig and vite)
- **Module pattern** — types.ts (types), operations.ts (functions), index.ts (public API re-exports)
- **Store pattern** — `create<State>((set, get) => ({...}))`, exported as `useXxxStore`
- **CSS Modules** — camelCase locals convention, scoped class names
- **Immutability** — all document/state operations return new objects, never mutate
- **IDs** — `layer_${Date.now()}_${counter}`, `page_...`, `comp_...`

## Testing

- **Vitest** with jsdom environment, globals enabled (no imports needed for describe/it/expect)
- **Coverage thresholds** on `src/primitives/` only: 90% statements, 85% branches, 90% functions, 90% lines
- Test files colocated: `__tests__/` directories or `.test.ts` suffix
- Primitives are pure functions — test directly, no mocks needed
- Store tests: `useXxxStore.getState()` for synchronous access, `setState()` for reset in beforeEach

## StampBuffer — The Core Abstraction

The stamp buffer (`chars[][]` + `styles[][]`) is the bridge between logic and display. Primitives write characters and style-keys into buffers. Buffers get merged (later layers on top). The renderer reads the final merged buffer and produces styled DOM spans with `data-col`/`data-row` attributes. This keeps rendering and logic cleanly separated.

## Agent API (`src/features/agent-api/`)

`window.FigMe` is the Chrome agent's write surface — document mutation mirrored from the human toolbar. Notable:

- `FigMe.paint()` writes a `canvas` LayerKind with per-cell characters and colors — the freeform escape hatch from structured primitives (border-box, text-block, etc.).
- `FigMe.batch(fn)` suppresses `FIGME_STATE` / `FIGME_PROPERTY_CHANGE` console events during multi-op sequences; use it for any change set that would otherwise emit many events.
- Agent-facing capability docs live in `src/renderer/AgentBriefing.tsx`. Raw briefing mode shows unconstrained capabilities; keep it descriptive, never prescriptive.
