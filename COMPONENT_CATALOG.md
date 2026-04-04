# ASCII Grid Component Catalog
## readme-app Grid Layout System

**Catalog Date:** 2026-04-04
**Scope:** ASCII grid components, patterns, and visual primitives used across views (excludes Cell-view/physics components)

---

## 1. BOX-DRAWING STYLES & BORDERS

### 1.1 Single-Line Rounded Box (Node Boxes)
**File:** `/tree-ascii/charUtils.ts` - `stampNodeBox()`
**Characters Used:**
- Corners: `╭` `╮` `╰` `╯`
- Horizontals: `─`
- Verticals: `│`

**Dimensions:** Variable (computed based on label content, minimum ~4 cols)
**Style Keys Used:**
- `styleKey` - border color
- `textStyle` - label text
- `badgeStyle` - badge color (optional)
- `bgStyle` - interior fill

**Stamping Functions:**
- `stampNodeBox(chars, styles, col, row, width, height, label, badge, styleKey, textStyle, badgeStyle, bgStyle, rows, cols)`

**Features:**
- Centered label on middle row
- Optional badge at top-right corner
- Interior filled with spaces
- Interior styling with `bgStyle`

**Interactivity:** None (static box render)

---

### 1.2 Double-Line Modal Box
**File:** `/tree-ascii/charUtils.ts` - `stampModalBox()`
**Characters Used:**
- Corners: `╔` `╗` `╚` `╝`
- Horizontals: `═`
- Verticals: `║`

**Dimensions:** Variable, centered in viewport
**Style Keys Used:**
- `borderStyle` - borders
- `bgStyle` - interior fill

**Stamping Functions:**
- `stampModalBox(chars, styles, col, row, width, height, borderStyle, bgStyle, rows, cols)`

**Features:**
- Heavy/bold border style
- Plain interior fill (no text overlay by default)

**Usage:**
- Query input/loading/error modals
- Base frame for other modal types

---

### 1.3 Single-Line Section Frame (with Inset Title)
**File:** `/tree-ascii/charUtils.ts` - `stampSectionFrame()`
**Characters Used:**
- Corners: `┌` `┐` `└` `┘`
- Horizontals: `─`
- Verticals: `│`

**Dimensions:** Variable
**Style Keys Used:**
- `borderStyle` - frame border
- `titleStyle` - inset title text
- `bgStyle` - interior fill

**Stamping Functions:**
- `stampSectionFrame(chars, styles, col, row, width, height, title, titleStyle, borderStyle, bgStyle, rows, cols)`

**Features:**
- Title inset into top border: `┌─ title ─┐` format
- Title truncated with `…` if too long
- Title requires minimum 6 chars width for frame (`"┌─ " + title + " ─┐"`)

**Usage:**
- Node browser sections
- Query scoping browser

---

### 1.4 Notion View Table Frames
**File:** `/src/views/notion-view/frameStyles.ts` - `ASCII_FRAME`
**Characters Used:**
- Corners: `+` `+` `+` `+`
- Horizontals: `-`
- Verticals: `|`
- Tee junctions: `+` (all variants)
- Inner vertical dividers: `|`
- Cross intersections: `+`

**Frame Structure:**
```typescript
interface FrameChars {
  tl: string;   // top-left     '+'
  tr: string;   // top-right    '+'
  bl: string;   // bottom-left  '+'
  br: string;   // bottom-right '+'
  h: string;    // horizontal   '-'
  v: string;    // vertical     '|'
  lt: string;   // left tee     '+'
  rt: string;   // right tee    '+'
  th: string;   // top-middle tee '+'
  bh: string;   // bottom-middle tee '+'
  cross: string;// cross junction '+'
  iv: string;   // inner vertical '|'
}
```

**Usage:**
- Articles table (Notion view)
- Multi-column layout with internal dividers

**Divider Patterns:**
- Top separator: `╠════╤═══════════════════╤═══════════╣`
- Middle cross: `╠════╪═══════════════════╪═══════════╣`
- Footer tee: `╠════╧═══════════════════╧═══════════╣`

---

### 1.5 Horizontal Dividers
**File:** `/tree-ascii/charUtils.ts` - `stampDivider()`
**File:** `/tree-ascii/queryStamp.ts` - `stampHorizontalDivider()`

**Characters Used:** `─` (standard), `╟` `╢` (with sides), `·` (dotted)

**Stamping Functions:**
- `stampDivider(chars, styles, row, col, width, style, rows, cols)` - simple line
- `stampHorizontalDivider(chars, styles, row, col, width, style, rows, cols)` - `╟─────╢` with tees

