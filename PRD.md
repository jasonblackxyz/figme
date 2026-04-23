# FIGMII — Product Requirements Document

**An ASCII-Grid Design Tool for the readme-app Ecosystem**

Version 2.0 · April 4, 2026

---

## 1. Problem Statement

The readme-app uses a unique ASCII character grid rendering system where every pixel of the interface is a monospace character cell. Designing new features for this system is currently done entirely through written descriptions—there is no visual tool that understands the grid's constraints (fixed cell sizes, discrete spacing, box-drawing character borders, style-key-driven theming). This makes it hard for the PM to communicate layout intent and hard for the developer to interpret it accurately.

Figmii solves this by providing a Figma-inspired design tool purpose-built for ASCII grid interfaces. It lets the PM visually compose layouts using the exact same grid primitives the readme-app uses, then export those designs as both visual screenshots and structured data the developer (an AI agent using Claude in Chrome) can consume programmatically.

---

## 2. Users & Personas

### Primary: PM / Designer (Human)

The person who decides what features look like. They need to drag-and-drop ASCII components onto a grid canvas, adjust spacing, pick fonts, preview how text flows inside bordered regions, and export the result. They think visually and want the tool to feel like Figma—layers panel, property inspector, canvas with zoom/pan—but constrained to the ASCII grid domain.

### Secondary: Agent Developer (Claude in Chrome)

An AI coding agent that reads design specs from the Figmii interface and implements them in the readme-app codebase. Claude in Chrome reads web pages through the accessibility tree and DOM structure—it cannot see canvas-rendered content. This means Figmii must expose every design decision as structured, semantic HTML alongside the visual preview. The agent dev needs to extract grid coordinates, component types, style keys, text content, padding values, and font choices without relying on screenshots.

**Implications for the agent dev persona:**

- All design data must be present in the DOM (not only rendered to `<canvas>`)
- Semantic HTML with proper ARIA labels, `data-*` attributes, and meaningful element structure
- A "Spec View" or structured export panel that presents the design as JSON or a readable specification
- Console-logged state updates when the design changes, so the agent can read current state via DevTools
- Avoid modals that block interaction; prefer inline panels

---

## 3. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 19 + TypeScript 5.9 | Matches readme-app; shared type definitions |
| Build | Vite 7 | Matches readme-app; fast HMR for design iteration |
| State | Zustand | Lightweight, works well with complex nested state (layers, selections, undo history) |
| Canvas | DOM-based grid rendering (not `<canvas>`) | Agent-accessible; reuses readme-app's `renderGridToElements()` pipeline |
| Styling | CSS Modules + CSS Variables | Theme variables mirror readme-app's `--theme-*` system |
| Fonts | IBM Plex Mono (default) + FIGlet font library | Monospace required for grid alignment; FIGlet for display text |
| Testing | Vitest + Playwright | Unit tests for grid math; E2E for export flows |
| Deployment | Standalone app, own repo + URL | Independent release cycle; imports shared ASCII utilities |

---

## 4. Architecture: Foundation & Primitives

The architecture is organized into two tiers. **Tier 1 (Foundation)** establishes the core primitives that every feature depends on. **Tier 2 (Features)** builds design tools on top of those primitives. The foundation must be rock-solid and atomized before feature work begins—every primitive should be a self-contained, composable unit that feature layers consume without modification.

**Everything in this document is ordered by dependency.** Within each tier, items are numbered in build order—each item depends only on items with lower numbers. No forward dependencies exist.

---

### 4.1 Tier 1 — Foundation Primitives

These are the irreducible building blocks. Each primitive is a standalone module with its own types, tests, and documentation. Nothing in Tier 2 should ever need to reach past a primitive's public API.

#### F1. Grid Engine

**Depends on:** Nothing. This is the root of the dependency tree.

The mathematical core. No rendering, no React—pure functions and types.

```typescript
// Core types
interface GridConfig {
  fontFamily: string;          // e.g. "'IBM Plex Mono', monospace"
  fontSize: number;            // e.g. 14
  lineHeight: number;          // e.g. 1.35
  cellWidth: number;           // computed from font measurement (px)
  cellHeight: number;          // computed from font measurement (px)
  canvasCols: number;          // total columns in design canvas
  canvasRows: number;          // total rows in design canvas
}

interface GridPosition {
  col: number;
  row: number;
}

interface GridRect {
  col: number;
  row: number;
  width: number;               // in columns
  height: number;              // in rows
}

// Viewport size presets
interface ViewportPreset {
  name: string;                // e.g. "Desktop 1920×1080"
  widthPx: number;
  heightPx: number;
  cols: number;                // computed: Math.floor(widthPx / cellWidth)
  rows: number;                // computed: Math.floor(heightPx / cellHeight)
}
```

**Note:** readme-app calls this `CharGrid` (with fields `charWidth`, `charHeight`, `cols`, `rows`). Figmii extends it with additional config fields like `fontFamily` and `fontSize` to make the grid fully configurable. The measurement logic is ported from `useCharGrid.ts` but extracted as a pure function independent of React hooks.

**Responsibilities:**
- Measure character cell dimensions from a given font configuration (port `useCharGrid` logic to a pure function)
- Convert between pixel coordinates and grid coordinates
- Validate grid positions (bounds checking)
- Compute rect intersections, containment, overlap detection
- Snap arbitrary pixel positions to nearest grid cell
- Calculate available inner space given a rect + padding
- Compute `ViewportPreset` values from pixel dimensions and current cell size
- Provide built-in presets: 1920×1080 (desktop), 1440×900 (laptop), 1280×720 (small), 2560×1440 (QHD), and custom

**Default grid config** should match readme-app exactly: IBM Plex Mono, 14px, line-height 1.35. But every parameter is editable in the tool's settings panel.

**Key constraint:** Grid cells are the atomic unit of measurement throughout the entire application. There is no sub-cell positioning. Padding is measured in cells. Kerning is measured in cells. Everything snaps to the grid.

**Acceptance criteria:**
- Pure functions pass unit tests for measurement, coordinate conversion, snapping, rect math
- Default config matches readme-app (IBM Plex Mono 14px/1.35)
- Config is editable and all downstream computations update
- All 5 viewport presets produce correct col/row counts for the default font

---

#### F2. Character Registry

**Depends on:** Nothing.

A structured, searchable catalog of Unicode characters relevant to ASCII grid design. This is the data layer behind the Character Picker UI (Tier 2) and is also consumed by the Stamp System and Pattern Fill Library.

```typescript
interface CharEntry {
  char: string;                // the Unicode character
  codepoint: number;           // e.g. 0x2500
  name: string;                // Unicode name, e.g. "BOX DRAWINGS LIGHT HORIZONTAL"
  category: CharCategory;
  tags: string[];              // searchable tags: ["horizontal", "line", "thin"]
  width: 'narrow' | 'wide';   // whether it occupies 1 or 2 cells in monospace
}

type CharCategory =
  | 'box-drawing'              // ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ ╭ ╮ ╰ ╯ etc.
  | 'box-double'               // ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬ etc.
  | 'block-elements'           // █ ▓ ▒ ░ ▄ ▀ ▌ ▐ ▖ ▗ ▘ ▙ ▚ ▛ ▜ ▝ ▞ ▟
  | 'braille'                  // ⠀ ⠁ ⠂ ... ⣿
  | 'arrows'                   // ← ↑ → ↓ ↗ ↘ ↙ ↖ ⇐ ⇒ ▲ ▼ ◄ ►
  | 'mathematical'             // ± × ÷ ≠ ≤ ≥ ∞ ∑ ∏ √ ∫
  | 'geometric'                // ● ○ ◉ ◎ ■ □ ◆ ◇ ▪ ▫ ★ ☆ ♦ ♠ ♣ ♥
  | 'dingbats'                 // ✓ ✗ ✦ ✧ ✪ ❤ ❥ ☑ ☐
  | 'technical'                // ⌘ ⌥ ⇧ ⏎ ⏏ ⎋ ⌫ ⌦
  | 'punctuation-extended'     // · • ‣ ‖ ¶ § † ‡ … ‰
  | 'custom';                  // user-defined characters

interface CharRegistry {
  entries: CharEntry[];
  favorites: string[];         // user's favorited characters (persisted)
  recent: string[];            // recently used (max 50, persisted)
  search(query: string): CharEntry[];  // search by name, tags, or character
  getByCategory(cat: CharCategory): CharEntry[];
  addCustom(char: string, tags: string[]): void;
}
```

**Responsibilities:**
- Ship with a comprehensive built-in catalog (~500 characters relevant to ASCII design)
- Full-text search across character names and tags
- Category-based filtering
- Track recently used and favorite characters (persisted to localStorage)
- Validate whether a character renders correctly in the current monospace font (some glyphs may not be available)

**Acceptance criteria:**
- All box-drawing, block-element, and braille characters from Unicode are cataloged
- Search returns results for both character names ("horizontal") and visual descriptions ("line")
- Recently-used and favorites persist across sessions

---

#### F3. Style & Theme System

**Depends on:** F1 (Grid Engine—for measurement context when computing style previews).

Directly mirrors readme-app's palette system so designs are WYSIWYG relative to the actual app.

