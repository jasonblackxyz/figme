import { describe, it, expect } from 'vitest'
import { renderFiglet } from '../renderer.ts'
import { parseFLF } from '../parser.ts'
import type { FigletFont } from '../types.ts'

// Create a minimal test font with height 2
function makeTestFont(): FigletFont {
  const flfContent = [
    'flf2a$ 2 1 6 0 1',
    'Test font',
    '  @',
    '  @@',
    '| @',
    '|_@@',
    '" @',
    '" @@',
  ].join('\n')
  return parseFLF(flfContent)
}

describe('renderFiglet', () => {
  it('returns empty result for empty text', () => {
    const font = makeTestFont()
    const result = renderFiglet('', font)
    expect(result.lines).toEqual([])
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it('renders a single character', () => {
    const font = makeTestFont()
    const result = renderFiglet('!', font)
    expect(result.height).toBe(2)
    expect(result.lines.length).toBe(2)
    expect(result.lines[0]).toBe('|')
    expect(result.lines[1]).toBe('|_')
  })

  it('concatenates multiple characters side by side', () => {
    const font = makeTestFont()
    const result = renderFiglet('!!', font)
    expect(result.height).toBe(2)
    // Two exclamation marks concatenated
    expect(result.lines[0]).toBe('| |')
    expect(result.lines[1]).toBe('|_|_')
  })

  it('falls back to literal character for undefined chars', () => {
    const font = makeTestFont()
    // 'Z' (90) is not defined in our mini font
    const result = renderFiglet('Z', font)
    expect(result.height).toBe(2)
    expect(result.lines[0]).toBe('Z')
  })

  it('strips trailing spaces from lines', () => {
    const font = makeTestFont()
    // Space char has "  " for both lines - should be stripped
    const result = renderFiglet(' ', font)
    expect(result.lines[0]).toBe('')
    expect(result.lines[1]).toBe('')
  })

  it('computes correct width', () => {
    const font = makeTestFont()
    const result = renderFiglet('!', font)
    expect(result.width).toBe(2) // "|_" is 2 chars wide
  })

  it('handles space in text', () => {
    const font = makeTestFont()
    const result = renderFiglet('! !', font)
    expect(result.height).toBe(2)
    // Should have content from both exclamation marks with space between
    expect(result.lines[0]!.length).toBeGreaterThan(0)
  })

  it('pads uneven character lines so subsequent chars align', () => {
    // Font where char 'A' has lines of different widths:
    //   line 0: "/\" (2 chars)
    //   line 1: "/__\" (4 chars)
    // Without padding, "AA" would misalign:
    //   line 0: "/\/\"   (A0 + A0 = 4 chars, second A starts at col 2)
    //   line 1: "/__\/__\" (A1 + A1 = 8 chars, second A starts at col 4)
    // With padding, A0 is padded to 4 so both lines start the second A at col 4.
    const flfContent = [
      'flf2a$ 2 1 6 0 1',
      'Test font',
      '  @',
      '  @@',
      // chars 33-64 omitted — 'A' is char 65, so we need stubs for 33-64
      ...Array.from({ length: 32 }, () => ['x@', 'x@@']).flat(),
      '/\\@',
      '/__\\@@',
    ].join('\n')
    const font = parseFLF(flfContent)

    const result = renderFiglet('AA', font)
    // With padding, both A's should start at consistent positions
    // Line 0: "/\  /\" → second A starts at col 4
    // Line 1: "/__\/__\" → second A starts at col 4
    expect(result.lines[0]).toBe('/\\  /\\')
    expect(result.lines[1]).toBe('/__\\/__\\')
  })
})
