import { describe, it, expect } from 'vitest'
import { stampTextBlock } from '../stampText.ts'
import type { TextBlockProperties } from '@primitives/document-model/types.ts'
import type { GridRect } from '@primitives/grid-engine/types.ts'

function makeProps(overrides: Partial<TextBlockProperties> = {}): TextBlockProperties {
  return {
    content: overrides.content ?? 'Hello',
    fontFamily: overrides.fontFamily ?? 'IBM Plex Mono',
    kerning: overrides.kerning ?? 0,
    lineSpacing: overrides.lineSpacing ?? 0,
    alignment: overrides.alignment ?? 'left',
    styleKey: overrides.styleKey ?? 'text',
    ...overrides,
  }
}

function makeRect(overrides: Partial<GridRect> = {}): GridRect {
  return {
    col: overrides.col ?? 0,
    row: overrides.row ?? 0,
    width: overrides.width ?? 20,
    height: overrides.height ?? 5,
  }
}

describe('stampTextBlock', () => {
  it('creates a buffer of the correct dimensions', () => {
    const buf = stampTextBlock(makeProps(), makeRect())
    expect(buf.width).toBe(20)
    expect(buf.height).toBe(5)
  })

  it('writes text characters into the buffer', () => {
    const buf = stampTextBlock(makeProps({ content: 'Hi' }), makeRect())
    expect(buf.chars[0]![0]).toBe('H')
    expect(buf.chars[0]![1]).toBe('i')
  })

  it('applies the correct style key to text', () => {
    const buf = stampTextBlock(makeProps({ content: 'A' }), makeRect())
    expect(buf.styles[0]![0]).toBe('text')
  })

  it('returns empty buffer for empty content', () => {
    const buf = stampTextBlock(makeProps({ content: '' }), makeRect())
    // All cells should be spaces with bg style
    expect(buf.chars[0]![0]).toBe(' ')
    expect(buf.styles[0]![0]).toBe('bg')
  })

  it('handles center alignment', () => {
    const buf = stampTextBlock(
      makeProps({ content: 'Hi', alignment: 'center' }),
      makeRect({ width: 20 }),
    )
    // "Hi" is 2 chars, centered in 20 → offset 9
    expect(buf.chars[0]![9]).toBe('H')
    expect(buf.chars[0]![10]).toBe('i')
  })

  it('handles right alignment', () => {
    const buf = stampTextBlock(
      makeProps({ content: 'Hi', alignment: 'right' }),
      makeRect({ width: 20 }),
    )
    // "Hi" is 2 chars, right-aligned in 20 → offset 18
    expect(buf.chars[0]![18]).toBe('H')
    expect(buf.chars[0]![19]).toBe('i')
  })

  it('wraps long text within bounds', () => {
    const buf = stampTextBlock(
      makeProps({ content: 'Hello wonderful world' }),
      makeRect({ width: 10, height: 5 }),
    )
    // Should have content on multiple rows
    let nonEmptyRows = 0
    for (let r = 0; r < buf.height; r++) {
      const rowText = buf.chars[r]!.join('').trim()
      if (rowText.length > 0) nonEmptyRows++
    }
    expect(nonEmptyRows).toBeGreaterThan(1)
  })

  it('handles zero-width rect without crashing', () => {
    const buf = stampTextBlock(makeProps(), makeRect({ width: 0 }))
    expect(buf.width).toBe(0)
  })

  it('handles zero-height rect without crashing', () => {
    const buf = stampTextBlock(makeProps(), makeRect({ height: 0 }))
    expect(buf.height).toBe(0)
  })
})
