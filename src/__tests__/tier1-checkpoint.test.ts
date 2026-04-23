/**
 * Tier 1 Checkpoint Test
 *
 * Validates the full primitive pipeline WITHOUT any UI:
 * 1. Create a FigmiiDocument with layers on two pages
 * 2. Stamp border boxes and fills into buffers
 * 3. Merge buffers in z-order
 * 4. Render to grid elements via the DOM Grid Renderer
 * 5. Verify output structure (spans, colors, data attributes)
 *
 * If this passes, the Tier 1 foundation is solid.
 */
import { describe, it, expect } from 'vitest'

// F1: Grid Engine
import { createDefaultGridConfig } from '@primitives/grid-engine/measurement.ts'

// F3: Style System
import { createAsciiPalette } from '@primitives/style-system/palette.ts'
import type { Theme } from '@primitives/style-system/types.ts'

// F4: Stamp System
import { createBuffer, mergeBuffers } from '@primitives/stamp-system/buffer.ts'
import { stampNodeBox, stampFill, stampDivider, stampModalBox, stampHorizontalDivider } from '@primitives/stamp-system/stamps.ts'

// F9: Document Model
import { createEmptyDocument, addLayer, addPage } from '@primitives/document-model/operations.ts'

// F12: DOM Grid Renderer
import { renderGridToElements } from '@renderer/renderGrid.ts'

// F5: Text Flow Engine
import { computeTextFlow } from '@primitives/text-flow/compute.ts'

// F7: Pattern Fill
import { stampPatternFill } from '@primitives/pattern-fill/stamper.ts'
import type { PatternTile } from '@primitives/pattern-fill/types.ts'

const testTheme: Theme = {
  name: 'test',
  colors: {
    background: '#1e1e2e',
    foreground: '#e0e0f0',
    accent: '#7aa2f7',
    accentForeground: '#ffffff',
    muted: '#444466',
    mutedForeground: '#8888aa',
    border: '#555577',
    card: '#2a2a3e',
    cardForeground: '#c0c0d0',
    error: '#b04040',
    success: '#40b070',
  },
}