```typescript
type StyleKey = /* import all 56 keys from readme-app's tree-ascii/types.ts */

interface StyleDef {
  color: string;               // foreground hex
  bg: string;                  // background hex
  fontWeight?: number;         // optional bold
}

type Palette = Record<StyleKey, StyleDef>;
```

**Responsibilities:**
- Import and use readme-app's theme definitions directly (56 style keys as of April 2026)
- Allow custom theme creation within Figmii
- Map style keys to CSS variables for live preview
- Support theme switching (preview design under different themes)
- Export theme as JSON for handoff

**Acceptance criteria:**
- All 56 readme-app style keys imported
- `createAsciiPalette()` produces correct color mappings
- Theme switching works and all grid cells update in real time

---

#### F4. Character Stamp System

**Depends on:** F1 (Grid Engine), F2 (Character Registry), F3 (Style System).

The system for writing characters into a grid buffer. Ported from readme-app's `charUtils.ts` but generalized for design-time use.

```typescript
interface StampBuffer {
  chars: string[][];           // 2D character buffer
  styles: StyleKey[][];        // 2D style key buffer
  width: number;               // buffer columns
  height: number;              // buffer rows
}
```

**Stamp functions to port from readme-app:**

| Function | Source | Characters |
|----------|--------|------------|
| `stampNodeBox` | `charUtils.ts` | `╭ ╮ ╰ ╯ │ ─` (single-line rounded) |
| `stampModalBox` | `charUtils.ts` | `╔ ╗ ╚ ╝ ║ ═` (double-line heavy) |
| `stampSectionFrame` | `charUtils.ts` | `┌ ┐ └ ┘ │ ─` (single-line with inset title) |
| `stampDivider` | `charUtils.ts` | `─` (horizontal line) |
| `stampHorizontalDivider` | `queryStamp.ts` (internal helper, not exported) | `╟ ─ ╢` (divider with tee connectors) |

**New stamp functions for Figmii:**

| Function | Purpose |
|----------|---------|
| `stampCustomBorder` | Draw arbitrary rectangular border with user-selected character set (from Character Registry) |
| `stampFigletText` | Render text using a FIGlet font into the grid buffer |
| `stampImage` | Render an image into a grid region using the ASCII image pipeline |
| `stampFill` | Fill a rectangular region with a single character and style key |
| `stampPatternFill` | Fill a rectangular region with a repeating pattern tile |

Each stamp function must be pure: it takes a buffer and parameters, returns a new buffer (or mutates in place with clear documentation). No side effects, no DOM access.

**Acceptance criteria:**
- All 5 readme-app stamp functions ported and passing visual regression tests
- New `stampCustomBorder`, `stampFill`, `stampPatternFill`, `stampFigletText` implemented
- Every stamp function is pure and has unit tests

---

#### F5. Text Flow Engine

**Depends on:** F1 (Grid Engine), F4 (Stamp System).

A standalone engine for flowing text within bounded grid regions. This is elevated from a simple stamp function to its own primitive because multiple features depend on it: live text reflow preview, auto-layout (which needs to know how tall text will be after wrapping), and clipboard paste (which needs to parse pasted text into the grid).

```typescript
interface TextFlowConfig {
  content: string;               // raw text (supports # headings, **bold**)
  boundingRect: GridRect;        // outer bounds
  padding: {                     // inner padding (in cells)
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  kerning: 0 | 1 | 2;           // extra spaces between characters
  lineSpacing: 0 | 1;           // extra rows between lines
  alignment: 'left' | 'center' | 'right';
}

interface TextFlowResult {
  lines: FlowLine[];            // the computed lines after wrapping
  totalRows: number;            // total rows the text occupies
  overflow: boolean;            // true if text exceeds bounding rect
  overflowLineCount: number;    // how many lines didn't fit
}

interface FlowLine {
  row: number;                  // grid row this line renders at
  segments: FlowSegment[];      // inline segments (plain, bold, heading)
}

interface FlowSegment {
  text: string;
  styleKey: StyleKey;
  col: number;                  // starting column
}
```

**Responsibilities:**
- Word-wrap text within a bounded region, respecting padding
- Apply discrete kerning (0, 1, or 2 extra spaces between every character)
- Apply line spacing (0 or 1 extra rows between lines)
- Parse markdown-like inline formatting: `# headings`, `**bold**`
- Compute the total rows required for the text (used by auto-layout to size containers)
- Report overflow when text exceeds the bounding rect
- Support all three alignment modes

**Kerning detail:**
- Kerning 0 = normal monospace (1 cell per character)
- Kerning 1 = 1 extra space between every character (effectively 2 cells per character)
- Kerning 2 = 2 extra spaces between every character (3 cells per character)
- Negative kerning is not possible in a character grid
- When kerning is applied, the effective characters-per-line decreases proportionally. The text reflows automatically.

**Acceptance criteria:**
- Word-wrap produces correct line breaks at word boundaries for all kerning levels
- Overflow detection is accurate (matches manual count)
- Heading/bold parsing produces correct `FlowSegment` arrays
- Alignment places text at correct column offsets
- `totalRows` computation is exact (consumed by auto-layout)

---

#### F6. FIGlet Font Engine

**Depends on:** F4 (Stamp System—for `stampFigletText`).

A client-side FIGlet renderer that loads `.flf` font files and renders text into character grids.

**Requirements:**
- Parse standard FIGlet `.flf` format (header line, comment lines, character definitions)
- Render arbitrary strings to a 2D character array
- Support horizontal smushing rules per the FIGlet spec
- Ship with a bundled set of fonts (see below)
- Allow users to upload additional `.flf` files
- Font preview panel showing the full alphabet rendered in each available font

**Bundled fonts (minimum set):**

| Font | Style | Notes |
|------|-------|-------|
| Standard | Classic block | The default FIGlet font |
| Banner | Wide/tall | Good for headers |
| Koholint | Pixel art (▄ █ ▀) | Link's Awakening inspired; netspooky/uJunk |
| Small | Compact | For tight spaces |
| Slant | Italic block | Stylistic variety |
| Big | Large block | Impact headers |
| Mini | Tiny | Minimal space usage |
| Ivrit | Right-to-left | Diversity of direction |
| Script | Cursive | Decorative |
| Shadow | Drop shadow | Depth effect |

The Koholint font (from `github.com/netspooky/uJunk/blob/main/art/asciifonts/koholint.flf`) uses Unicode block characters (▄ █ ▀) to create a pixel-art aesthetic. It is a priority inclusion.

