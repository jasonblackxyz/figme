import { describe, it, expect } from 'vitest'
import { createDefaultGridConfig, measureCellDimensions } from '../measurement.ts'

describe('createDefaultGridConfig', () => {
  const config = createDefaultGridConfig()

  it('uses IBM Plex Mono font family', () => {
    expect(config.fontFamily).toContain('IBM Plex Mono')
  })

  it('uses 14px font size', () => {
    expect(config.fontSize).toBe(14)
  })

  it('uses 1.35 line height', () => {
    expect(config.lineHeight).toBe(1.35)
  })

  it('has approximate cell width of 8.4px', () => {
    expect(config.cellWidth).toBeCloseTo(8.4, 1)
  })

  it('has cell height of fontSize * lineHeight', () => {
    expect(config.cellHeight).toBeCloseTo(14 * 1.35, 1)
  })

  it('computes desktop canvas cols from 1920px width', () => {
    expect(config.canvasCols).toBe(Math.floor(1920 / config.cellWidth))
  })

  it('computes desktop canvas rows from 1080px height', () => {
    expect(config.canvasRows).toBe(Math.floor(1080 / config.cellHeight))
  })
})

describe('measureCellDimensions', () => {
  it('returns positive cell dimensions', () => {
    const result = measureCellDimensions("'IBM Plex Mono', monospace", 14, 1.35)
    expect(result.cellWidth).toBeGreaterThan(0)
    expect(result.cellHeight).toBeGreaterThan(0)
  })

  it('computes cell height as fontSize * lineHeight', () => {
    const result = measureCellDimensions("monospace", 16, 1.5)
    expect(result.cellHeight).toBe(24) // 16 * 1.5
  })

  it('returns larger dimensions for larger font sizes', () => {
    const small = measureCellDimensions("monospace", 12, 1.35)
    const large = measureCellDimensions("monospace", 24, 1.35)
    expect(large.cellWidth).toBeGreaterThan(small.cellWidth)
    expect(large.cellHeight).toBeGreaterThan(small.cellHeight)
  })
})