**Dimensions:** Full width parameter, typically 1 row height
**Style Keys:** Typically `queryBorder`, `modalBorder`, etc.

**Usage:**
- Query modal section dividers (between title, input, buttons)
- Modal internal separations
- Ghost bubble message/input divider: `·` characters

---

## 2. MODAL LAYOUTS & STRUCTURES

### 2.1 Query Input Modal
**File:** `/tree-ascii/queryStamp.ts` - `stampQueryInput()`
**File:** `/tree-ascii/queryLayout.ts` - `computeQueryInputLayout()`

**Dimensions:**
- Width: min 72 cols, max 90% of viewport
- Height: Dynamic based on content (min ~10 rows)
- Centered in viewport

**Components (top to bottom):**
1. **Title Row** - "Ask a question" | "[x]" close button
   - Style: `modalTitle` for text, `modalClose` for button
2. **Divider** - `╟─────╢`
3. **Input Area** - word-wrapped text input, 1-4 rows
   - Placeholder: "Type your question here..."
   - Cursor: `█` (blinking, style `queryCursor`)
   - Style: `queryHint` (placeholder), `queryText` (active), `queryHint` (pulsing on enter)
4. **Verbosity Section**
   - Label: "Verbosity:"
   - Buttons: `[verbatim]` `[detailed]` `[normal]` `[condensed]` or `▓active▓`
   - Active style: `queryButtonActive` (inverted), inactive: `queryButton`
5. **Scope Section**
   - Text: "Scope: All nodes (optional)" or "Scope: N nodes selected"
   - Browse button: `[▶ Browse]` or `[▼ Browse]`
6. **Node Browser** (if open)
   - Rounded box `┌─────┐`
   - Rows with disclosure triangles `▶` `▼` or checkboxes `●` `○`
   - Indent per depth level: 3 cols
7. **Selected Chips** (if any)
   - Format: "Selected: `[label ×]` `[label ×]`"
8. **Query Matches** (saved queries)
   - Cards with rounded corners `┌─ Title (date) ─┐ | "question" | └───────────┘`
9. **Divider** - `╟─────╢`
10. **Submit Bar**
    - Cost text on left, "[⌘+Return to submit]" on right
    - Style: `queryHint`, `queryButton`

**Hit Regions:**
- Close button `[x]`
- Verbosity buttons: 4 regions
- Browse button
- Chip removal (× symbol)
- Query match cards
- Submit button

**Interactivity:**
- Text input focus with cursor
- Verbosity selection
- Node browser expand/collapse
- Chip removal
- Query match selection
- Submit action

---

### 2.2 Query Loading Modal
**File:** `/tree-ascii/queryStamp.ts` - `stampQueryLoading()`
**File:** `/tree-ascii/queryLayout.ts` - `computeQueryLoadingLayout()`

**Dimensions:**
- Width: min 48 cols, max 80% viewport
- Height: 10 rows fixed
- Centered in viewport

**Components:**
1. Title: "Querying..." | "[minimize]" button
2. Divider
3. Question text (wrapped, max 2 lines)
4. Spinner animation
   - Frames: `─` `╲` `│` `╱` (cyclic)
   - Format: `─ ─ ─` (repeated character with spaces)
5. Status: "Reading N nodes..."
6. Bottom buttons: "[cancel]"

**Spinner:** `SPINNER_FRAMES = ['─', '╲', '│', '╱']`

---

### 2.3 Query Error Modal
**File:** `/tree-ascii/queryStamp.ts` - `stampQueryError()`
**File:** `/tree-ascii/queryLayout.ts` - `computeQueryErrorLayout()`

**Dimensions:** Same as loading modal (10 rows fixed)

**Components:**
1. Title: "Query Failed" | "[x]"
2. Divider
3. Question (wrapped)
4. Error message: "Error: {message}"
5. Buttons: "[Retry]" "[Dismiss]"

**Styles:**
- Error text: `queryError` (red `#b04040`)
- Buttons: `queryButton`

---

### 2.4 Query Viewing / Results Modal
**File:** `/tree-ascii/queryStamp.ts` - `stampQueryViewing()`
**File:** `/tree-ascii/queryLayout.ts` - `computeQueryViewingLayout()`

**Dimensions:**
- Width: min 72 cols
- Height: gridRows - 2 (nearly full screen)
- Top inset: row 1

**Components:**
1. Title: "Query Result" | "[x]"
2. Double divider: `╠═══════════╣` (bold border with `═`)
3. **Content Area (scrollable):**
   - Question: `Q: {question}`
   - Verbosity label
   - Scoped nodes section (if any)
   - Agent sources section
   - Answer section header: `──── Answer ─────────────────────────────────`
   - Answer text (word-wrapped)
