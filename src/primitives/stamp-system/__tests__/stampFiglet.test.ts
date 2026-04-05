import { describe, it, expect } from 'vitest'
import { stampFigletText } from '../stampFiglet.ts'
import { parseFLF } from '@primitives/figlet-engine/parser.ts'
import type { FigletTextProperties } from '@primitives/document-model/types.ts'
import type { GridRect } from '@primitives/grid-engine/types.ts'
import type { FigletFont } from '@primitives/figlet-engine/types.ts'

// Create a minimal test font with height 2
function makeTestFont(): FigletFont {
  const flfContent = [
    'flf2a$ 2 1 6 0 1',
    'Test font',
    '  @',
    '  @@',
    '| @',
    '|_@@',
  ].join('\n')
  return parseFLF(flfContent)
}

function makeProps(overrides: Partial<FigletTextProperties> = {}): FigletTextProperties {
  return {
    content: overrides.content ?? 'Hello',
    fontName: overrides.fontName ?? 'test',
    alignment: overrides.alignment ?? 'left',
    styleKey: overrides.styleKey ?? 'text',
    ...overrides,
  }
}

function makeRect(overrides: Partial<GridRect> = {}): GridRect {
  return {
    col: overrides.col ?? 0,
    row: overrides.row ?? 0,
    width: overrides.width ?? 40,
    height: overrides.height ?? 10,
  }
}

describe('stampFigletText', () => {
  it('creates a buffer of the correct dimensions', () => {
    const font = makeTestFont()
    const buf = stampFigletText(makeProps(), makeRect(), font)
    expect(buf.width).toBe(40)
    expect(buf.height).toBe(10)
  })

  it('renders FIGlet characters into the buffer', () => {
    const font = makeTestFont()
    const buf = stampFigletText(
      makeProps({ content: '!' }),
      makeRect({ width: 20, height: 10 }),
      font,
    )
    // The ! character is "| " on line 0 and "|_" on line 1
    // Vertically centered in height 10: offset = floor((10-2)/2) = 4
    expect(buf.chars[4]![0]).toBe('|')
    expect(buf.chars[5]![0]).toBe('|')
    expect(buf.chars[5]![1]).toBe('_')
  })

  it('applies the correct style key', () => {
    const font = makeTestFont()
    const buf = stampFigletText(
      makeProps({ content: '!', styleKey: 'accentText' }),
      makeRect({ width: 20, height: 10 }),
      font,
    )
    // Find a non-space character and check its style
    const row = 4 // vertically centered
    expect(buf.styles[row]![0]).toBe('accentText')
  })

  it('returns empty buffer for empty content', () => {
    const font = makeTestFont()
    const buf = stampFigletText(
      makeProps({ content: '' }),
      makeRect(),
      font,
    )
    // All cells should be spaces with bg style
    expect(buf.chars[0]![0]).toBe(' ')
    expect(buf.styles[0]![0]).toBe('bg')
  })

  it('clips content to rect bounds', () => {
    const font = makeTestFont()
    // Use a very small rect
    const buf = stampFigletText(
      makeProps({ content: '!!!!!!!!!!!!!!!!' }),
      makeRect({ width: 5, height: 3 }),
      font,
    )
    expect(buf.width).toBe(5)
    expect(buf.height).toBe(3)
    // No crash
  })

  it('centers text horizontally with center alignment', () => {
    const font = makeTestFont()
    const buf = stampFigletText(
      makeProps({ content: '!', alignment: 'center' }),
      makeRect({ width: 20, height: 10 }),
      font,
    )
    // ! renders to width 2, centered in 20 → offset 9
    const row = 4 // vertically centered
    expect(buf.chars[row]![9]).toBe('|')
  })

  it('right-aligns text with right alignment', () => {
    const font = makeTestFont()
    const buf = stampFigletText(
      makeProps({ content: '!', alignment: 'right' }),
      makeRect({ width: 20, height: 10 }),
      font,
    )
    // ! renders to width 2, right in 20 → offset 18
    const row = 4 // vertically centered
    expect(buf.chars[row]![18]).toBe('|')
  })

  it('does not write space characters to buffer (transparency)', () => {
    const font = makeTestFont()
    const buf = stampFigletText(
      makeProps({ content: '!' }),
      makeRect({ width: 20, height: 10 }),
      font,
    )
    // Spaces in the FIGlet output should remain as 'bg' style
    expect(buf.styles[0]![0]).toBe('bg')
  })
})
