import { describe, it, expect } from 'vitest'
import { stampCanvas } from '../stampCanvas.ts'
import type { CanvasProperties } from '@primitives/document-model/types.ts'
import type { GridRect } from '@primitives/grid-engine/types.ts'

function makeProps(overrides: Partial<CanvasProperties> = {}): CanvasProperties {
  return {
    content: overrides.content ?? '',
    cellColors: overrides.cellColors ?? {},
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

describe('stampCanvas', () => {
  it('creates a buffer of the correct dimensions', () => {
    const buf = stampCanvas(makeProps(), makeRect())
    expect(buf.width).toBe(20)
    expect(buf.height).toBe(5)
  })

  it('writes non-space characters into the buffer', () => {
    const buf = stampCanvas(
      makeProps({ content: '░▒▓█' }),
      makeRect({ width: 10, height: 1 }),
    )
    expect(buf.chars[0]![0]).toBe('░')
    expect(buf.chars[0]![1]).toBe('▒')
    expect(buf.chars[0]![2]).toBe('▓')
    expect(buf.chars[0]![3]).toBe('█')
    expect(buf.styles[0]![0]).toBe('text')
    expect(buf.styles[0]![1]).toBe('text')
  })

  it('treats spaces as transparent (style remains bg)', () => {
    const buf = stampCanvas(
      makeProps({ content: 'A B' }),
      makeRect({ width: 5, height: 1 }),
    )
    expect(buf.chars[0]![0]).toBe('A')
    expect(buf.styles[0]![0]).toBe('text')
    // Space at position 1 should remain transparent
    expect(buf.chars[0]![1]).toBe(' ')
    expect(buf.styles[0]![1]).toBe('bg')
    expect(buf.chars[0]![2]).toBe('B')
    expect(buf.styles[0]![2]).toBe('text')
  })

  it('handles multiline content', () => {
    const buf = stampCanvas(
      makeProps({ content: 'AB\nCD' }),
      makeRect({ width: 5, height: 3 }),
    )
    expect(buf.chars[0]![0]).toBe('A')
    expect(buf.chars[0]![1]).toBe('B')
    expect(buf.chars[1]![0]).toBe('C')
    expect(buf.chars[1]![1]).toBe('D')
  })

  it('clips content to rect bounds', () => {
    const buf = stampCanvas(
      makeProps({ content: 'ABCDE' }),
      makeRect({ width: 3, height: 1 }),
    )
    expect(buf.chars[0]![0]).toBe('A')
    expect(buf.chars[0]![1]).toBe('B')
    expect(buf.chars[0]![2]).toBe('C')
    // D and E should be clipped
  })

  it('clips rows to rect height', () => {
    const buf = stampCanvas(
      makeProps({ content: 'A\nB\nC\nD' }),
      makeRect({ width: 5, height: 2 }),
    )
    expect(buf.chars[0]![0]).toBe('A')
    expect(buf.chars[1]![0]).toBe('B')
    expect(buf.height).toBe(2)
  })

  it('returns empty buffer for empty content', () => {
    const buf = stampCanvas(makeProps({ content: '' }), makeRect())
    expect(buf.chars[0]![0]).toBe(' ')
    expect(buf.styles[0]![0]).toBe('bg')
  })

  it('handles zero-width rect without crashing', () => {
    const buf = stampCanvas(makeProps({ content: 'ABC' }), makeRect({ width: 0 }))
    expect(buf.width).toBe(0)
  })

  it('handles zero-height rect without crashing', () => {
    const buf = stampCanvas(makeProps({ content: 'ABC' }), makeRect({ height: 0 }))
    expect(buf.height).toBe(0)
  })

  it('preserves box-drawing characters', () => {
    const content = '╭──╮\n│  │\n╰──╯'
    const buf = stampCanvas(
      makeProps({ content }),
      makeRect({ width: 4, height: 3 }),
    )
    expect(buf.chars[0]![0]).toBe('╭')
    expect(buf.chars[0]![1]).toBe('─')
    expect(buf.chars[0]![3]).toBe('╮')
    expect(buf.chars[1]![0]).toBe('│')
    // Interior spaces are transparent
    expect(buf.styles[1]![1]).toBe('bg')
    expect(buf.chars[2]![0]).toBe('╰')
  })

  it('handles block characters for gradients', () => {
    const content = '░▒▓█▓▒░'
    const buf = stampCanvas(
      makeProps({ content }),
      makeRect({ width: 10, height: 1 }),
    )
    for (let i = 0; i < 7; i++) {
      expect(buf.styles[0]![i]).toBe('text')
    }
    // Beyond content length — still bg
    expect(buf.styles[0]![7]).toBe('bg')
  })
})