4. Scroll indicators: `▲` `▼` on right border

**Divider Style:** `queryDivider` with `─` characters
**Content Styles:**
- `queryText` for question/answer
- `queryHint` for metadata
- `queryDivider` for section headers

**Scrolling:** Manual scroll rows, indicators on viewport edges

---

### 2.5 Query Pill (Minimized State)
**File:** `/tree-ascii/queryStamp.ts` - `stampQueryPill()`
**File:** `/tree-ascii/queryLayout.ts` - `computeQueryPillLayout()`

**Dimensions:**
- Width: text.length + 4
- Height: 3 rows fixed
- Position: bottom-center overlay

**Visual:**
```
┌─────────────────┐
│ Query running...│
└─────────────────┘
```

**Style:** `queryPill` (normal), `queryPillBlink` (pulsing)
**Hit Region:** Full pill area (action: pill:restore)

---

## 3. TEXT MODAL (Content Viewer)
**File:** `/tree-ascii/types.ts` - `TextModalState`

**Structure:**
- Double-line border (modal box style)
- Title row at top
- Close button "[x]"
- Scrollable text content
- Word-wrapped text lines
- Scroll indicators on right edge

**Styles:**
- `modalBorder` - frame
- `modalTitle` - title text
- `modalText` - content text
- `modalClose` - close button

**Dimensions:** Computed based on content

**Interactivity:**
- Scroll up/down
- Close button

---

## 4. IMAGES MODAL (Hybrid Image Renderer)
**File:** `/tree-ascii/types.ts` - `ImagesModalState`

**Components:**
- Modal frame with title "Images"
- Tab selector for image style (if multiple images)
- ASCII art rendering of image
- Style options: `classic`, `smooth`, `braille`, `contour`, `hatch`

**ASCII Image Ramps:**
| Style | Ramp | Brightness Measurement |
|-------|------|----------------------|
| `classic` | `@%#*+=-:. ` | Measured density |
| `smooth` | `$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^'. ` | Extended ramp |
| `hatch` | `@#x+=:,. ` | Posterized with dithering |
| `contour` | `@#*+=-:. ` | Edge-aware shading |
| `braille` | Braille dot patterns (2×4 grid) | High-detail dither |

**File:** `/tree-ascii/charBrightness.ts` - Character brightness measurement
**File:** `/tree-ascii/imageAscii.ts` - Image rendering system

**Character Brightness Measurement:**
- Canvas measurement of actual rendered character pixels
- Brightness range: 0.0 (full ink/black) to 1.0 (empty/white)
- Direct lookup table (256 entries) for brightness-to-char mapping
- Font configuration: family, size, weight, style

---

## 5. PRETEXT RENDERER MODAL (Particle Simulation)
**File:** `/tree-ascii/types.ts` - `PretextModalState`

**Structure:**
- Modal frame
- Title: "Particle Field"
- ASCII field rendering (50 cols × 28 rows display)
- Monospace brightness ramp

**Field-to-Text Pipeline:**
- Brightness field (Float32Array, values 0–1)
- Oversample averaging (typically 2×2 per display cell)
- Character ramp lookup: `MONO_RAMP = ' .`-_:,;^=+/|)\\!?0oOQ#%@'`
- 24-character ramp for smooth tonal gradation

**File:** `/tree-ascii/asciiFieldRenderer.ts` - Core renderer
**Function:** `fieldToTextRows(field, fieldCols, fieldRows, displayCols, displayRows, oversample)`

**Animation:** Frame-based particle physics with continuous field updates

---

## 6. PATTERN RENDERER PRESETS (Media/GIF Animation)
**File:** `/tree-ascii/patternRenderer.ts` - Pattern animation system

**PatternRendererPreset Structure:**
```typescript
interface PatternRendererPreset {
  baseGridFrequency: number;      // 4–48, default 16
  paperColor: string;             // hex color
  inkColor: string;               // hex color
  thresholds: [n1, n2, n3, n4];   // default [0.18, 0.38, 0.58, 0.78]
  animation: PatternAnimation;
  hatchOpacity: { dark, mid, light };
  hatchSpacing: { dark, mid, light };
  toneWashOpacity: { dark, mid, light };
}
```

**Animation Types:**
1. **Continuous Animation**
   ```typescript
   { type: 'continuous', fromScale: 0.1, toScale: 2, durationMs: 1000 }
   ```
