# FIGMII — Agent Usability Findings

*Authored by Claude (claude-sonnet-4-6) after building 5 designs via Claude in Chrome*
*Branch: worktree-agent-usability-features — 2026-04-09*

---

## Summary

I built five full-canvas designs (API Explorer Dashboard, System Monitor, Chat Interface, File Browser, Component Spec Card) using `window.Figmii` exclusively. Each design was composed programmatically — no mouse interaction — using `addLayer`, `batch`, and `stores.document.setDocument`. The designs render correctly and the core API is sound. But the path to get there exposed a clear set of friction points that, if addressed, would make the agent experience significantly smoother.

---

## Designs Built

| Page | Design | Layers | Description |
|------|--------|--------|-------------|
| 1 | API Explorer Dashboard | 28 | Full-app layout: sidebar endpoints, URL bar, headers, JSON response |
| 2 | System Monitor | 35 | CPU/mem/disk gauges, process table, alert log, ASCII sparkline |
| 3 | Chat Interface | 79 | Contact sidebar, message bubbles (left/right), input bar |
| 4 | File Browser | 38 | Directory tree, file listing with git status, code preview |
| 5 | Component Spec Card | 48 | QueryBar spec: visual preview, props table, usage examples, state diagram |

---

## Issues Encountered

### 1. AgentBriefing was invisible until manually discovered

**What happened:** I spent the first ~10 interactions reading source files and making trial/error API calls because I didn't know the briefing existed. The `#figmii-agent-briefing` `<script type="application/json">` tag was present in the DOM the whole time with the correct API signature, valid style keys, layer kinds, and DOM selectors.

**Impact:** High. I crashed React twice and wasted many round-trips that the briefing would have prevented entirely.

