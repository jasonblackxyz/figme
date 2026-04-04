import { describe, it, expect } from 'vitest'
import { VIEWPORT_PRESETS, computePreset } from '../presets.ts'

describe('VIEWPORT_PRESETS', () => {
  it('contains 5 presets', () => {
    expect(VIEWPORT_PRESETS).toHaveLength(5)
  })

  it('includes Desktop 1920x1080', () => {
    const desktop = VIEWPORT_PRESETS.find(p => p.widthPx === 1920)
    expect(desktop).toBeDefined()
    expect(desktop!.heightPx).toBe(1080)
    expect(desktop!.cols).toBe(228) // floor(1920 / 8.4)
    expect(desktop!.rows).toBe(57)  // floor(1080 / 18.9)
  })

  it('includes Laptop 1440x900', () => {
    const laptop = VIEWPORT_PRESETS.find(p => p.widthPx === 1440)
    expect(laptop).toBeDefined()
    expect(laptop!.cols).toBe(171)  // floor(1440 / 8.4)
    expect(laptop!.rows).toBe(47)   // floor(900 / 18.9)
  })

  it('includes Small 1280x720', () => {
    const small = VIEWPORT_PRESETS.find(p => p.widthPx === 1280)
    expect(small).toBeDefined()
    expect(small!.cols).toBe(152)   // floor(1280 / 8.4)
    expect(small!.rows).toBe(38)    // floor(720 / 18.9)
  })

  it('includes QHD 2560x1440', () => {
    const qhd = VIEWPORT_PRESETS.find(p => p.widthPx === 2560)
    expect(qhd).toBeDefined()
    expect(qhd!.cols).toBe(304)    // floor(2560 / 8.4)
    expect(qhd!.rows).toBe(76)     // floor(1440 / 18.9)
  })

  it('all presets have positive col/row counts', () => {
    for (const preset of VIEWPORT_PRESETS) {
      expect(preset.cols).toBeGreaterThan(0)
      expect(preset.rows).toBeGreaterThan(0)
    }
  })
})

describe('computePreset', () => {
  it('computes cols and rows from pixel dimensions', () => {
    const preset = computePreset(1920, 1080, 8.4, 18.9)
    expect(preset.cols).toBe(228)
    expect(preset.rows).toBe(57)
  })

  it('generates a name with the pixel dimensions', () => {
    const preset = computePreset(1024, 768, 8.4, 18.9)
    expect(preset.name).toContain('1024')
    expect(preset.name).toContain('768')
  })

  it('preserves pixel dimensions in the result', () => {
    const preset = computePreset(1600, 900, 10, 20)
    expect(preset.widthPx).toBe(1600)
    expect(preset.heightPx).toBe(900)
    expect(preset.cols).toBe(160) // 1600 / 10
    expect(preset.rows).toBe(45)  // 900 / 20
  })
})