2. **Stepped Animation**
   ```typescript
   { type: 'stepped', steps: [{ scale: 0.5, delayMs: 100 }, ...] }
   ```

**Hatch Characters & Patterns:**
- Dark tone: high opacity hatch marks + fine spacing
- Mid tone: moderate hatch + spacing
- Light tone: sparse hatch + wide spacing

**Grayscale Conversion:**
- BT.709 luminance: `0.2126*R + 0.7152*G + 0.0722*B`
- Auto-contrast adjustment (3rd–97th percentile)

**File:** `/tree-ascii/mediaAscii.ts` - Media rendering pipeline

---

## 7. NODE BOX BADGES

**Badge Characters:**
- `[+]` - expanded/collapsible, children present
- `[-]` - collapsed, children present
- `[i]` - info badge
- `''` - no badge

**Positioning:** Top-right corner of node box
**Styling:** `badgeStyle` parameter (independent from box border)
**Format:** Fixed width 3 chars, right-aligned in available space

---

## 8. EDGE ROUTING (Manhattan Algorithm)

**File:** `/tree-ascii/edgeRouter.ts` - `routeEdges()`

**Characters Used:**
- Horizontals: `─`
- Verticals: `│`
- Corners: `┌` `┐` `└` `┘`

**Routing Pattern (for parent → child):**
1. Exit point: right side of parent, vertically centered
2. Midpoint column: halfway between parent and child
3. Horizontal segment: parent exit to midpoint
4. Corner: 90° turn at midpoint
5. Vertical segment: between parent and child row levels
6. Corner: 90° turn at child entry row
7. Horizontal segment: midpoint to child entry point (left side)

**Corner Characters (depend on direction):**
- Down-right: `┐` at top, `└` at bottom
- Up-right: `┘` at top, `┌` at bottom

**Style Key:** `edge` (from palette)

**Interface:**
```typescript
interface AsciiEdgePath {
  sourceId: string;
  targetId: string;
  cells: EdgeCell[];  // { col, row, char }
}
```

---

## 9. ETCH-A-SKETCH VIEW

**File:** `/src/views/etch-a-sketch/stampEtch.ts` - `stampEtch()`

**Layout Structure:**
```
[red frame with double border] ╔═══════════════╗
│ ETCH-A-SKETCH              │
│                            │
│  [single-line screen]     │
│  ┌──────────────────────┐  │
│  │  canvas area         │  │
│  │  [● cursor █ trail]  │  │
│  │                      │  │
│  └──────────────────────┘  │
│           ◉       ◉         │
│  ←↑↓→ draw  SHIFT peek      │
╚═════════════════════════════╝
```

**Components:**

### Frame
- **Outer frame:** Double-line `╔═══╗ ║ ╚═══╝`
- **Title:** " ETCH-A-SKETCH " centered on top border
- **Style:** `etchFrame` (white text, #c0392b red background)
- **Dimensions:** Full viewport minus margins

### Screen (Canvas)
- **Border:** Single-line `┌─────┐ │ └─────┘`
- **Interior:** Light tan background `#c8c0b4`
- **Style Key:** `etchScreen` (interior), `etchScreenBorder` (border)
- **Padding:** 3 cols left/right, 2 rows top, variable bottom

### Canvas Area
- **Drawable:** Interior of screen border
- **Trail character:** `█` (solid block, style `etchTrail`)
- **Cursor character:** `▓` (medium shade, style `etchCursor`)
- **Position:** Coordinates stored as "col,row" string keys in Set

### Knobs (Control Elements)
- **Small knob art (5×3):**
  ```
  ╭───╮
  │ ◉ │
  ╰───╯
  ```
- **Positioning:** Below screen, left and right edges (if space allows)
- **Fallback:** Inline indicators `◉` on frame borders if space insufficient
- **Style:** `etchKnob` (dark on light background)

### Controls Hint
- **Text:** "←↑↓→ draw  SHIFT peek  SPACE shake"
- **Position:** Row above bottom border, centered
- **Style:** `etchFrame`

**Interactivity:**
- Keyboard: arrow keys move cursor, trail follows
- Shift: temporary erase mode
- Space: shake/vibrate effect
- No click regions (keyboard-only)

---

## 10. GHOST ASSISTANT BLOB & BUBBLE

**File:** `/tree-ascii/ghostStamp.ts` - Ghost rendering

### Ghost Blob
**File:** `/tree-ascii/ghostStamp.ts` - `stampGhostBlob()`

**Dimensions:**
- Width: 18 cols
- Height: 12 rows
- Position: Bottom-left area (1 col inset)

**Visual Characteristics:**
- **Silhouette:** Rounded ghost shape (dome top, rounded body, wavy bottom)
- **Dome:** Elliptical, 55% of total height, centered in upper portion
- **Body:** Widens below dome using sine curve
- **Bottom edge:** Wavy/scalloped (animated waviness)
- **Rendering:** ASCII density using monospace brightness ramp

**Character Ramp (Density):**
- Uses `MONO_RAMP = ' .`-_:,;^=+/|)\\!?0oOQ#%@'` for shading
- Brightness mapping: 0.0 (dark) → ramp index → 1.0 (bright)
- Soft edge falloff: edge distance affects brightness