**Fix proposals:**
- Log a one-time startup message: `console.log('[Figmii] Agent briefing available at: document.getElementById("figmii-agent-briefing")')` or `window.Figmii.brief()`.
- Expose `window.Figmii.briefing` as a direct property pointing to the parsed JSON object.
- Add to the accessibility tree: `aria-describedby="figmii-agent-briefing"` on `#root` (the briefing mentions this but it wasn't present on the running app).

---

### 2. `addLayer` accepts an object as `kind` silently — causes React crash

**What happened:** The briefing and source both document `addLayer(kind, name, rect, styleKey, props?)`. I called it as `addLayer({ kind: 'border-box', x: 2, ... })` (object-first, a natural guess for a JS API). JavaScript accepted this without error. The layer was stored with `kind = { kind: 'border-box', x: 2, ... }` (an object instead of a string), which caused React to throw `Objects are not valid as a React child` and **unmount the entire application** — requiring a page reload to recover.

**Impact:** Critical. Silent failure + full app crash + no recovery path without reload.

**Fix proposals:**
- Add a runtime guard at the top of `addLayer`:
  ```ts
  if (typeof kind !== 'string') throw new Error(
    `Figmii.addLayer: first argument must be a LayerKind string (e.g. "border-box"), got ${typeof kind}. ` +
    `Did you mean to pass an object? Use: addLayer('border-box', name, {col,row,width,height}, styleKey, props)`
  );
  ```
- Add a top-level React error boundary that catches render errors and displays a recovery UI rather than unmounting.
- Consider an alternative ergonomic overload: `addLayer({ kind, name, col, row, width, height, styleKey, ...props })` that maps to the correct internal call. This is the natural shape an agent (or developer) reaches for.

---

### 3. Invalid style keys crash React — no graceful fallback

**What happened:** I used style keys `'heading'` and `'code'` which don't exist in the palette. These caused the same React crash as issue #2 with no warning before the crash.

**Impact:** High. A single typo in a style key takes down the whole app.

**Fix proposals:**
- Validate style keys in `addLayer` against `STYLE_KEYS` and throw/warn immediately, before the layer reaches the store.
- In the renderer, add a fallback: if a style key is not found in the palette, use `'text'` and log a warning rather than propagating a render error.
- Expose `Figmii.styles.keys` clearly as an array (it exists as `Figmii.styles.keys` but the shape is `readonly string[]` not a callable — consistent with the rest of the API but worth calling out in the briefing).

---

### 4. No `Figmii.addPage(name)` convenience method — workaround required

**What happened:** `Figmii.primitives.addPage(doc, name)` is a pure function requiring the full doc object. Calling it via `applyPageMutation` pattern isn't exposed. The only reliable way to add pages was to manually reconstruct `doc.pages` with `setDocument`.

**Impact:** Medium. Clunky and easy to get wrong (I initially hit a `doc.pages is not iterable` error from calling the primitive directly).

**Fix proposal:**
```ts
Figmii.addPage(name: string): string  // returns new page id, sets it as active
Figmii.setActivePage(id: string): void  // convenience over the setDocument dance
Figmii.getPage(id: string): FigmiiPage | undefined
```

---

### 5. No rendered ASCII output accessible to agents

**What happened:** To verify a design looks right, I could only take a screenshot. There's no way to read what characters actually appear on the canvas as a string. The `StampBuffer` exists internally but isn't exposed.

**Impact:** Medium. I couldn't programmatically verify that text content fits within its bounding box, or that borders are rendering the expected box-drawing characters.

**Fix proposals:**
- Expose `Figmii.export.toAscii(pageId?)` returning a `string[][]` or plain multiline string of the rendered characters.
- Expose `Figmii.export.toJson()` (already exists) and document it clearly in the briefing — this returns the full spec but not the rendered buffer.
- Expose a `Figmii.renderLayer(id)` that returns the StampBuffer for a single layer.

---

### 6. `data-spec='full-document'` listed in briefing but not present in DOM

**What happened:** The AgentBriefing lists `"specViewJson": "[data-spec='full-document']"` as a DOM selector. This element does not exist on the running page. Presumably it's part of a SpecView feature not yet wired to the DOM.

**Impact:** Low-medium. An agent following the briefing to read design state via DOM would fail silently.

**Fix proposal:** Either render the spec view element (even hidden) so the selector works, or remove it from the briefing until it does. A hidden `<script type="application/json" data-spec="full-document">` updated on document change would be extremely valuable — it would let agents read the full design without any JS calls.

---

### 7. Layer properties per `kind` not documented in briefing

**What happened:** The briefing describes layer kinds (e.g. `border-box: "Rectangular border with optional title/fill/padding"`) but does not enumerate the valid `properties` fields for each kind. I had to read `src/primitives/document-model/types.ts` to learn that `borderStyle` only accepts `'rounded' | 'double' | 'section' | 'custom'` (not `'single'`, which I tried first).

**Impact:** Medium. Agents must guess or read source to know what properties to pass.

**Fix proposal:** Extend the briefing's `layerKinds` entries with a `props` schema:
```json
"border-box": {
  "desc": "Rectangular border with optional title/fill/padding",
  "default": "border",
  "props": {
    "borderStyle": "'rounded' | 'double' | 'section' | 'custom'",
    "title": "string (optional)",
    "bgStyleKey": "StyleKey (optional)",
    "padding": "{ top, right, bottom, left } (cells)"
  }
}
```

---

### 8. No layer lookup by name

**What happened:** After building a design, I wanted to find a specific layer to update it. `Figmii.getLayers()` returns all layers; there's no `findLayer(name)` or query capability.

**Impact:** Low-medium. Requires manual iteration.

**Fix proposals:**
```ts
Figmii.findLayer(name: string): Layer | undefined
Figmii.findLayers({ kind?, name?, styleKey? }): Layer[]
```

---

### 9. `batch()` scope is per-page — but page switching mid-batch isn't guarded

**What happened:** `batch()` is a single undo entry. But I was switching the active page via `setDocument` inside the same block, which could produce unexpected undo behaviour. There's no warning.

**Impact:** Low. Mostly a footgun for complex multi-page operations.

**Fix proposal:** Document the batch/page interaction clearly. Optionally add a `batch(pageId, fn)` overload that handles the page switch atomically.

---

### 10. No viewport control for agents — `fitToPage()` missing

**What happened:** After adding layers to a page, the viewport doesn't auto-fit. For wide designs (228 cols), content is cropped in screenshots. I had to zoom manually via the UI.

**Impact:** Low for design creation, high for screenshot verification.

**Fix proposals:**
```ts
Figmii.stores.viewport.getState().fitToPage()   // zoom + pan to show all layers
Figmii.stores.viewport.getState().setZoom(0.5)  // already works, just undocumented
```
Document `setZoom` in the briefing since it exists and works.

---

## What Worked Well

- **`window.Figmii` global is clean and readable** — once I had the correct API signature, composition was fast and expressive.
- **`batch()` for bulk inserts** — a single undo entry for a whole design is exactly right. Works reliably.
- **Style key palette is rich** — 55 named keys covering the full readme-app theme spectrum. Using thematic keys like `queryText`, `etchScreen`, `ghostBubbleBg` made the designs semantically expressive.
- **`section` borderStyle** — the only box style with an inline title (`{title: 'TEXT'}` in properties). Made headers clean and self-labelling.
- **`data-layer-id`, `data-status`, `data-tool` attributes** — the accessibility tree and DOM selectors are well-placed for programmatic inspection.
- **`Figmii.subscribe('document', cb)`** — reactive design state is a great pattern; agents could watch for changes made by the human PM and respond.
- **Text wrapping in `text-block`** — multiline `\n`-separated content renders correctly with proper line breaks, which is essential for content-heavy layouts.

---

## Proposed Priority Order

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | React crash + full unmount on bad layer data (issues #2, #3) | Small — error boundary + input validation |
| P0 | AgentBriefing discoverability (issue #1) | Tiny — console.log + `Figmii.briefing` property |
| P1 | `Figmii.addPage(name)` + `Figmii.setActivePage(id)` (issue #4) | Small |
| P1 | Layer props schema in briefing (issue #7) | Small — editorial |
| P1 | `data-spec='full-document'` element (issue #6) | Medium — hidden live JSON element |
| P2 | `Figmii.export.toAscii()` (issue #5) | Medium — expose StampBuffer output |
| P2 | `Figmii.findLayer(name)` (issue #8) | Tiny |
| P3 | `fitToPage()` viewport helper (issue #10) | Small |
| P3 | `batch(pageId, fn)` overload (issue #9) | Medium |
