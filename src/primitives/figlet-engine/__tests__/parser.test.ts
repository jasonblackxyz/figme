import { describe, it, expect } from 'vitest'
import { parseFLF } from '../parser.ts'
import { STANDARD_FLF } from '../fonts/standard.ts'

// Minimal test FLF font with height 2, covering only space (32) and ! (33)
const MINI_FLF = [
  'flf2a$ 2 1 6 0 2',
  'Mini test font',
  'For testing purposes',
  '  @',
  '  @@',
  '| @',
  '|_@@',
].join('\n')

describe('parseFLF', () => {
  it('parses the header correctly', () => {
    const font = parseFLF(MINI_FLF)
    expect(font.height).toBe(2)
    expect(font.baseline).toBe(1)
    expect(font.maxLength).toBe(6)
    expect(font.hardBlank).toBe('$')
    expect(font.commentLines.length).toBe(2)
    expect(font.commentLines[0]).toBe('Mini test font')
  })

  it('parses character definitions', () => {
    const font = parseFLF(MINI_FLF)
    // Space (32) should be defined
    expect(font.characters[32]).toBeDefined()
    const spaceChar = font.characters[32]![0]
    expect(spaceChar).toBeDefined()
    expect(spaceChar!.length).toBe(2) // height = 2

    // ! (33) should also be defined
    expect(font.characters[33]).toBeDefined()
    const excl = font.characters[33]![0]
    expect(excl).toBeDefined()
    expect(excl![0]).toBe('| ')
    expect(excl![1]).toBe('|_')
  })

  it('replaces hardblank with space', () => {
    const flfWithHardblank = [
      'flf2a$ 1 1 4 0 0',
      '$$@@',
    ].join('\n')
    const font = parseFLF(flfWithHardblank)
    // Space char (32) should have hardblank replaced
    const spaceChar = font.characters[32]![0]
    expect(spaceChar![0]).toBe('  ')
  })

  it('returns empty font for invalid header', () => {
    const font = parseFLF('not a valid font')
    expect(font.height).toBe(1)
    expect(Object.keys(font.characters).length).toBe(0)
  })

  it('returns empty font for empty input', () => {
    const font = parseFLF('')
    expect(font.height).toBe(1)
    expect(Object.keys(font.characters).length).toBe(0)
  })

  it('parses the standard font and has expected characters', () => {
    const font = parseFLF(STANDARD_FLF)
    expect(font.height).toBe(6)
    // Should have space (32) defined
    expect(font.characters[32]).toBeDefined()
    // Should have 'A' (65) defined
    expect(font.characters[65]).toBeDefined()
    const aChar = font.characters[65]![0]
    expect(aChar!.length).toBe(6) // height = 6
  })
})