**Animation Parameters:**
- **Frame:** Incremental counter for wavy bottom animation
- **Cursor angle:** Eye direction tracking
- **Opacity:** Fade in/out (0–1)
- **Blink:** Pseudo-random period (80–120 frames), 2-frame blink duration

**Eyes:**
- **Characters:** `O` (open) or `-` (closed/blinking)
- **Position:** Upper third of blob, separated by ~5 cols
- **Movement:** Horizontal shift based on cursor angle, vertical shift from sine
- **Visibility:** Only when opacity > 0.3
- **Style:** `ghostEye`

**Style Keys:**
- `ghostBlob` - body shading

---

### Ghost Bubble (Chat Container)
**File:** `/tree-ascii/ghostStamp.ts` - `stampGhostBubble()`

**Dimensions:**
- **Width:** 30 cols fixed
- **Height:** Dynamic, min 5 rows, max to top of viewport
- **Position:** Above blob, left-aligned (same col as blob)

**Border Style:**
- Single-line corners: `┌` `┐` `└` `┘`
- Horizontals: `─`
- Verticals: `│`
- Style: `ghostBubbleBorder` (purple `#9b7ebd` on light `#f5f0fc`)

**Interior:**
- **Background:** `ghostBubbleBg` fill
- **Content rows:** Message area (scrollable) + input area
- **Divider:** Row of `·` characters between messages and input

**Message Rendering:**
- **System messages:** Prefix-less, style `ghostBubbleText`
- **User messages:** `> ` prefix, style `ghostBubbleUser`
- **Word-wrapping:** Max width 28 cols (content width - 2 for borders)
- **Scrolling:** Up to msgAreaHeight visible rows, scroll indicators `▲` `▼` on right border

**Input Row (Bottom):**
- **Focused state:** Text input visible, cursor `█` at end (always rendered, blink via style toggle)
- **Placeholder:** "say something..." in `ghostInputHint` color when empty
- **Cursor style:** `ghostInputCursor` (inverted colors)

**Close Button:**
- **Position:** Top-right corner
- **Text:** "[x]"
- **Style:** `ghostClose`
- **Hit region:** 3 cols wide, 1 row

**Hit Regions:**
1. Close button `[x]`
2. Input row (full width, for focus/click)
3. Full bubble area (drag/scroll region)

**Message Format:**
```
┌────────────────────────────┐
│                        [x] │
│ Ghost: hello there     ▲   │
│ > User: hi back            │
│ Ghost: how can I help?     │
│                        ▼   │
│ ·························· │
│ say something...           │
└────────────────────────────┘
```

**Scroll Behavior:**
- Manual scroll tracking via `scrollRow` state
- Indicators only show if more content exists
- Max scroll = total lines - visible rows

---

### Ghost Opt-Out Confirmation
**File:** `/tree-ascii/ghostStamp.ts` - `stampGhostOptOut()`

**Visual:**
```
┌────────────────────────────────┐
│ turn off ghost?  [yes] [no]    │
└────────────────────────────────┘
```

**Hit Regions:**
- `[yes]` button
- `[no]` button

---

## 11. MINIMAP

**File:** `/tree-ascii/Minimap.tsx` - Canvas-based minimap

**Dimensions:**
- **Canvas:** 150×100 pixels
- **World space:** Auto-computed bounding box + 10-col margin

**Rendering:**
- **Edges:** Thin lines between node centers
- **Nodes:** Small filled rectangles
- **Viewport rect:** Outline rectangle showing current camera view
- **Scaling:** Aspect-preserving fit within canvas

**Colors:**
- Edges: `#d9d1c5` (light tan)
- Nodes: `#c4bbb0` (medium tan)
- Viewport frame: `#8a7b6a` (darker tan)

**Interactivity:** Display-only (React canvas element, no hit regions in ASCII grid)

---

## 12. NOTION VIEW (Articles Table)

**File:** `/src/views/notion-view/notionStamp.ts` - Notion view rendering

