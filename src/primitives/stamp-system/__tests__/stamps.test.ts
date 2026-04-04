import { describe, it, expect } from 'vitest'
import {
  stampNodeBox,
  stampModalBox,
  stampSectionFrame,
  stampDivider,
  stampHorizontalDivider,
  stampFill,
  stampCustomBorder,
  BORDER_CHARS,
} from '../stamps.ts'
import { createBuffer, mergeBuffers } from '../buffer.ts'

describe('stampNodeBox', () => {
  it('creates a rounded border box', () => {
    const buf = stampNodeBox({ col: 0, row: 0, width: 6, height: 4 }, 'border', 'bg')
    expect(buf.width).toBe(6)
    expect(buf.height).toBe(4)
    // Corners
    expect(buf.chars[0]![0]).toBe('╭')
    expect(buf.chars[0]![5]).toBe('╮')
    expect(buf.chars[3]![0]).toBe('╰')
    expect(buf.chars[3]![5]).toBe('╯')
    // Top edge
    expect(buf.chars[0]![1]).toBe('─')
    expect(buf.chars[0]![4]).toBe('─')
    // Left/right sides
    expect(buf.chars[1]![0]).toBe('│')
    expect(buf.chars[1]![5]).toBe('│')
    // Interior is space with bgStyle
    expect(buf.chars[1]![1]).toBe(' ')
    expect(buf.styles[1]![1]).toBe('bg')
  })

  it('handles minimum 2x2 box', () => {
    const buf = stampNodeBox({ col: 0, row: 0, width: 2, height: 2 }, 'border', 'bg')
    expect(buf.chars[0]![0]).toBe('╭')
    expect(buf.chars[0]![1]).toBe('╮')
    expect(buf.chars[1]![0]).toBe('╰')
    expect(buf.chars[1]![1]).toBe('╯')
  })
})

describe('stampModalBox', () => {
  it('creates a double-line border box', () => {
    const buf = stampModalBox({ col: 0, row: 0, width: 8, height: 5 }, 'modalBorder', 'modalBg')
    expect(buf.chars[0]![0]).toBe('╔')
    expect(buf.chars[0]![7]).toBe('╗')
    expect(buf.chars[4]![0]).toBe('╚')
    expect(buf.chars[4]![7]).toBe('╝')
    expect(buf.chars[0]![3]).toBe('═')
    expect(buf.chars[2]![0]).toBe('║')
    expect(buf.chars[2]![7]).toBe('║')
  })
})

describe('stampSectionFrame', () => {
  it('creates a section frame without title', () => {
    const buf = stampSectionFrame({ col: 0, row: 0, width: 10, height: 5 }, 'border', 'bg')
    expect(buf.chars[0]![0]).toBe('┌')
    expect(buf.chars[0]![9]).toBe('┐')
    expect(buf.chars[4]![0]).toBe('└')
    expect(buf.chars[4]![9]).toBe('┘')
  })

  it('renders inset title', () => {
    const buf = stampSectionFrame(
      { col: 0, row: 0, width: 20, height: 5 },
      'border', 'bg', 'Test', 'modalTitle',
    )
    // Title should be embedded in top row: ┌─ Test ─...┐
    const topRow = buf.chars[0]!.join('')
    expect(topRow).toContain('Test')
  })

  it('truncates long title with ellipsis', () => {
    const buf = stampSectionFrame(
      { col: 0, row: 0, width: 12, height: 3 },
      'border', 'bg', 'Very Long Title That Overflows', 'modalTitle',
    )
    const topRow = buf.chars[0]!.join('')
    expect(topRow).toContain('…')
  })
})

describe('stampDivider', () => {
  it('creates a horizontal line', () => {
    const buf = stampDivider(10, 'border')
    expect(buf.width).toBe(10)
    expect(buf.height).toBe(1)
    for (let c = 0; c < 10; c++) {
      expect(buf.chars[0]![c]).toBe('─')
      expect(buf.styles[0]![c]).toBe('border')
    }
  })
})

describe('stampHorizontalDivider', () => {
  it('creates ╟─...─╢ pattern', () => {
    const buf = stampHorizontalDivider(10, 'queryDivider')
    expect(buf.chars[0]![0]).toBe('╟')
    expect(buf.chars[0]![9]).toBe('╢')
    expect(buf.chars[0]![5]).toBe('─')
  })
})

describe('stampFill', () => {
  it('fills entire region with character', () => {
    const buf = stampFill(3, 3, '░', 'dim')
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expect(buf.chars[r]![c]).toBe('░')
        expect(buf.styles[r]![c]).toBe('dim')
      }
    }
  })
})

describe('stampCustomBorder', () => {
  it('uses custom character set', () => {
    const chars = { tl: '+', t: '-', tr: '+', l: '|', r: '|', bl: '+', b: '-', br: '+' }
    const buf = stampCustomBorder({ col: 0, row: 0, width: 5, height: 3 }, chars, 'border', 'bg')
    expect(buf.chars[0]![0]).toBe('+')
    expect(buf.chars[0]![2]).toBe('-')
    expect(buf.chars[0]![4]).toBe('+')
    expect(buf.chars[1]![0]).toBe('|')
    expect(buf.chars[1]![4]).toBe('|')
    expect(buf.chars[2]![0]).toBe('+')
    expect(buf.chars[2]![4]).toBe('+')
  })
})

describe('createBuffer', () => {
  it('creates buffer filled with spaces and bg style', () => {
    const buf = createBuffer(5, 3)
    expect(buf.width).toBe(5)
    expect(buf.height).toBe(3)
    expect(buf.chars[0]![0]).toBe(' ')
    expect(buf.styles[0]![0]).toBe('bg')
  })
})

describe('mergeBuffers', () => {
  it('overlays all characters onto base', () => {
    const base = createBuffer(10, 10)
    const overlay = stampFill(3, 3, '█', 'text')
    const merged = mergeBuffers(base, overlay, 2, 2)
    expect(merged.chars[2]![2]).toBe('█')
    expect(merged.chars[2]![4]).toBe('█')
    expect(merged.chars[4]![4]).toBe('█')
    // Outside overlay area remains space
    expect(merged.chars[0]![0]).toBe(' ')
  })

  it('does not mutate the base buffer', () => {
    const base = createBuffer(5, 5)
    const overlay = stampFill(2, 2, 'X', 'text')
    mergeBuffers(base, overlay, 0, 0)
    expect(base.chars[0]![0]).toBe(' ')
  })

  it('clips overlay that extends beyond base', () => {
    const base = createBuffer(5, 5)
    const overlay = stampFill(3, 3, 'X', 'text')
    const merged = mergeBuffers(base, overlay, 4, 4)
    expect(merged.chars[4]![4]).toBe('X')
    // No crash for out-of-bounds
    expect(merged.width).toBe(5)
  })
})

describe('BORDER_CHARS', () => {
  it('has rounded, double, and section character sets', () => {
    expect(BORDER_CHARS.rounded.tl).toBe('╭')
    expect(BORDER_CHARS.double.tl).toBe('╔')
    expect(BORDER_CHARS.section.tl).toBe('┌')
  })
})
