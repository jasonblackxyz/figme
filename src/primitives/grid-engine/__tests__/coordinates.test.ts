import { describe, it, expect } from 'vitest'
import { pixelToGrid, gridToPixel, snapToGrid } from '../coordinates.ts'
import { createDefaultGridConfig } from '../measurement.ts'

const config = createDefaultGridConfig()

describe('pixelToGrid', () => {
  it('converts origin pixel to (0,0)', () => {
    expect(pixelToGrid({ x: 0, y: 0 }, config)).toEqual({ col: 0, row: 0 })
  })

  it('converts pixel in the middle of a cell to that cell', () => {
    const x = config.cellWidth * 3 + config.cellWidth / 2
    const y = config.cellHeight * 5 + config.cellHeight / 2
    expect(pixelToGrid({ x, y }, config)).toEqual({ col: 3, row: 5 })
  })

  it('converts pixel at cell boundary to the next cell', () => {
    // Exactly at the boundary of cell (3,0) → should be cell 3 (floors)
    const x = config.cellWidth * 3
    expect(pixelToGrid({ x, y: 0 }, config).col).toBe(3)
  })

  it('handles large coordinates', () => {
    const result = pixelToGrid({ x: 1920, y: 1080 }, config)
    expect(result.col).toBe(Math.floor(1920 / config.cellWidth))
    expect(result.row).toBe(Math.floor(1080 / config.cellHeight))
  })

  it('handles negative coordinates gracefully', () => {
    const result = pixelToGrid({ x: -10, y: -10 }, config)
    expect(result.col).toBeLessThan(0)
    expect(result.row).toBeLessThan(0)
  })
})

describe('gridToPixel', () => {
  it('converts (0,0) to origin', () => {
    expect(gridToPixel({ col: 0, row: 0 }, config)).toEqual({ x: 0, y: 0 })
  })

  it('converts grid position to top-left corner of cell', () => {
    const result = gridToPixel({ col: 5, row: 3 }, config)
    expect(result.x).toBeCloseTo(5 * config.cellWidth)
    expect(result.y).toBeCloseTo(3 * config.cellHeight)
  })

  it('roundtrips with pixelToGrid for cell origins', () => {
    const pos = { col: 7, row: 12 }
    const px = gridToPixel(pos, config)
    const back = pixelToGrid(px, config)
    expect(back).toEqual(pos)
  })
})

describe('snapToGrid', () => {
  it('snaps to nearest cell using rounding', () => {
    // Just past halfway into cell 3 → snaps to 3
    const x = config.cellWidth * 3 + config.cellWidth * 0.6
    const result = snapToGrid({ x, y: 0 }, config)
    expect(result.col).toBe(4) // rounded
  })

  it('snaps pixel before halfway to previous cell', () => {
    const x = config.cellWidth * 3 + config.cellWidth * 0.3
    const result = snapToGrid({ x, y: 0 }, config)
    expect(result.col).toBe(3) // rounded down
  })

  it('snaps origin to (0,0)', () => {
    expect(snapToGrid({ x: 0, y: 0 }, config)).toEqual({ col: 0, row: 0 })
  })
})