**Layout:**
```
╔═════════════════════════════════════════╗
║  ARTICLES I'VE READ  [1234 total]     ║
╠═════════════════════════════════════════╣
║  ◄  2026 (584)  2025  ►               ║
╠═════════════════════════════════════════╣
║  > grep: query▌                        ║
╠════╤════════════════════╤════════════╣
║ ★  │ Title [^]        │ Date [v]   ║
╠════╪════════════════════╪════════════╣
║ ★  │ Article title  ↗ ... │ Dec 10 '24║
║    │ Another article    │ Jun 05 '26║
╠════╧════════════════════╧════════════╣
║  12 articles  sort: title (desc)    ║
╚════════════════════════════════════════╝
```

**Components:**

### 1. Title Row
- Left: "  ARTICLES I'VE READ"
- Right: "  [1234 total]  "
- Style: `modalTitle` (left), `modalHint` (right)

### 2. Tab Row (Year Navigation)
- Active year: `[2026 (584)]` with `modalTabActive` style (inverted)
- Inactive years: ` 2025 (430) ` with `modalTab` style
- Nav arrows: `◄  ` `  ►` on edges (if more years exist)

### 3. Search Row
- **Label:** `> grep: `
- **Input field:** Text or cursor `▌`
- **Placeholder:** "press / to search"
- **Cursor style:** `queryCursor`

### 4. Column Headers
- **Star column:** ` ★[ ] ` with sort indicator `[ ]` `[^]` `[v]`
- **Title column:** ` Title [^] ` (truncated to fit)
- **Date column:** ` Date [v] ` (truncated)
- **Active column:** `modalTabActive` (inverted)
- **Inactive columns:** `modalTab`

### 5. Article Rows
- **Star cell:** ` ★  ` (if starred) with `accentBorder` style
- **Title cell:** ` Article title  ↗ domain`
  - URL domain appended with `↗` symbol
  - Search matches highlighted with `queryMatch` style
  - Truncated with `…` if too long
- **Date cell:** ` Dec 10 '24` (formatted date, can have matches highlighted)

### 6. Status Bar
- Left: "12 articles" count
- Middle/Right: "sort: title (desc)" metadata
- Additional options: "[Double]", "[Ascending]", etc.

**Separator Rows (Column Separators):**
- Top: `╠════╤════════════╤═════════╣` (tee junctions)
- Middle: `╠════╪════════════╪═════════╣` (cross junctions)
- Bottom: `╠════╧════════════╧═════════╣` (bottom tees)

**Style Keys:**
- `modalBorder` - frame, dividers
- `modalTitle` - main title
- `modalTab` / `modalTabActive` - tabs, column headers
- `modalText` - row content
- `modalHint` - metadata, labels
- `queryText` - search input text
- `queryMatch` - search highlights
- `queryCursor` - active cursor
- `accentBorder` - star indicator
- `queryDivider` - internal vertical dividers

**Interactivity:**
- Year tab navigation
- Column header sorting (ascending/descending)
- Search field focus & query
- Row selection (starred toggle)

---

## 13. TEXT RENDERING UTILITIES

**File:** `/tree-ascii/charUtils.ts`

### Spaced Uppercase
**Function:** `spacedUppercase(text: string): string`
**Output:** Text converted to uppercase with spaces between each character
**Example:** "hello" → "H E L L O"

---

## 14. GRID RENDERING PIPELINE

**File:** `/tree-ascii/gridUtils.ts`

### Character Grid Buffer to React Elements
**Function:** `renderGridToElements(chars, styles, palette, rows, cols, charAt?)`

**Process:**
1. Iterate through each row of character buffer
2. Group consecutive cells with same style key into single `<span>`
3. Apply color/bg from palette for each span
4. Wrap each row in a `<div>`
5. Optional: substitute characters via `charAt` override (used for scramble effects)

**Output:** Array of React ReactNode elements (divs containing spans)

### Cell Coordinate Conversion
**Function:** `cellFromClientXY(x, y, charWidth, charHeight)`
**Input:** Pixel coordinates from mouse event
**Output:** `{ col, row }` grid coordinates
**Calculation:** `Math.floor(x / charWidth)`, `Math.floor(y / charHeight)`

---

## 15. STYLE PALETTE SYSTEM

**File:** `/tree-ascii/palette.ts` - `createAsciiPalette(theme)`

**Palette Structure:**
```typescript
Record<StyleKey, StyleDef>
// where StyleDef = { color: string, bg: string, fontWeight?: number }
```

**Standard Style Keys by Category:**