describe('Tier 1 Checkpoint', () => {
  it('creates a document with two pages and layers', () => {
    let doc = createEmptyDocument('Checkpoint Test')
    doc = addPage(doc, 'Page 2')

    const page1 = doc.pages[0]!
    const updatedPage1 = addLayer(
      page1,
      'border-box',
      'Header Box',
      { col: 2, row: 1, width: 30, height: 8 },
      'border',
      { borderStyle: 'rounded', padding: { top: 1, right: 1, bottom: 1, left: 1 } },
    )

    doc = { ...doc, pages: [updatedPage1, doc.pages[1]!] }

    expect(doc.pages).toHaveLength(2)
    expect(Object.keys(doc.pages[0]!.layers)).toHaveLength(2) // Background + 1 user layer
    expect(doc.name).toBe('Checkpoint Test')
  })

  it('stamps a rounded node box with correct characters', () => {
    const buf = stampNodeBox(
      { col: 0, row: 0, width: 20, height: 5 },
      'border',
      'nodeBg',
    )

    expect(buf.width).toBe(20)
    expect(buf.height).toBe(5)
    expect(buf.chars[0]![0]).toBe('╭')
    expect(buf.chars[0]![19]).toBe('╮')
    expect(buf.chars[4]![0]).toBe('╰')
    expect(buf.chars[4]![19]).toBe('╯')
    expect(buf.chars[0]![10]).toBe('─')
    expect(buf.chars[2]![0]).toBe('│')
    expect(buf.chars[2]![19]).toBe('│')
    // Interior is space with bgStyle
    expect(buf.chars[2]![10]).toBe(' ')
    expect(buf.styles[2]![10]).toBe('nodeBg')
  })

  it('stamps a modal box with correct characters', () => {
    const buf = stampModalBox(
      { col: 0, row: 0, width: 15, height: 4 },
      'modalBorder',
      'modalBg',
    )

    expect(buf.chars[0]![0]).toBe('╔')
    expect(buf.chars[0]![14]).toBe('╗')
    expect(buf.chars[3]![0]).toBe('╚')
    expect(buf.chars[3]![14]).toBe('╝')
    expect(buf.chars[1]![0]).toBe('║')
    expect(buf.chars[0]![5]).toBe('═')
  })

  it('stamps a fill and a divider', () => {
    const fill = stampFill(5, 3, '░', 'dim')
    expect(fill.chars[1]![2]).toBe('░')
    expect(fill.styles[1]![2]).toBe('dim')

    const div = stampDivider(20, 'queryDivider')
    expect(div.chars[0]![0]).toBe('─')
    expect(div.chars[0]![19]).toBe('─')

    const teeDiv = stampHorizontalDivider(10, 'queryDivider')
    expect(teeDiv.chars[0]![0]).toBe('╟')
    expect(teeDiv.chars[0]![9]).toBe('╢')
    expect(teeDiv.chars[0]![5]).toBe('─')
  })

  it('merges buffers in z-order correctly', () => {
    // Create a canvas-sized buffer
    const canvas = createBuffer(40, 20)

    // Stamp a node box at (2, 1)
    const box = stampNodeBox({ col: 0, row: 0, width: 20, height: 8 }, 'border', 'nodeBg')
    const withBox = mergeBuffers(canvas, box, 2, 1)

    // Stamp a fill region inside the box at (4, 3) - 16x4
    const fill = stampFill(16, 4, '░', 'dim')
    const withFill = mergeBuffers(withBox, fill, 4, 3)

    // Stamp a divider across the canvas at row 10
    const div = stampDivider(36, 'queryDivider')
    const final = mergeBuffers(withFill, div, 2, 10)

    // Verify: box corners at their expected positions
    expect(final.chars[1]![2]).toBe('╭')
    expect(final.chars[1]![21]).toBe('╮')

    // Verify: fill overwrote the box interior
    expect(final.chars[4]![5]).toBe('░')
    expect(final.styles[4]![5]).toBe('dim')

    // Verify: divider at row 10
    expect(final.chars[10]![5]).toBe('─')
    expect(final.styles[10]![5]).toBe('queryDivider')

    // Verify: empty areas remain space
    expect(final.chars[0]![0]).toBe(' ')
    expect(final.styles[0]![0]).toBe('bg')
  })

  it('renders grid to elements with correct spans and colors', () => {
    const palette = createAsciiPalette(testTheme)

    // Create a simple buffer with a node box
    const canvas = createBuffer(30, 10)
    const box = stampNodeBox({ col: 0, row: 0, width: 10, height: 5 }, 'border', 'nodeBg')
    const final = mergeBuffers(canvas, box, 5, 2)

    const rows = renderGridToElements(final, palette)

    expect(rows).toHaveLength(10)

    // Row 2 should have spans: bg spaces, then box top border, then bg spaces
    const row2 = rows[2]!
    expect(row2.row).toBe(2)
    expect(row2.spans.length).toBeGreaterThanOrEqual(2) // at least bg + border spans

    // Find the span containing the top-left corner
    const cornerSpan = row2.spans.find(s => s.text.includes('╭'))
    expect(cornerSpan).toBeDefined()
    expect(cornerSpan!.color).toBe(palette.border.color)
    expect(cornerSpan!.bg).toBe(palette.border.bg)

    // Row 3: should have bg, border (left side), interior (nodeBg), border (right side), bg
    const row3 = rows[3]!
    // The box interior at col 6-14 has nodeBg style (the border stamper fills interior with bgStyle)
    // Find the span that covers the interior of the box (after left border at col 5, before right border at col 14)
    const interiorSpan = row3.spans.find(s => s.startCol >= 6 && s.endCol <= 14)
    expect(interiorSpan).toBeDefined()
    // Interior uses the nodeBg style from the stampNodeBox call
    expect(interiorSpan!.color).toBe(palette.nodeBg.color)
  })

  it('renders spans with merged consecutive same-style cells', () => {
    const palette = createAsciiPalette(testTheme)

    // All same style → should be 1 span per row
    const fill = stampFill(20, 3, '█', 'text')
    const rows = renderGridToElements(fill, palette)

    expect(rows).toHaveLength(3)
    // Each row should be a single span (all cells have the same style)
    for (const row of rows) {
      expect(row.spans).toHaveLength(1)
      expect(row.spans[0]!.text).toBe('█'.repeat(20))
      expect(row.spans[0]!.startCol).toBe(0)
      expect(row.spans[0]!.endCol).toBe(20)
    }
  })

  it('uses grid config from default document', () => {
    const config = createDefaultGridConfig()
    expect(config.fontFamily).toContain('IBM Plex Mono')
    expect(config.cellWidth).toBeCloseTo(8.4, 1)
    expect(config.cellHeight).toBeCloseTo(18.9, 1)
    expect(config.canvasCols).toBe(228)
    expect(config.canvasRows).toBe(57)
  })

  it('full pipeline: document → stamp → merge → render → verify', () => {
    const palette = createAsciiPalette(testTheme)

    // Step 1: Create a document
    let doc = createEmptyDocument('Full Pipeline')
    const page = doc.pages[0]!

    // Step 2: Add layers to the document model
    let updatedPage = addLayer(
      page,
      'border-box', 'Modal',
      { col: 5, row: 2, width: 30, height: 12 },
      'modalBorder',
      { borderStyle: 'double', padding: { top: 1, right: 1, bottom: 1, left: 1 } },
    )
    updatedPage = addLayer(
      updatedPage,
      'divider', 'Divider',
      { col: 5, row: 5, width: 30, height: 1 },
      'queryDivider',
      {},
    )
    doc = { ...doc, pages: [updatedPage] }

    // Step 3: Stamp each layer into its own buffer
    const modalBuf = stampModalBox(
      { col: 0, row: 0, width: 30, height: 12 },
      'modalBorder', 'modalBg',
    )
    const dividerBuf = stampHorizontalDivider(30, 'queryDivider')

    // Step 4: Compose onto a canvas buffer
    const canvas = createBuffer(40, 20)
    const withModal = mergeBuffers(canvas, modalBuf, 5, 2)
    const composed = mergeBuffers(withModal, dividerBuf, 5, 5)

    // Step 5: Render to grid elements
    const rows = renderGridToElements(composed, palette)

    // Step 6: Verify
    expect(rows).toHaveLength(20)

    // Modal top border at row 2
    const row2 = rows[2]!
    const modalTopSpan = row2.spans.find(s => s.text.includes('╔'))
    expect(modalTopSpan).toBeDefined()

    // Divider at row 5 should have ╟ and ╢
    const row5 = rows[5]!
    const divStartSpan = row5.spans.find(s => s.text.includes('╟'))
    expect(divStartSpan).toBeDefined()

    // Modal bottom at row 13
    const row13 = rows[13]!
    const modalBottomSpan = row13.spans.find(s => s.text.includes('╚'))
    expect(modalBottomSpan).toBeDefined()

    // Document model has correct layer count
    expect(Object.keys(doc.pages[0]!.layers)).toHaveLength(3) // Background + 2 user layers
    expect(doc.pages[0]!.layerOrder).toHaveLength(3)
  })

  it('flows text through a border-box using the Text Flow Engine', () => {
    // PRD Tier 1 Checkpoint requirement #2:
    // "Flows text through a border-box using the Text Flow Engine"
    const result = computeTextFlow({
      content: 'Hello World, this is a test of text flow within a bounded region.',
      boundingRect: { col: 2, row: 1, width: 20, height: 8 },
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
      kerning: 0,
      lineSpacing: 0,
      alignment: 'left',
    })

    // Text should wrap within the 18-char available width (20 - 2 padding)
    expect(result.lines.length).toBeGreaterThan(1)
    expect(result.overflow).toBe(false)

    // First line should respect padding offset (coordinates are padding-relative)
    const firstLine = result.lines[0]!
    expect(firstLine.row).toBe(1) // padding.top 1
    expect(firstLine.segments[0]!.col).toBe(1) // padding.left 1

    // Verify text wraps correctly (no line exceeds available width)
    for (const line of result.lines) {
      for (const seg of line.segments) {
        expect(seg.text.length).toBeLessThanOrEqual(18)
      }
    }
  })

  it('applies a pattern fill to a region', () => {
    // PRD Tier 1 Checkpoint requirement #3:
    // "Applies a pattern fill to a region"
    const checkerTile: PatternTile = {
      id: 'checker',
      name: 'Checker',
      chars: [['░', '▒'], ['▒', '░']],
      styles: [['dim', 'dim'], ['dim', 'dim']],
      category: 'crosshatch',
    }

    const buffer = stampPatternFill(
      {
        tileId: 'checker',
        region: { col: 0, row: 0, width: 6, height: 4 },
        offsetCol: 0,
        offsetRow: 0,
      },
      checkerTile,
    )

    expect(buffer).not.toBeNull()
    expect(buffer!.width).toBe(6)
    expect(buffer!.height).toBe(4)

    // Verify the checker pattern tiles correctly
    expect(buffer!.chars[0]![0]).toBe('░')
    expect(buffer!.chars[0]![1]).toBe('▒')
    expect(buffer!.chars[1]![0]).toBe('▒')
    expect(buffer!.chars[1]![1]).toBe('░')
    // Pattern wraps: col 2 = col 0 of tile
    expect(buffer!.chars[0]![2]).toBe('░')
    expect(buffer!.chars[0]![3]).toBe('▒')
  })

  it('full pipeline with text flow and pattern fill', () => {
    const palette = createAsciiPalette(testTheme)

    // Create canvas
    const canvas = createBuffer(40, 20)

    // Stamp a border box
    const box = stampModalBox({ col: 0, row: 0, width: 30, height: 12 }, 'modalBorder', 'modalBg')
    const withBox = mergeBuffers(canvas, box, 5, 2)

    // Apply pattern fill inside the box
    const patternTile: PatternTile = {
      id: 'dots',
      name: 'Dots',
      chars: [['.', ' '], [' ', '.']],
      styles: [['dim', 'modalBg'], ['modalBg', 'dim']],
      category: 'dots',
    }
    const fillBuf = stampPatternFill(
      { tileId: 'dots', region: { col: 0, row: 0, width: 28, height: 10 }, offsetCol: 0, offsetRow: 0 },
      patternTile,
    )
    expect(fillBuf).not.toBeNull()
    const withFill = mergeBuffers(withBox, fillBuf!, 6, 3)

    // Flow text into the box
    const textResult = computeTextFlow({
      content: 'Hello World',
      boundingRect: { col: 6, row: 3, width: 28, height: 10 },
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
      kerning: 0,
      lineSpacing: 0,
      alignment: 'center',
    })
    expect(textResult.lines.length).toBeGreaterThan(0)

    // Render the composed buffer
    const rows = renderGridToElements(withFill, palette)
    expect(rows).toHaveLength(20)

    // Box border should be present
    const row2 = rows[2]!
    expect(row2.spans.find(s => s.text.includes('╔'))).toBeDefined()

    // Fill pattern should be inside the box
    const row4 = rows[4]!
    const fillSpan = row4.spans.find(s => s.text.includes('.'))
    expect(fillSpan).toBeDefined()
  })
})
