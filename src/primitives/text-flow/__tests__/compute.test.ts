import { describe, it, expect } from 'vitest'
import { computeTextFlow } from '../compute.ts'
import type { TextFlowConfig } from '../types.ts'

function makeConfig(overrides: Partial<TextFlowConfig> = {}): TextFlowConfig {
  return {
    content: overrides.content ?? 'Hello world',
    boundingRect: overrides.boundingRect ?? { col: 0, row: 0, width: 20, height: 10 },
    padding: overrides.padding ?? { top: 0, right: 0, bottom: 0, left: 0 },
    kerning: overrides.kerning ?? 0,
    lineSpacing: overrides.lineSpacing ?? 0,
    alignment: overrides.alignment ?? 'left',
  }
}

describe('computeTextFlow', () => {
  it('returns empty result for empty content', () => {
    const result = computeTextFlow(makeConfig({ content: '' }))
    expect(result.lines).toEqual([])
    expect(result.totalRows).toBe(0)
    expect(result.overflow).toBe(false)
  })

  it('renders simple text on a single line', () => {
    const result = computeTextFlow(makeConfig({ content: 'Hello' }))
    expect(result.lines.length).toBe(1)
    expect(result.lines[0]!.row).toBe(0)
    expect(result.lines[0]!.segments.length).toBeGreaterThan(0)
  })

  it('word-wraps text exceeding available width', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hello wonderful world',
      boundingRect: { col: 0, row: 0, width: 10, height: 10 },
    }))
    expect(result.lines.length).toBeGreaterThan(1)
  })

  it('breaks long unbroken words across multiple lines', () => {
    const result = computeTextFlow(makeConfig({
      content: 'abcdefghij',
      boundingRect: { col: 0, row: 0, width: 4, height: 10 },
    }))

    const lineTexts = result.lines.map((line) => line.segments.map((segment) => segment.text).join(''))
    expect(lineTexts).toEqual(['abcd', 'efgh', 'ij'])
    expect(result.totalRows).toBe(3)
  })

  it('moves a word to the next line before splitting it when it fits there', () => {
    const result = computeTextFlow(makeConfig({
      content: 'ab cdefg',
      boundingRect: { col: 0, row: 0, width: 5, height: 10 },
    }))

    const lineTexts = result.lines.map((line) => line.segments.map((segment) => segment.text).join(''))
    expect(lineTexts[1]).toBe('cdefg')
  })

  it('applies left alignment (segments start at left padding)', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hi',
      alignment: 'left',
      padding: { top: 0, right: 0, bottom: 0, left: 2 },
    }))
    expect(result.lines[0]!.segments[0]!.col).toBe(2)
  })

  it('applies center alignment', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hi',
      alignment: 'center',
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    // "Hi" is 2 chars, available width is 20
    // Center offset = floor((20 - 2) / 2) = 9
    const firstCol = result.lines[0]!.segments[0]!.col
    expect(firstCol).toBe(9)
  })

  it('applies right alignment', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hi',
      alignment: 'right',
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    // "Hi" is 2 chars, available width 20
    // Right offset = 20 - 2 = 18
    const firstCol = result.lines[0]!.segments[0]!.col
    expect(firstCol).toBe(18)
  })

  it('detects overflow when lines exceed available height', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Line one\nLine two\nLine three\nLine four',
      boundingRect: { col: 0, row: 0, width: 20, height: 2 },
    }))
    expect(result.overflow).toBe(true)
    expect(result.overflowLineCount).toBeGreaterThan(0)
  })

  it('does not report overflow when all lines fit', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hello',
      boundingRect: { col: 0, row: 0, width: 20, height: 5 },
    }))
    expect(result.overflow).toBe(false)
    expect(result.overflowLineCount).toBe(0)
  })

  it('applies line spacing (double spacing)', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Line one\nLine two\nLine three',
      lineSpacing: 1,
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    expect(result.lines.length).toBe(3)
    expect(result.lines[0]!.row).toBe(0)
    expect(result.lines[1]!.row).toBe(2)
    expect(result.lines[2]!.row).toBe(4)
  })

  it('applies kerning level 1 (single space between chars)', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hi',
      kerning: 1,
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    // With kerning 1, "Hi" should be rendered as "H i" (3 chars wide: 2 + 1*1)
    const seg = result.lines[0]!.segments[0]!
    expect(seg.text).toBe('H i')
  })

  it('applies kerning level 2 (double space between chars)', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hi',
      kerning: 2,
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    // With kerning 2, "Hi" should be rendered as "H  i" (5 chars wide: 2 + 1*2)
    const seg = result.lines[0]!.segments[0]!
    expect(seg.text).toBe('H  i')
  })

  it('respects padding', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hello',
      padding: { top: 2, right: 0, bottom: 0, left: 3 },
    }))
    expect(result.lines[0]!.row).toBe(2)
    expect(result.lines[0]!.segments[0]!.col).toBe(3)
  })

  it('handles multiline content with newlines', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Line 1\nLine 2',
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    expect(result.lines.length).toBe(2)
  })

  it('handles empty lines in content', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hello\n\nWorld',
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    expect(result.lines.length).toBe(3)
  })

  it('returns empty for zero-width bounding rect', () => {
    const result = computeTextFlow(makeConfig({
      boundingRect: { col: 0, row: 0, width: 0, height: 10 },
    }))
    expect(result.lines).toEqual([])
  })

  it('parses markdown headings in text flow', () => {
    const result = computeTextFlow(makeConfig({
      content: '# Heading',
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    expect(result.lines.length).toBe(1)
    expect(result.lines[0]!.segments[0]!.styleKey).toBe('modalHeading')
  })

  it('parses bold markdown in text flow', () => {
    const result = computeTextFlow(makeConfig({
      content: 'Hello **world**',
      boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    }))
    // Should have multiple segments - normal and bold
    const allSegments = result.lines[0]!.segments
    const boldSegment = allSegments.find(s => s.styleKey === 'textBold')
    expect(boldSegment).toBeDefined()
  })
})