| Category | Keys |
|----------|------|
| **Background** | `bg`, `dot`, `border`, `dim` |
| **Node rendering** | `text`, `badge`, `border`, `edge`, `accentBorder`, `accentText`, `nodeBg` |
| **Modal UI** | `modalBorder`, `modalBg`, `modalTitle`, `modalText`, `modalClose`, `modalTab`, `modalTabActive`, `modalHint`, `modalTitleBold`, `modalHeading` |
| **Images** | `imageDeep`, `imageMid`, `imageLight`, `imageEdge` |
| **Query UI** | `queryBorder`, `queryBg`, `queryText`, `queryCursor`, `queryHint`, `queryButton`, `queryButtonActive`, `queryError`, `queryPill`, `queryPillBlink`, `queryDivider`, `queryCitation`, `queryMatch` |
| **Text styles** | `textBold`, `dimOnCard` |
| **Etch-A-Sketch** | `etchFrame`, `etchScreen`, `etchScreenBorder`, `etchTrail`, `etchCursor`, `etchKnob` |
| **Ghost** | `ghostBlob`, `ghostEye`, `ghostBubbleBorder`, `ghostBubbleBg`, `ghostBubbleText`, `ghostBubbleUser`, `ghostInput`, `ghostInputCursor`, `ghostClose`, `ghostInputHint` |

**Color Mapping:**
- All colors sourced from active `Theme` object
- Dark mode / light mode support via theme switching
- Example: `nodeText`, `nodeFill`, `cardBorder`, `cardBg`, `cardTextPrimary`, etc.

---

## 16. INTERACTIVE HIT REGIONS

**File:** `/tree-ascii/gridUtils.ts` - `HitRegion<A>` interface

**Generic Structure:**
```typescript
interface HitRegion<A> {
  col: number;      // left edge
  row: number;      // top edge
  width: number;    // in cols
  height: number;   // in rows
  action: A;        // discriminated action type
}
```

**Action Types by View:**

### Query Modal Actions:
- `'close'` - Close modal
- `'verbosity:{level}'` - Set verbosity
- `'nodeBrowser:toggle'` - Open/close browser
- `'submit'` - Submit query
- `'minimize'` - Minimize to pill
- `'cancel'` - Cancel loading
- `'retry'` | `'dismiss'` - Error handling
- `'pill:restore'` - Restore from pill

### Node Browser Actions:
- `'nodeBrowser:expand:{id}'` - Toggle expansion
- `'nodeBrowser:select:{id}'` - Select node

### Ghost Actions:
- `'ghost-close'` - Close bubble
- `'ghost-input'` - Focus input
- `'ghost-optout-yes'` | `'ghost-optout-no'` - Confirm opt-out

### Notion View Actions:
- `'yearTab:{year}'` - Switch year
- `'sort:{column}'` - Sort by column
- `'search'` - Focus search
- Star/row click regions

---

## 17. DIMENSIONS & CONSTRAINTS SUMMARY

| Component | Width | Height | Notes |
|-----------|-------|--------|-------|
| Node box | Variable (4+ cols) | Variable (3+ rows) | Depends on label |
| Modal box | 48–72 cols | 10+ rows | Dynamic |
| Query input modal | 72 cols max | Dynamic (10–30 rows) | Based on content |
| Query loading modal | 48 cols | 10 rows fixed | Minimal |
| Query error modal | 48 cols | 10 rows fixed | Minimal |
| Query viewing modal | 72 cols | gridRows - 2 | Full-height |
| Query pill | text.length + 4 | 3 rows fixed | Overlay |
| Section frame | Variable | Variable | Contains content |
| Ghost blob | 18 cols | 12 rows | Fixed aspect |
| Ghost bubble | 30 cols | 5–gridRows min(5, max) rows | Dynamic height |
| Etch frame | 80% viewport | 80% viewport | Responsive |
| Notion table | 90% viewport | 20–40 rows | Scrollable |
| Minimap | 150 px | 100 px | Canvas, non-interactive |

---

## 18. ANIMATION SYSTEMS

### Query Loading Spinner
**Characters:** `─ ╲ │ ╱` (cyclic rotation)
**Frame duration:** Per-frame, no fixed timing in ASCII layer

### Ghost Blob Wave Animation
**File:** `/tree-ascii/ghostStamp.ts`
- Wavy bottom edge varies by: `Math.sin(col * 1.2 + frame * 0.08)` + `Math.cos(col * 0.7 + frame * 0.05)`
- Frame increments each render cycle
- Applies to bottom edge contour calculation

### Ghost Eye Blink
- Pseudo-random blink period: 80–120 frames (varies per eye by frame offset)
- Blink duration: 2 frames per cycle
- Eye character: `-` (closed) or `O` (open)