Additional `.flf` fonts can be sourced from the [FIGlet font library](http://www.figlet.org/fontdb.cgi) and bundled at build time.

**Acceptance criteria:**
- Parses `.flf` files correctly (header, comments, character definitions)
- Renders text to 2D char array with correct smushing
- All 10 bundled fonts load and render correctly
- User-uploaded `.flf` files load without errors

---

#### F7. ASCII Image Pipeline

**Depends on:** F1 (Grid Engine), F4 (Stamp System).

Ported from readme-app's image rendering system. Converts raster images to ASCII character grids.

**Source files to port:**
- `imageAscii.ts` — five rendering styles (classic, smooth, braille, contour, hatch)
- `charBrightness.ts` — character brightness measurement
- `galleryImageProcessor.ts` — image-to-cell-data conversion with cover-crop

**Enhancements for Figmii:**
- Adjustable output dimensions (user sets target cols × rows)
- Live preview as parameters change
- Brightness/contrast sliders
- Export the rendered ASCII as a text block layer

**Acceptance criteria:**
- All 5 rendering styles (classic, smooth, braille, contour, hatch) produce correct output
- Adjustable dimensions work without distortion
- Brightness/contrast sliders affect output in real time

---

#### F8. Pattern Fill Library

**Depends on:** F2 (Character Registry), F4 (Stamp System).

A library of repeating character patterns that can fill rectangular regions. Unlike solid fills (one character repeated), pattern fills use a small tile that repeats across the region—the ASCII equivalent of texture fills in graphic design tools.

```typescript
interface PatternTile {
  id: string;
  name: string;
  chars: string[][];           // 2D tile (e.g. 2×2, 3×3, 4×4)
  styles: StyleKey[][];        // style per cell in the tile
  category: PatternCategory;
}

type PatternCategory =
  | 'dots'                     // `. . . .` / `· · · ·`
  | 'crosshatch'              // `/ \ / \` alternating rows
  | 'wave'                    // `~ ~ ~ ~` / `∿ ∿ ∿ ∿`
  | 'brick'                   // staggered `|` and `─` blocks
  | 'diagonal'                // `╱ ╲ ╱ ╲` or `/ / / /`
  | 'shade'                   // `░`, `▒`, `▓` (light/medium/heavy)
  | 'custom';                 // user-defined

interface PatternFillConfig {
  tileId: string;              // which pattern tile to use
  region: GridRect;            // area to fill
  offsetCol: number;           // tile offset for alignment control
  offsetRow: number;
  styleOverride?: StyleKey;    // optional: override tile's built-in style
}
```

**Built-in patterns (minimum set):**

| Pattern | Tile | Visual |
|---------|------|--------|
| Light dots | `[". ", " ."]` | `. . . .` staggered |
| Heavy dots | `["· ", " ·"]` | `· · · ·` staggered |
| Crosshatch | `["/ \\", "\\ /"]` | Alternating diagonals |
| Horizontal wave | `["~-", "-~"]` | Gentle wave |
| Light shade | `["░"]` | Uniform light fill |
| Medium shade | `["▒"]` | Uniform medium fill |
| Heavy shade | `["▓"]` | Uniform heavy fill |
| Brick | `["─┤", "├─"]` | Offset brick pattern |
| Grid dots | `["+──", "│  ", "│  "]` | Sparse grid |

**Responsibilities:**
- Ship with 9+ built-in patterns
- Tile a pattern across any rectangular region with configurable offset
- Allow users to create custom pattern tiles (draw a small grid, save as tile)
- Preview patterns at different scales in the Pattern Fill panel

**Acceptance criteria:**
- All 9 built-in patterns render correctly across regions of various sizes
- Tile offset shifts the pattern alignment as expected
- Custom pattern creation and saving works
- Pattern fills compose correctly with border boxes (fill the interior)

---

#### F9. Layer Model & Document Model

**Depends on:** F1 (Grid Engine), F3 (Style System).

The document model that represents a Figmii design. Every element on the canvas is a layer. The document model supports multiple pages (artboards) for designing multi-screen flows.

```typescript
type LayerKind =
  | 'border-box'       // any of the border styles (rounded, double, section, custom)
  | 'text-block'       // flowing text with word-wrap, padding, kerning
  | 'figlet-text'      // large display text rendered via FIGlet font
  | 'divider'          // horizontal or vertical line
  | 'image'            // ASCII-rendered image
  | 'edge-path'        // Manhattan-routed connection between two layers
  | 'group'            // grouping container (like Figma groups)
  | 'component'        // reusable component instance (references a component definition)

interface Layer {
  id: string;
  kind: LayerKind;
  name: string;                // user-editable display name
  rect: GridRect;              // position and size on canvas
  visible: boolean;
  locked: boolean;
  opacity: number;             // 0–1
  styleKey: StyleKey;          // primary style from palette
  children?: string[];         // child layer IDs (for groups/components)
  parentId?: string;           // parent layer ID
  properties: LayerProperties; // kind-specific properties (see below)

  // Auto-layout properties (optional, for layers inside auto-layout groups)
  autoLayout?: AutoLayoutConfig;
}
```

**Kind-specific properties:**

```typescript
// Border box
interface BorderBoxProperties {
  borderStyle: 'rounded' | 'double' | 'section' | 'custom';
  borderChars?: CustomBorderChars; // for 'custom' style
  title?: string;                   // for 'section' style (inset title)
  titleStyleKey?: StyleKey;
  bgStyleKey?: StyleKey;
  fillPattern?: string;             // optional pattern tile ID (from Pattern Fill Library)
  padding: { top: number; right: number; bottom: number; left: number }; // in cells
  scrollable?: boolean;             // if true, content can exceed visible rect
  totalContentRows?: number;        // total rows of content (for scroll preview)
}

// Text block
interface TextBlockProperties {
  content: string;                  // raw text (supports markdown-like: # headings, **bold**)
  fontFamily: string;               // for the text content
  kerning: 0 | 1 | 2;              // extra spaces between characters
  lineSpacing: 0 | 1;              // extra rows between lines
  alignment: 'left' | 'center' | 'right';
  styleKey: StyleKey;               // text style
  headingStyleKey?: StyleKey;       // style for # headings
  boldStyleKey?: StyleKey;          // style for **bold**
}

// FIGlet text
interface FigletTextProperties {
  content: string;                  // the text to render
  fontName: string;                 // FIGlet font identifier
  alignment: 'left' | 'center' | 'right';
  styleKey: StyleKey;
}

// Image
interface ImageProperties {
  src: string;                      // image URL or data URI
  renderStyle: 'classic' | 'smooth' | 'braille' | 'contour' | 'hatch';
  brightness: number;               // adjustment
  contrast: number;                 // adjustment
  invert: boolean;
}

// Edge path
interface EdgePathProperties {
  sourceLayerId: string;
  targetLayerId: string;
  routingStyle: 'manhattan' | 'straight';
  waypoints: GridPosition[];        // user-defined routing waypoints
  styleKey: StyleKey;
}

// Custom border character set
interface CustomBorderChars {
  tl: string; t: string; tr: string;
  l: string;             r: string;
  bl: string; b: string; br: string;
}

// Auto-layout configuration (for group-type layers)
interface AutoLayoutConfig {
  direction: 'vertical' | 'horizontal';
  gap: number;                      // cells between children
  padding: { top: number; right: number; bottom: number; left: number };
  alignment: 'start' | 'center' | 'end';
  sizing: 'hug-contents' | 'fixed';  // whether parent resizes to fit children
}
```

**Document model with multi-page support:**

```typescript
interface FigmiiDocument {
  id: string;
  name: string;
  gridConfig: GridConfig;
  palette: Palette;
  pages: FigmiiPage[];              // multiple pages / artboards
  activePageId: string;            // which page is currently shown
  components: Record<string, ComponentDef>; // reusable component library (shared across pages)
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
  };
}

interface FigmiiPage {
  id: string;
  name: string;                    // e.g. "Modal - Open State", "Dashboard", "Settings"
  layers: Record<string, Layer>;   // flat map, tree structure via parentId
  layerOrder: string[];            // z-order (back to front)
  viewportPreset?: string;         // optional viewport size preset name
  canvasColsOverride?: number;     // artboard-level override of grid dimensions
  canvasRowsOverride?: number;
  // Position on the infinite canvas (in absolute pixel coordinates at 100% zoom)
  canvasX: number;                 // left edge of this artboard on the infinite canvas
  canvasY: number;                 // top edge of this artboard on the infinite canvas
}

interface ComponentDef {
  id: string;
  name: string;
  description: string;
  sourceLayerIds: string[];        // the layers that make up this component
  thumbnail?: string;              // base64 preview
}
```

**Multi-page rationale:** Design workflows almost always involve multiple screens or states. Figmii pages are analogous to Figma pages—each is its own canvas with its own layer tree. This lets you mock up "modal open" vs "modal closed" states, or design several views of a flow side by side. Components are shared across all pages in a document.

**Acceptance criteria:**
- Layer CRUD operations work
- Document serializes to/from JSON roundtrip without data loss
- Multi-page navigation works (add, rename, delete, switch pages)
- Components are shared across pages

---

#### F10. Undo/Redo System

**Depends on:** F9 (Document Model).

Immutable state snapshots with command pattern.

```typescript
interface HistoryEntry {
  timestamp: number;
  description: string;             // human-readable ("Move text-block to (4, 12)")
  snapshot: FigmiiDocument;         // full document state
}
```

Use Zustand middleware for undo/redo with configurable history depth (default 50). Every mutation to the document creates a history entry.

**Acceptance criteria:**
- 50-level undo/redo with Zustand middleware
- Every mutation creates a history entry
- Undo/redo response < 16ms

---

#### F11. Layout Constraint Engine

**Depends on:** F1 (Grid Engine), F5 (Text Flow Engine), F9 (Layer Model).

A pure-function engine that computes spatial relationships between layers and drives both smart guides and auto-layout. This is the computational core for constraint-based design—it knows nothing about UI, just geometry and rules.

```typescript
// Smart guide computation
interface GuideResult {
  guides: Guide[];                 // lines to render as visual guides
  snapSuggestion?: GridPosition;   // snapped position if within threshold
}

interface Guide {
  orientation: 'horizontal' | 'vertical';
  position: number;                // col (for vertical) or row (for horizontal)
  fromCell: number;                // start of guide line
  toCell: number;                  // end of guide line
  kind: 'edge' | 'center' | 'spacing' | 'padding';
  label?: string;                  // e.g. "2 cells" for spacing guides
}

// Auto-layout computation
interface AutoLayoutResult {
  childRects: Record<string, GridRect>;  // computed rects for each child layer
  parentRect: GridRect;                   // computed parent rect (if sizing = 'hug-contents')
  overflow: boolean;                      // true if children exceed parent bounds
}

// Alignment computation
interface AlignmentResult {
  newPositions: Record<string, GridPosition>;
}

type AlignmentMode =
  | 'align-left' | 'align-center-h' | 'align-right'
  | 'align-top' | 'align-center-v' | 'align-bottom'
  | 'distribute-h' | 'distribute-v';
```

**Responsibilities:**

**Smart guides:**
- Given a layer being dragged and all other layers on the page, compute alignment guides
- Detect edge-to-edge, center-to-center, and spacing relationships
- Snap the dragged layer to the nearest guide within a threshold (default: 1 cell)
- Show distance labels (e.g. "3 cells") for spacing guides
- Detect padding-boundary proximity when dragging inside a border-box

**Auto-layout:**
- Given a group layer with `autoLayout` config and its children, compute the position of each child
- Stack children vertically or horizontally with the configured gap (in cells)
- Apply padding around the stack
- When `sizing = 'hug-contents'`, compute the parent rect to exactly contain the children + padding
- When a child's content changes (e.g. text reflows to more rows), recompute the stack—this is where the Text Flow Engine is consumed

**Alignment & distribution:**
- Given a set of selected layers and an alignment mode, compute new positions
- For distribution: compute even spacing between layers. Since spacing is discrete (cells), distribute the remainder by adding 1 extra cell to the first N gaps (where N = total_space mod count). Show the user which gaps got the extra cell.

**Acceptance criteria:**
- Smart guides detect all four kinds (edge, center, spacing, padding) correctly
- Auto-layout stacks children with correct gaps and padding
- Hug-contents resizes parent when child content changes
- Alignment produces correct positions for all 6 alignment modes
- Distribution handles remainder cells correctly and deterministically

---

#### F12. DOM Grid Renderer

**Depends on:** F4 (Stamp System), F3 (Style System).

The rendering pipeline that converts stamp buffers into React elements for the design canvas.

**Implementation approach:** DOM-based rendering using readme-app's `renderGridToElements()` pipeline. The grid is rendered as `<div>` rows containing `<span>` segments, exactly as readme-app does it. This keeps the preview WYSIWYG and—critically—accessible to Claude in Chrome via the DOM.

**Agent-friendliness:**
- Each rendered grid cell should have `data-col` and `data-row` attributes
- Selected layers should have `aria-selected="true"` and `data-layer-id`
- The viewport should expose its current scroll offset and zoom level in the DOM

**Acceptance criteria:**
- `renderGridToElements()` produces correct React output from stamp buffers
- Grid cells have `data-col`/`data-row` attributes
- Output matches readme-app's rendering for identical inputs

---

#### F13. Agent Instruction Layer

**Depends on:** F9 (Layer Model types), F3 (Style System types)—needs to reference these in the briefing JSON.

Figmii embeds a hidden instruction system directly in the DOM so that a Claude in Chrome agent gets an immediate, comprehensive briefing every time it opens the app—without any of that content being visible to human users.

### Why This Matters

Claude in Chrome reads web pages primarily through the **accessibility tree**—a structured, semantic representation of the DOM. By embedding rich instructions in the accessibility tree, we ensure the agent dev understands Figmii's unique domain (ASCII grids, cell-based spacing, style keys, stamp functions) the moment it opens the page, without needing a separate briefing document.

### Implementation Architecture

The instruction system uses three complementary layers, ordered by reliability:

**Layer 1: `aria-describedby` + Hidden JSON Briefing (Primary)**

The accessibility tree includes content referenced by `aria-describedby` even when the referenced element has `display:none`. Claude in Chrome's `read_page` tool will surface this content every time.

```html
<html>
<head>
  <script type="application/json" id="figmii-agent-briefing">
  {
    "system": "Figmii — ASCII Grid Design Tool",
    "version": "2.0",
    "purpose": "Design tool for composing ASCII character grid interfaces. Designs target the readme-app rendering engine.",

    "gridSystem": {
      "description": "The canvas is a 2D grid of monospace character cells. Every position is addressed by (col, row). There are no sub-cell positions—everything snaps to integer cell coordinates.",
      "defaults": {
        "fontFamily": "IBM Plex Mono, monospace",
        "fontSize": "14px",
        "lineHeight": 1.35,
        "approxCellWidth": "8.4px",
        "approxCellHeight": "18.9px"
      },
      "measurement": "Cell dimensions are measured at runtime from the configured monospace font. The grid re-measures on font or size changes."
    },

    "layerKinds": {
      "border-box": "Rectangular border drawn with box-drawing characters (╭╮╰╯│─ for rounded, ╔╗╚╝║═ for double, ┌┐└┘│─ for section frames). Has padding (in cells), optional title, optional pattern fill, background style.",
      "text-block": "Flowing text with word-wrap within a bounded region. Supports markdown-like formatting (# headings, **bold**). Kerning is discrete: 0 (normal), 1 (one extra space between chars), 2 (two extra spaces). No negative kerning.",
      "figlet-text": "Large display text rendered using a FIGlet font (.flf format). Output is a 2D character array stamped into the grid.",
      "divider": "Horizontal or vertical line using ─ or │ characters, optionally with tee connectors (╟─╢).",
      "image": "Raster image converted to ASCII using brightness-to-character mapping. Five styles: classic, smooth, braille, contour, hatch.",
      "edge-path": "Manhattan-routed connection between two layers using ─│┌┐└┘ characters. Supports user-defined waypoints.",
      "group": "Container that groups child layers. Can have auto-layout (vertical/horizontal stacking with gap).",
      "component": "Instance of a reusable component definition."
    },

    "styleSystem": {
      "description": "Every grid cell has a StyleKey that maps to a foreground color, background color, and optional font weight via the active theme's palette.",
      "keyCategories": {
        "background": ["bg", "dot", "border", "dim"],
        "nodes": ["text", "badge", "edge", "accentBorder", "accentText", "nodeBg"],
        "modals": ["modalBorder", "modalBg", "modalTitle", "modalText", "modalClose", "modalTab", "modalTabActive", "modalHint", "modalTitleBold", "modalHeading"],
        "query": ["queryBorder", "queryBg", "queryText", "queryCursor", "queryHint", "queryButton", "queryButtonActive", "queryError", "queryPill", "queryPillBlink", "queryDivider", "queryCitation", "queryMatch"],
        "text": ["textBold", "dimOnCard"],
        "etchASketch": ["etchFrame", "etchScreen", "etchScreenBorder", "etchTrail", "etchCursor", "etchKnob"],
        "ghost": ["ghostBlob", "ghostEye", "ghostBubbleBorder", "ghostBubbleBg", "ghostBubbleText", "ghostBubbleUser", "ghostInput", "ghostInputCursor", "ghostClose", "ghostInputHint"]
      }
    },

    "howToReadDesignSpecs": {
      "specViewPanel": "Toggle the Spec View panel (Ctrl+Shift+S) to see the full document as structured JSON. The JSON is in a <code> element with data-spec='full-document'.",
      "layerInspection": "Each layer in the Layers Panel is a <li> with role='treeitem', aria-label set to the layer name, data-layer-id, and data-layer-kind attributes.",
      "propertyInspection": "Select a layer, then read the Properties Panel. Every property input has a <label>, name attribute, and data-property attribute with the current value.",
      "canvasReading": "The ASCII preview canvas is DOM-based (<div> rows containing <span> segments). Each cell has data-col and data-row attributes. Style information is in inline CSS on each <span>.",
      "stateViaConsole": "On every design change, the app logs: console.log('FIGMII_STATE', { action, layerId, timestamp, document }). Read via Chrome DevTools console.",
      "exportFormats": "Use File → Export to get: JSON (full document), HTML/CSS fragment (the rendered grid markup), PNG screenshot, or spec markdown.",
      "multiPage": "Documents can have multiple pages (artboards). Switch pages via the page tabs at the top of the canvas. Each page has its own layer tree but shares the component library."
    },

    "commonWorkflows": {
      "readCurrentDesign": "1. Use read_page to get the accessibility tree. 2. Find the element with data-spec='full-document' in the Spec View. 3. Parse the JSON to understand all layers, positions, styles.",
      "extractComponentSpec": "1. Open Component Library panel. 2. Each component has a <section> with data-component-id. 3. Read the component's stamp parameters and preview.",
      "getGridDimensions": "Read the status bar at the bottom of the viewport. It shows current grid dimensions as 'cols × rows' with data-grid-cols and data-grid-rows attributes.",
      "readLayerProperties": "1. Click the target layer (or find it in Layers Panel). 2. Read the Properties Panel—each field is a labeled input with data-property='propertyName'."
    },

    "readmeAppContext": {
      "description": "Figmii designs target the readme-app, which renders its entire UI as a monospace character grid. The app has 5 views: ASCII (tree explorer), Notion (article table), Etch-A-Sketch (drawing canvas), Gallery (image-to-ASCII), and a Cell simulation (excluded from Figmii—unrelated to ASCII grid).",
      "renderingPipeline": "readme-app uses a stamp → buffer → React elements pipeline: pure stamp functions write characters and style keys into 2D arrays, then renderGridToElements() converts those arrays into <div> rows of <span> segments with inline CSS colors from the active palette.",
      "boxDrawingCharacters": {
        "rounded": "╭ ╮ ╰ ╯ │ ─ (node boxes)",
        "double": "╔ ╗ ╚ ╝ ║ ═ (modals)",
        "section": "┌ ┐ └ ┘ │ ─ (section frames with inset title)",
        "notion": "+ - | (simple ASCII table frames)",
        "edge": "─ │ ┌ ┐ └ ┘ (Manhattan-routed edges)"
      }
    }
  }
  </script>
</head>
<body>
  <div id="app-root" aria-describedby="figmii-agent-briefing figmii-context-help">
    <!-- Figmii application renders here -->
  </div>

  <div id="figmii-context-help" style="display:none;">
    You are viewing Figmii, an ASCII grid design tool. To read the current design
    specification, toggle the Spec View panel (Ctrl+Shift+S) or read the JSON in
    the element with data-spec="full-document". All layer properties are exposed
    as labeled form inputs in the Properties Panel. The canvas preview is DOM-based
    and each cell has data-col and data-row attributes. State changes are logged
    to the console as FIGMII_STATE events.
  </div>
</body>
</html>
```

**Layer 2: Per-Panel Contextual Hints**

Each major panel includes a hidden `aria-description` that explains what that specific panel does:

```html
<aside role="tree" aria-label="Layers"
  aria-description="Layer tree showing all design elements in z-order. Each item has data-layer-id and data-layer-kind. Drag to reorder. Right-click for context menu. Selected layers have aria-selected=true.">
</aside>

<aside role="form" aria-label="Properties"
  aria-description="Properties of the selected layer. Each field is a labeled input with data-property attribute. Values update in real-time.">
</aside>

<main role="application" aria-label="Design Canvas"
  aria-description="ASCII grid preview. DOM-based rendering: div rows containing span segments. Each cell has data-col and data-row. Click to select, drag to move.">
</main>

<section role="document" aria-label="Spec View"
  aria-description="Machine-readable design specification. Contains the full FigmiiDocument as JSON in a code element with data-spec=full-document.">
</section>
```

**Layer 3: `/llms.txt` (Site-Level)**

If Figmii is deployed to its own domain, serve a `/llms.txt` file at the site root—the emerging standard (endorsed by Anthropic) for AI agent discovery.

```markdown
# Figmii

> ASCII grid design tool for the readme-app ecosystem. Compose layouts using
> monospace character cells, box-drawing borders, and style-key-driven theming.

## Quick Reference

- [App Briefing (JSON)](#figmii-agent-briefing): Embedded in every page as a
  script[type=application/json] block referenced by aria-describedby on the app root.
- [Spec View](/?panel=spec): Toggle with Ctrl+Shift+S. Contains the full design document as JSON.
- [Component Library](/?panel=components): All reusable ASCII components with stamp parameters.

## Grid System

The canvas is a 2D grid of monospace character cells (default: IBM Plex Mono 14px,
~8.4px wide × ~18.9px tall). All positions are integer (col, row) pairs.

## Reading a Design

1. Open Spec View (Ctrl+Shift+S)
2. Read the JSON in the element with data-spec="full-document"
3. Each layer has: id, kind, rect (col, row, width, height), styleKey, and kind-specific properties

## Box-Drawing Characters

- Rounded (nodes): ╭ ╮ ╰ ╯ │ ─
- Double (modals): ╔ ╗ ╚ ╝ ║ ═
- Section frames: ┌ ┐ └ ┘ │ ─
- Edges: ─ │ ┌ ┐ └ ┘
```

### Content Strategy

Target ~2,000 tokens for the briefing JSON. Per-panel hints add ~50 tokens each but are localized.

### Maintenance

The agent briefing must be updated whenever a new `LayerKind` is added, new style keys are introduced, the Spec View format changes, new export formats are added, or keyboard shortcuts change. The briefing JSON must be validated against the app's TypeScript types as part of the CI build.

### Testing

Part of the Playwright E2E suite: read the accessibility tree via `page.accessibility.snapshot()` and assert the briefing content is present. Confirm no briefing content is visible to human users.

---

### 4.2 Tier 1 Checkpoint

Before building any Tier 2 features, validate the foundation:

The developer should be able to write a simple script that:
1. Creates a `FigmiiDocument` with a few layers on two pages
2. Flows text through a border-box using the Text Flow Engine
3. Applies a pattern fill to a region
4. Renders the result to a grid buffer using the Stamp System
5. Produces correct HTML output via the DOM Grid Renderer

All without any UI. If this works, the foundation is solid.

---

### 4.3 Tier 2 — Features

These are the user-facing tools built on top of Tier 1 primitives. Each feature is a React component (or set of components) that composes primitives and wires them into the UI. **Build order is strict—each item depends only on items above it.**

---

#### T1. Canvas, Viewport & Viewport Size Presets

**Depends on:** F1 (Grid Engine), F12 (DOM Grid Renderer).

The main design surface. Figmii uses a **Figma-style infinite canvas** where all artboards (pages) live on the same 2D spatial plane. The user zooms in/out and pans freely across the entire workspace—artboards are simply bounded frames positioned at different locations on this infinite plane.

**Zoom model:**

Zooming scales the rendered font size of the grid. At 100% zoom, the grid renders at the configured base font size (default: 14px IBM Plex Mono). Zooming out to 50% renders at 7px—cells become half-sized, and you can see more artboards at once. Zooming in to 200% renders at 28px—cells are large and easy to inspect character-by-character.

The zoom operation:
1. User scrolls with Ctrl+scroll (or pinch-to-zoom on trackpad)
2. Zoom centers on the cursor position (not the viewport center)
3. The effective font size changes: `effectiveFontSize = baseFontSize × zoomLevel`
4. The Grid Engine re-measures cell dimensions at the effective font size
5. All grid content (characters, borders, text) re-renders at the new scale
6. The grid cells and their characters remain crisp at every zoom level because the DOM grid renderer uses actual text elements (not scaled pixels)

**Zoom range:** 10% to 400%. At 10%, a full desktop artboard (228×57 cells) fits in roughly 190×100 pixels—enough to see its overall shape and position relative to other artboards. At 400%, individual cells are large enough to comfortably inspect box-drawing character details.

**Pan:**
- Space + click-drag (Figma convention)
- Middle mouse button drag
- Two-finger scroll on trackpad (without Ctrl)
- Pan is unconstrained—the canvas extends infinitely in all directions

**Navigation shortcuts:**
- Ctrl+1: Zoom to fit all artboards in view
- Ctrl+2: Zoom to fit the selected artboard
- Double-click an artboard name in the Layers Panel to zoom-to-fit that artboard
- Minimap (bottom-right corner) shows all artboards as small rectangles; click to navigate

**Other features:**
- Snap-to-grid: all layer positions snap to cell boundaries within their artboard
- Selection: click to select layer, Shift+click for multi-select, drag for marquee
- Grid overlay: toggle-able faint grid lines showing cell boundaries (visible when zoomed in past 50%)
- Crosshair: cursor position shown as col,row in status bar (relative to the hovered artboard)

**Artboard frames on the infinite canvas:**

Each artboard appears as a labeled, outlined rectangle on the canvas. The artboard name is displayed above its top-left corner. The outline uses a subtle gray color that doesn't interfere with the ASCII grid content inside.

When an artboard is selected (click its title or its empty margin), it becomes the "active artboard" and:
- New layers are placed inside it
- The Properties Panel shows artboard-level settings (name, viewport preset)

**Viewport size presets (per artboard):**
Each artboard can have its own size, set via a dropdown in the artboard's properties or by dragging its edges.

| Preset | Pixels | Cols × Rows (at default font) |
|--------|--------|-------------------------------|
| Desktop 1920×1080 | 1920×1080 | ~228 × 57 |
| Laptop 1440×900 | 1440×900 | ~171 × 47 |
| Small 1280×720 | 1280×720 | ~152 × 38 |
| QHD 2560×1440 | 2560×1440 | ~304 × 76 |
| Custom | User-defined | User-defined |

Artboard size determines the grid's col×row dimensions. The artboard re-computes its grid when the viewport preset or font config changes.

---

#### T2. Layers Panel

**Depends on:** F9 (Layer Model), T1 (Canvas—for selection sync).

Left sidebar showing the layer tree. Mirrors Figma's layers panel.

**Features:**
- Hierarchical list (groups indent children)
- Drag-to-reorder (z-order)
- Visibility toggle (eye icon)
- Lock toggle (lock icon)
- Rename on double-click
- Selection highlights (synced with canvas selection)
- Right-click context menu: duplicate, delete, group, ungroup, create component
- Artboards appear as top-level entries with their child layers nested beneath
- Active artboard is highlighted; double-click an artboard name to zoom-to-fit it on the canvas

**Agent-friendliness:**
- Each layer row is a `<li>` with `role="treeitem"`, `aria-label` = layer name, `data-layer-id`, `data-layer-kind`
- Tree structure uses `role="tree"` and `role="group"`
- Artboard entries have `data-artboard-id` and `aria-expanded` reflecting their child layer visibility

---

#### T3. Properties Panel

**Depends on:** F9 (Layer Model), F3 (Style System), T1 (Canvas—for selection context).

Right sidebar showing properties of the selected layer(s). Content changes dynamically based on `LayerKind`.

**Common properties (all layers):**
- Position: col, row (editable number inputs)
- Size: width, height in cells (editable)
- Name (text input)
- Style key dropdown (from palette)
- Opacity slider
- Lock/visibility toggles

**Kind-specific panels:**

| Kind | Properties shown |
|------|-----------------|
| `border-box` | Border style selector (rounded/double/section/custom), custom character inputs, title text, title style, padding (top/right/bottom/left in cells), background style, pattern fill selector, scrollable toggle |
| `text-block` | Content textarea, font family, kerning (0/1/2 selector), line spacing, alignment, heading/bold style keys, live character count and line count |
| `figlet-text` | Content input, font selector (with preview), alignment |
| `divider` | Orientation (horizontal/vertical), character, connector style (plain/tee) |
| `image` | Image upload/URL, render style selector with thumbnails, brightness/contrast sliders, invert toggle, target size in cells |
| `edge-path` | Source/target layer selectors, routing style, waypoint list |
| `group` | Child count, expand/collapse, auto-layout config (direction, gap, padding, alignment, sizing) |
| `component` | Component name, description, "detach" button |

**Multi-select properties:** When multiple layers are selected, show only the properties they share (position, style key, opacity). Alignment and distribution buttons appear at the top.

**Agent-friendliness:**
- Every property input has a `<label>`, `name` attribute, and `data-property` attribute
- Property values are in the DOM as `value` attributes, not just visually rendered
- Changes emit console logs: `console.log('FIGMII_PROPERTY_CHANGE', { layerId, property, oldValue, newValue })`

---

#### T4. Toolbar & Core Drawing Tools

**Depends on:** T1 (Canvas), F4 (Stamp System), F9 (Layer Model).

Top bar with drawing/editing tools.

| Tool | Key | Behavior |
|------|-----|----------|
| Select | V | Click/drag to select and move layers |
| Border Box | B | Click-drag on canvas to draw a border box; release to set size. Default: rounded style. Properties panel lets you switch style, set custom chars, add pattern fill. |
| Text | T | Click to place a text block; starts editing immediately with live reflow in the grid (see T7). |
| FIGlet | F | Click to place a FIGlet text layer; opens inline font picker. |
| Divider | D | Click-drag to draw a horizontal or vertical divider (orientation inferred from drag direction). |
| Fill | G | Click a region to fill it with the active character and style key. Shift+click to fill with the active pattern. When clicking inside a border-box, fills only the interior. |
| Image | I | Opens file picker; places image layer at click position. |
| Edge | E | Click source layer, then click target layer to create Manhattan-routed connection. |
| Hand | H | Pan the canvas. Also: hold Space with any tool. |

**Fill tool detail (new):**

The Fill tool (G) provides two modes:

*Character fill:* The active character (selected in the Character Picker or via a small swatch in the toolbar) is stamped into every cell of the clicked region. A "region" is defined as: if you click inside a border-box's interior, the fill stops at the border. If you click on the open canvas, the fill covers the entire marquee selection or, if no selection, does nothing (to prevent accidental full-canvas fill).

*Pattern fill:* Hold Shift and click to fill with the active pattern tile (selected in the Pattern Fill panel). Same region logic as character fill.

---

#### T5. Smart Guides

**Depends on:** T1 (Canvas), F11 (Layout Constraint Engine).

When dragging or resizing a layer, temporary guide lines appear showing spatial relationships to other layers.

**Behavior:**
- Edge alignment: when the dragged layer's edge aligns with another layer's edge, a colored line appears connecting them
- Center alignment: when centers align horizontally or vertically
- Equal spacing: when the gap between the dragged layer and its neighbor matches the gap between two other layers, a measurement label appears (e.g. "3 cells")
- Padding proximity: when dragging inside a border-box, guides appear at the padding boundaries

**Visual:**
- Guides render as dashed lines in a contrasting color (e.g. cyan) overlaid on the grid canvas
- Distance labels show cell counts as small inline badges
- Snap threshold: 1 cell (the layer snaps to the guide position when within 1 cell)

**Can be disabled** via View → Smart Guides toggle or Ctrl+Shift+G.

---

#### T6. Alignment & Distribution Tools

**Depends on:** T3 (Properties Panel—for multi-select UI), F11 (Layout Constraint Engine).

When multiple layers are selected, alignment and distribution buttons appear in the Properties Panel header.

**Alignment buttons:**
- Align left edges
- Align horizontal centers
- Align right edges
- Align top edges
- Align vertical centers
- Align bottom edges

**Distribution buttons:**
- Distribute horizontal (equal spacing between layers, measured in cells)
- Distribute vertical (equal spacing between layers, measured in cells)

**Remainder handling for distribution:** Since spacing is discrete (whole cells), even distribution may not divide perfectly. When there's a remainder of N cells, the first N gaps (left-to-right or top-to-bottom) each get 1 extra cell. A subtle highlight on those gaps shows the user where the extra cells went. This is deterministic—same input always produces the same output.

---

#### T7. Live Text Reflow Preview

**Depends on:** T1 (Canvas), F5 (Text Flow Engine).

When editing a text-block layer, the user types directly into the ASCII grid canvas—not into a sidebar textarea. This is the most important UX differentiator for Figmii: you see exactly how your copy fits (or doesn't) within the grid constraints as you type.

**Behavior:**
1. Double-click a text-block layer (or click with the Text tool)
2. A cursor appears in the grid at the text insertion point (using the `queryCursor` style: `█`)
3. As you type, characters fill cells in real time, word-wrapping within the bounding box
4. Kerning, padding, and line spacing are applied live
5. If text overflows the bounding rect, the overflow lines are rendered in a dimmed style (`dim` key) below the box, and a red overflow indicator appears in the Properties Panel showing "3 lines overflow"
6. Press Escape to exit editing mode

**Implementation:** On every keystroke, the Text Flow Engine (F5) recomputes `TextFlowResult`. The result's `lines` array is stamped into the grid buffer via the Stamp System. The `overflow` and `overflowLineCount` fields drive the overflow indicator.

**Cursor behavior:** The cursor position maps to a `(col, row)` in the grid. Arrow keys move the cursor cell-by-cell. Home/End jump to line start/end. The cursor is always visible—no blinking (blinking would require animation frames, which is unnecessary complexity for a design tool).

---

#### T8. Auto-Layout System

**Depends on:** F11 (Layout Constraint Engine), T1 (Canvas), T3 (Properties Panel).

Groups can optionally have auto-layout enabled, which automatically positions their children in a vertical or horizontal stack.

**UX flow:**
1. Select multiple layers → right-click → "Auto Layout" (or Shift+A)
2. The layers become children of a new group with auto-layout enabled
3. The Properties Panel shows the auto-layout controls: direction (↕/↔), gap, padding, alignment, sizing

**Behavior:**
- **Vertical stack:** Children are arranged top-to-bottom with `gap` cells between each
- **Horizontal stack:** Children are arranged left-to-right with `gap` cells between each
- **Padding:** Cells of space between the group's border and the first/last child
- **Alignment:** `start`, `center`, or `end` (cross-axis alignment)
- **Sizing:**
  - `hug-contents`: the group shrinks/grows to exactly fit its children + padding + gaps
  - `fixed`: the group maintains its current size; children may overflow (indicated visually)

**When text reflows:** If a text-block child reflows to more or fewer rows (due to content editing, kerning change, etc.), the auto-layout engine recomputes the stack. In `hug-contents` mode, the parent group resizes. This is the key integration point between the Text Flow Engine (F5) and the Layout Constraint Engine (F11).

**Nesting:** Auto-layout groups can be nested. A horizontal stack can contain vertical stacks, enabling complex grid layouts.

---

#### T9. Character Picker Panel

**Depends on:** F2 (Character Registry), T1 (Canvas).

A toggleable panel (similar to Figma's color picker or emoji panel) that lets the user browse, search, and place individual Unicode characters.

**Layout:**
- **Search bar** at top: type to search by character name, tag, or the character itself
- **Category tabs** below search: box-drawing, blocks, braille, arrows, geometric, etc.
- **Character grid**: characters displayed in a grid of clickable cells, rendered in the current monospace font
- **Recently used** row at the top (last 20 characters, persisted)
- **Favorites** row (user-pinned characters, persisted)

**Interaction:**
- Click a character → it becomes the "active character" (shown in the toolbar swatch)
- With the Select tool: click a cell on the canvas to stamp the active character there
- With the Fill tool: the active character is used for region fills
- Double-click a character in the picker → copies it to clipboard

**Active character swatch:** A small display in the toolbar showing the currently selected character and its style key. Click the swatch to open the Character Picker.

---

#### T10. Clipboard: Copy, Cut & Paste-as-Layers

**Depends on:** T1 (Canvas), F9 (Layer Model), F4 (Stamp System).

**Copy from canvas (Ctrl+C):**
- Copies the selected layer(s) to an internal clipboard as `Layer[]` JSON
- Also generates a plain-text representation: the characters in the selected region, row by row, with no styling—just the raw ASCII. This goes to the system clipboard so you can paste it into Slack, a code comment, or a text editor.

**Cut (Ctrl+X):** Same as copy, but removes the selected layers.

**Paste internal (Ctrl+V when internal clipboard has layers):**
- Places copied layer(s) at the center of the current viewport
- Offsets by (+2, +2) cells if pasting in place (to avoid perfect overlap)
- All IDs are regenerated (no duplicates)

**Paste external text (Ctrl+V when system clipboard has plain text):**
- Creates a new `text-block` layer at the center of the viewport
- The pasted text becomes the layer's `content`
- If the text contains box-drawing characters (detected heuristically: >10% of characters are in the box-drawing Unicode range), offer to import it as a raw character grid instead—each character placed in its exact cell position, preserving spatial layout. This becomes a `group` layer containing individual character stamps.

**Paste image (Ctrl+V when system clipboard has an image):**
- Creates a new `image` layer at the center of the viewport
- Runs the image through the ASCII Image Pipeline (F7) with default settings

---

#### T11. Component Library Panel

**Depends on:** F9 (Layer Model—components), F4 (Stamp System), T1 (Canvas).

A panel (toggleable, similar to Figma's assets panel) that shows all reusable components.

**Pre-populated components from readme-app:**

| Component | Source | Description |
|-----------|--------|-------------|
| Node Box | `stampNodeBox` | Rounded single-line box with label and optional badge |
| Modal Frame | `stampModalBox` | Heavy double-line box |
| Section Frame | `stampSectionFrame` | Single-line box with inset title |
| Query Input | `queryStamp.ts` | Full query input modal layout |
| Query Loading | `queryStamp.ts` | Loading state with spinner |
| Query Error | `queryStamp.ts` | Error state |
| Query Results | `queryStamp.ts` | Scrollable results viewer |
| Query Pill | `queryStamp.ts` | Minimized pill overlay |
| Ghost Blob | `ghostStamp.ts` | Animated ghost character |
| Ghost Bubble | `ghostStamp.ts` | Chat bubble with messages and input |
| Etch Frame | `stampEtch.ts` | Etch-A-Sketch frame with screen and knobs |
| Notion Table | `notionStamp.ts` | Multi-column article table |
| Edge Path | `edgeRouter.ts` | Manhattan-routed connection |
| Minimap | `Minimap.tsx` | Overview map (canvas-based) |
| Horizontal Divider | `charUtils.ts` | Simple line divider |
| Tee Divider | `queryStamp.ts` | Line with side connectors (╟─╢) |

**User-created components:**
Users can select any set of layers, right-click → "Create Component". This saves the layers as a `ComponentDef` in the document. Components can be dragged from the library onto the canvas to create instances.

**Component instances** maintain a link to their definition. Editing the definition updates all instances (across all pages). "Detach" breaks the link and converts the instance to regular layers.

---

#### T12. Font Settings Panel

**Depends on:** F1 (Grid Engine—for re-measurement), F6 (FIGlet Engine).

Accessible from the settings/gear icon. Lets the user configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Base font family | IBM Plex Mono | The monospace font for all grid rendering |
| Base font size | 14px | Character size |
| Base line height | 1.35 | Vertical spacing |
| Heading font | (same as base) | Font for `#` headings in text blocks |
| Title font | (same as base) | Font for modal/component titles |
| FIGlet default font | Standard | Which FIGlet font new FIGlet layers use |

Changing the base font triggers a full grid re-measurement (cell width/height recomputed). The canvas re-renders with the new dimensions. A preview swatch shows "The quick brown fox..." in the current font at the current size.

**Important constraint:** All fonts must be monospace. The tool should validate this—if a user enters a proportional font, show a warning that the grid system requires fixed-width characters.

---

#### T13. Theme Preview Panel

**Depends on:** F3 (Style/Theme System), T1 (Canvas).

A panel that lets the user switch between readme-app themes and see the design update in real time.

Features:
- Theme dropdown (lists all themes from readme-app's `themes.ts`)
- Custom theme editor (color pickers for each style key, grouped by category)
- Import/export theme as JSON
- Side-by-side comparison mode: view design in two themes simultaneously

---

#### T14. Multi-Page / Artboard Management

**Depends on:** F9 (Document Model—pages), T1 (Canvas), T2 (Layers Panel).

The UI for creating, managing, and navigating between artboards on the infinite canvas.

**Creating artboards:**
- **A** key (Artboard tool): click-drag on the empty canvas to draw a new artboard at that position and size
- Or: use the **+** button in the Layers Panel header, which creates a new artboard to the right of the rightmost existing artboard with 50 cells of spacing
- New artboards default to the "Desktop 1920×1080" viewport preset

**Artboard list in Layers Panel:**
- Artboards appear as top-level entries in the Layers Panel, above their child layers
- Each artboard entry shows its name and viewport preset
- Click an artboard to select it (zoom-to-fit via double-click)
- Drag artboards in the Layers Panel to reorder their listing (this doesn't change their spatial position on the canvas)
- Right-click: rename, duplicate, delete, set viewport preset, "Zoom to fit"

**Spatial arrangement on the infinite canvas:**
- Artboards are freely positioned on the canvas—drag an artboard's title bar or edge to reposition it
- "Tidy up" command (right-click canvas background → Tidy Up): automatically arranges all artboards in a grid layout with consistent spacing
- Artboards can overlap (the one with the higher z-order renders on top), but this is discouraged

**Per-artboard settings:**
- Each artboard has its own viewport preset (size), name, layer tree, and z-order
- Components are shared across all artboards

**Zoomed-out artboard view:**
When zoomed out far enough that individual characters are too small to read (below ~25%), the grid rendering switches to a simplified mode: artboards appear as solid rectangles with their name labels, and a faint color-coded preview of the content density (darker regions where more characters are drawn). This avoids rendering thousands of tiny unreadable characters and keeps the canvas performant.

**Use cases:**
- "Modal open" vs "Modal closed" states on adjacent artboards—zoom out to see both
- Different views of the app (ASCII view, Notion view, Gallery view) each on their own artboard
- Responsive preview: same layout at desktop and laptop sizes, side by side

---

#### T15. Spec View (Agent-Facing Panel)

**Depends on:** F9 (Document Model), F9 (Layer Model), T1 (Canvas).

A dedicated panel—toggled via a tab or Ctrl+Shift+S—that renders the current design as structured, machine-readable specification.

**Contents:**

1. **Document summary** — grid config, theme, page count, layer count
2. **Layer table** — each layer as a row with: id, kind, page, position (col,row), size (w×h), style key, key properties
3. **Full JSON export** — the complete `FigmiiDocument` serialized as JSON, displayed in a `<pre>` block with copy button
4. **Component specs** — for each component, a rendered ASCII preview alongside its stamp parameters
5. **Diff view** — when a design is modified, show what changed since last export

**Agent-friendliness:**
- The JSON is in a `<code>` element with `data-spec="full-document"`
- Each layer row is a `<tr>` with `data-layer-id` and individual `<td>` cells for each property
- A "Copy Spec" button writes the JSON to clipboard
- Console log on every design change: `console.log('FIGMII_DOCUMENT', JSON.stringify(document))`

---

#### T16. Export System

**Depends on:** All above.

Figmii produces two categories of output: visual exports for human review and data exports for developer consumption.

**Visual exports:**

| Format | Method | Use Case |
|--------|--------|----------|
| PNG screenshot | `html2canvas` or DOM-to-image of the grid preview area | Share in Slack, embed in docs |
| SVG | Generate SVG with `<text>` elements positioned on grid | Scalable, editable in other tools |
| HTML snapshot | Self-contained HTML file with inline CSS + the rendered grid | Open in browser, inspect in DevTools |

**Data exports:**

| Format | Contents | Use Case |
|--------|----------|----------|
| JSON (FigmiiDocument) | Full document model (all pages) | Re-open in Figmii, programmatic consumption |
| Component JSON | Individual component definitions with stamp parameters | Developer imports into readme-app |
| HTML/CSS fragment | The rendered grid as HTML `<div>`/`<span>` structure with inline styles | Developer can see exact markup structure |
| Spec markdown | Human-readable specification document listing all layers, positions, styles | PRD-style handoff document |

**Export UX:**
File → Export menu with checkboxes for which formats to include. "Export All" produces a zip containing all formats. Each export includes the design name and timestamp in the filename. Multi-page documents export each page as a separate file within the zip.

---

#### T17. File Save/Load

**Depends on:** F9 (Document Model).

Figmii documents are saved as `.figmii` files, which are JSON with the `FigmiiDocument` schema. Files are saved to and loaded from the user's local filesystem via the File System Access API (with fallback to download/upload for unsupported browsers).

Auto-save to localStorage every 30 seconds. Manual save via Ctrl+S.

---

## 5. Data Flow & State Architecture

```
User Input (mouse/keyboard)
    │
    ▼
┌─────────────────────┐
│   Tool State         │  (which tool is active, cursor mode, active char)
│   (Zustand store)    │
└────────┬────────────┘
         │ dispatches mutations
         ▼
┌─────────────────────┐
│   Document Store     │  (FigmiiDocument, undo/redo history)
│   (Zustand store)    │
└────────┬────────────┘
         │ triggers re-render
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐
│ Layout Constraint│ │ Text Flow Engine │ │ Spec View    │
│ Engine (guides,  │ │ (reflow,         │ │ (structured  │
│ auto-layout)     │ │ overflow)        │ │ JSON + table)│
└────────┬─────────┘ └────────┬─────────┘ └──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────────────────────┐        Agent-readable
│   Grid Renderer                  │        (Claude in Chrome reads)
│   (stamp → buffer → DOM elements)│
└──────────────────────────────────┘
         │
         ▼
    Visual output
    (human PM sees)
```

**Console logging contract:** On every document mutation, emit:
```javascript
console.log('FIGMII_STATE', {
  action: 'layer:move',
  layerId: 'abc123',
  timestamp: Date.now(),
  document: currentDocument
});
```

---

## 6. File Format

Figmii documents are saved as `.figmii` files, which are JSON with the `FigmiiDocument` schema. Files are saved to and loaded from the user's local filesystem via the File System Access API (with fallback to download/upload for unsupported browsers).

Auto-save to localStorage every 30 seconds. Manual save via Ctrl+S.

---

## 7. Implementation Summary & Dependency Map

### Tier 1 — Foundation (build in this exact order)

| # | Module | Depends on | Key acceptance test |
|---|--------|-----------|---------------------|
| F1 | Grid Engine | — | Measurement, coordinate conversion, snapping, viewport presets |
| F2 | Character Registry | — | 500+ chars cataloged, search works, persistence works |
| F3 | Style & Theme System | F1 | 56 style keys, palette generation, theme switching |
| F4 | Stamp System | F1, F2, F3 | All readme-app stamps ported + new stamps (fill, pattern, custom border) |
| F5 | Text Flow Engine | F1, F4 | Word-wrap, kerning, overflow, heading/bold parsing, totalRows computation |
| F6 | FIGlet Font Engine | F4 | .flf parsing, 10 bundled fonts, smushing, user uploads |
| F7 | Image Pipeline | F1, F4 | 5 render styles, adjustable dimensions, brightness/contrast |
| F8 | Pattern Fill Library | F2, F4 | 9+ built-in patterns, custom tiles, tiling with offset |
| F9 | Layer & Document Model | F1, F3 | CRUD, JSON roundtrip, multi-page, components |
| F10 | Undo/Redo | F9 | 50-level history, < 16ms response |
| F11 | Layout Constraint Engine | F1, F5, F9 | Smart guides, auto-layout, alignment, distribution |
| F12 | DOM Grid Renderer | F4, F3 | Correct React output, data-col/data-row attrs |
| F13 | Agent Instruction Layer | F9, F3 | Briefing in accessibility tree, invisible to users |

### Tier 2 — Features (build in this exact order)

| # | Feature | Depends on | Notes |
|---|---------|-----------|-------|
| T1 | Canvas & Viewport + Presets | F1, F12 | First visible UI; design surface + rulers + viewport frame |
| T2 | Layers Panel | F9, T1 | Layer tree + page tabs |
| T3 | Properties Panel | F9, F3, T1 | Dynamic properties + multi-select alignment buttons |
| T4 | Toolbar & Core Drawing Tools (incl. Fill) | T1, F4, F9 | All 9 tools: Select, Border, Text, FIGlet, Divider, Fill, Image, Edge, Hand |
| T5 | Smart Guides | T1, F11 | Edge/center/spacing/padding guides with snap |
| T6 | Alignment & Distribution | T3, F11 | 6 alignment + 2 distribution modes with remainder handling |
| T7 | Live Text Reflow Preview | T1, F5 | In-grid cursor, real-time reflow, overflow indicator |
| T8 | Auto-Layout System | F11, T1, T3 | Vertical/horizontal stacks, hug-contents, nesting |
| T9 | Character Picker Panel | F2, T1 | Search, categories, favorites, recent, active char swatch |
| T10 | Clipboard (Copy/Cut/Paste) | T1, F9, F4 | Internal layer paste + external text/image paste |
| T11 | Component Library | F9, F4, T1 | Pre-populated + user-created components |
| T12 | Font Settings | F1, F6 | Font config, re-measurement, monospace validation |
| T13 | Theme Preview | F3, T1 | Theme switching, custom editor, side-by-side |
| T14 | Multi-Page / Artboard Support | F9, T1, T2 | Page tabs, per-page viewport presets |
| T15 | Spec View | F9, T1 | JSON export, layer table, diff view |
| T16 | Export System | All above | PNG, SVG, HTML, JSON, component JSON, spec markdown |
| T17 | File Save/Load | F9 | .figmii files, auto-save, File System Access API |

---

## 8. Agent-Friendliness Checklist

Every feature should be validated against this checklist before shipping:

- [ ] All interactive elements have semantic HTML (`<button>`, `<input>`, `<label>`, not styled `<div>`s)
- [ ] All elements have meaningful `aria-label` attributes
- [ ] All data-bearing elements have `data-*` attributes exposing their values
- [ ] Layer selections are reflected in `aria-selected` attributes
- [ ] Property changes emit `console.log('FIGMII_STATE', ...)` events
- [ ] The Spec View panel accurately reflects the current document state
- [ ] No critical information is only visible in `<canvas>` elements
- [ ] Forms have associated labels and meaningful `name` attributes
- [ ] Keyboard navigation works for all primary workflows
- [ ] No blocking modals—use inline panels or non-modal dialogs
- [ ] Agent Instruction Layer (F13) is present, complete, and passes accessibility tree tests

---

## 9. Interaction Patterns & Keyboard Shortcuts

| Action | Shortcut | Notes |
|--------|----------|-------|
| Select tool | V | Default tool |
| Border box tool | B | |
| Text tool | T | |
| FIGlet tool | F | |
| Divider tool | D | |
| Fill tool | G | Shift+click for pattern fill |
| Image tool | I | Opens file picker |
| Edge tool | E | |
| Hand/pan tool | H | Also: hold Space |
| Undo | Ctrl+Z | |
| Redo | Ctrl+Shift+Z | |
| Save | Ctrl+S | |
| Export | Ctrl+Shift+E | Opens export dialog |
| Delete selected | Delete / Backspace | |
| Duplicate | Ctrl+D | |
| Copy | Ctrl+C | Copies layers + plain text to clipboard |
| Cut | Ctrl+X | |
| Paste | Ctrl+V | Layers, text, or images |
| Group | Ctrl+G | |
| Ungroup | Ctrl+Shift+G | |
| Auto Layout | Shift+A | Wrap selected layers in auto-layout group |
| Toggle spec view | Ctrl+Shift+S | |
| Toggle smart guides | Ctrl+; | |
| Toggle character picker | Ctrl+Shift+C | |
| Zoom in | Ctrl+= | |
| Zoom out | Ctrl+- | |
| Fit to content | Ctrl+1 | |
| Toggle layers panel | Ctrl+L | |
| Toggle properties panel | Ctrl+P | |
| Artboard tool | A | Click-drag to create new artboard |
| Zoom to fit all | Ctrl+1 | Fits all artboards in view |
| Zoom to fit selection | Ctrl+2 | Zooms to selected artboard or layer |
| Zoom to 100% | Ctrl+0 | Resets to actual size |
| Next artboard | Ctrl+Page Down | Zoom-to-fit next artboard |
| Previous artboard | Ctrl+Page Up | Zoom-to-fit previous artboard |

---

## 10. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Initial load time | < 2 seconds |
| Canvas re-render after mutation | < 50ms for documents with < 100 layers |
| Auto-layout recomputation | < 30ms for groups with < 50 children |
| Text reflow computation | < 10ms for text blocks under 500 characters |
| Export generation | < 3 seconds for PNG, < 1 second for JSON |
| Undo/redo response | < 16ms (single frame) |
| Max document size | 500 layers per page, 20 pages per document |
| Browser support | Chrome 120+, Edge 120+ (Claude in Chrome requires Chromium) |
| Accessibility | WCAG 2.1 AA for the tool UI itself |

---

## 11. Open Questions & Future Considerations

1. **Collaboration:** Should Figmii support real-time collaboration (like Figma)? Deferred for v1—single-user, local files only.

2. **Animation preview:** The readme-app has animations (ghost blob, spinner, scramble). Should Figmii support animation timelines? Deferred—v1 is static designs only.

3. **Plugin system:** Should Figmii support user-written plugins for custom stamp functions? Architecturally, the stamp system is designed to support this (pure functions with a standard signature), but the plugin infrastructure is deferred.

4. **Version control:** Should `.figmii` files integrate with git? The JSON format is diffable, which is a good start. A visual diff tool could be a future feature.

5. **Non-rectangular borders:** The border drawing tool starts as a rectangle. Supporting draggable corner/edge control points for non-rectangular shapes is a stretch goal.

---

## Appendix A: readme-app Component Catalog

See the companion document `COMPONENT_CATALOG.md` for a comprehensive inventory of every ASCII grid component, border character set, style key, stamp function, modal layout, and interactive element in the readme-app codebase. This catalog drives the pre-populated component library in Figmii.

---

## Appendix B: FIGlet Font Format Reference

FIGlet fonts use the `.flf` (FIGlet Language File) format:

```
flf2a$ HEIGHT BASELINE MAX_LENGTH OLD_LAYOUT COMMENT_LINES
[comment lines...]
[character definitions...]
```

Each character definition is `HEIGHT` lines tall. Lines end with `@` (or `@@` for the last line of a character). Characters are defined in ASCII order starting from space (32). The `$` in the header is the "hardblank" character—it renders as a space but prevents smushing.

The Koholint font specifically uses Unicode block-drawing characters (`▄` `█` `▀`) at 5 lines height to create a pixel-art style inspired by The Legend of Zelda: Link's Awakening.

Standard FIGlet fonts can be found at: http://www.figlet.org/fontdb.cgi

---

## Appendix C: Grid Measurement Reference Values

For the default readme-app configuration (IBM Plex Mono, 14px, line-height 1.35):

| Metric | Value | Notes |
|--------|-------|-------|
| Character width | ~8.4px | Measured from 'M' glyph bounding rect |
| Character height | ~18.9px | 14px × 1.35 line-height |
| Columns at 1920px wide | ~228 | `Math.floor(1920 / 8.4)` |
| Rows at 1080px tall | ~57 | `Math.floor(1080 / 18.9)` |
| Columns at 1440px wide | ~171 | Typical laptop |
| Rows at 900px tall | ~47 | Typical laptop |

These values are approximate—exact values depend on browser rendering and OS font metrics. The Grid Engine must always measure at runtime, never hardcode.