### Pattern Animation (Media/GIF)
**Continuous:** Linear scale interpolation from `fromScale` to `toScale` over `durationMs`
**Stepped:** Discrete scale values with specified delays between steps

---

## 19. TEXT FORMATTING & WRAPPING

**Word-wrap Implementation:**
- Break on spaces, preserve word boundaries
- Max width parameter (in cols)
- Right-trim leading whitespace on wrapped lines

**Text Truncation:**
- If length exceeds max: slice + append `…`
- Format: `text.slice(0, maxLen - 1) + '…'`

**Search Query Highlighting:**
- Literal substring search (case-insensitive)
- Regex search if query starts with `/` (e.g., `/pattern/gi`)
- Highlighted regions wrapped with different style key

**Date Formatting (Notion view):**
- Input: ISO 8601 string (YYYY-MM-DD)
- Output: "Mmm DD 'YY" (e.g., "Dec 10 '24")

---

## 20. CONFIGURATION & STATE MANAGEMENT

### Query State
- `inputText: string` - Current input
- `cursorVisible: boolean` - Cursor blink state
- `verbosity: Verbosity` - Tone setting
- `selectedNodeIds: Set<string>` - Scope selection
- `nodeBrowserOpen: boolean` - Toggle
- `nodeBrowserExpanded: Set<string>` - Expanded nodes
- `nodeBrowserFocusIdx: number` - Keyboard focus
- `nodeBrowserScrollRow: number` - Vertical scroll

### Ghost State
- `messages: Array<{ role, content }>` - Conversation
- `inputText: string` - User input
- `inputFocused: boolean` - Focus state
- `scrollRow: number` - Message scroll
- `opacity: number` - Visibility (0–1)

### Etch State
- `trail: Set<string>` - "col,row" coordinates drawn
- `cursor: { col, row }` - Current cursor position
- `shakeActive: boolean` - Vibration effect

### Notion State
- `sortColumn: string` - Active sort key
- `sortDir: string` - 'asc' | 'desc'
- `searchQuery: string` - Current search
- `searchActive: boolean` - Focus state

---

## 21. INTERACTIVITY SUMMARY

### Keyboard Events
- Arrow keys: cursor movement (Etch)
- Shift: mode toggle (Etch)
- Space: action trigger (Etch, Query submit)
- Enter: submit action (Query)
- Escape: close modal
- `/`: search focus (Notion)
- Alphanumeric: text input (Query, Ghost)

### Mouse Events
- Click hit regions: trigger actions
- Scroll: vertical content paging
- No hover states in ASCII grid (could be added via style override)

### Computed Hit Regions
- All modals generate hit regions during layout computation
- Positions update with viewport size changes
- Actions dispatched to event handlers

---

## 22. SPECIAL EFFECTS & VISUAL FEATURES

### Scramble/Fade Effect
**File:** `/tree-ascii/useScramble.ts`
- Optional character substitution during render
- Used for UI transitions, reveal effects
- Via `charAt` callback in `renderGridToElements`

### Cursor Angle Tracking
**Ghost eyes:** Follow mouse cursor position via computed angle
- Horizontal shift: `Math.cos(angle)`
- Vertical shift: `Math.sin(angle) * 0.5`

### Opacity & Fade
**Ghost blob:** Opacity multiplier affects brightness calculation
- `brightness *= opacity`
- Soft fade in/out without discrete visibility

---

## END OF CATALOG

---

### Key File Locations Summary

| Concept | Primary File | Secondary Files |
|---------|--------------|-----------------|
| Box drawing & dividers | `charUtils.ts` | `queryStamp.ts` |
| Query modals | `queryStamp.ts`, `queryLayout.ts` | `types.ts` |
| Ghost rendering | `ghostStamp.ts` | `palette.ts` |
| Etch-A-Sketch | `stampEtch.ts` | `useEtchState.ts` |
| Notion table | `notionStamp.ts`, `frameStyles.ts` | `notionLayout.ts` |
| Image ASCII | `imageAscii.ts`, `charBrightness.ts` | `asciiFieldRenderer.ts` |
| Pattern animation | `patternRenderer.ts` | `mediaAscii.ts` |
| Palette & styles | `palette.ts`, `types.ts` | `themes.ts` |
| Grid rendering | `gridUtils.ts` | `useGridRenderer.ts` |
| Minimap | `Minimap.tsx` | (canvas-based, not ASCII) |
| Edge routing | `edgeRouter.ts` | `layoutEngine.ts` |

