import { describe, it, expect } from 'vitest'
import { createAsciiPalette, STYLE_KEYS } from '../palette.ts'
import type { Theme } from '../types.ts'

const testTheme: Theme = {
  name: 'test-dark',
  colors: {
    background: '#1e1e2e',
    foreground: '#e0e0f0',
    accent: '#7aa2f7',
    accentForeground: '#ffffff',
    muted: '#444466',
    mutedForeground: '#8888aa',
    border: '#555577',
    card: '#2a2a3e',
    cardForeground: '#c0c0d0',
    error: '#b04040',
    success: '#40b070',
  },
}

describe('STYLE_KEYS', () => {
  it('contains exactly 56 style keys', () => {
    expect(STYLE_KEYS).toHaveLength(56)
  })

  it('includes all major categories', () => {
    expect(STYLE_KEYS).toContain('bg')
    expect(STYLE_KEYS).toContain('modalBorder')
    expect(STYLE_KEYS).toContain('queryText')
    expect(STYLE_KEYS).toContain('etchFrame')
    expect(STYLE_KEYS).toContain('ghostBlob')
    expect(STYLE_KEYS).toContain('imageDeep')
  })

  it('has no duplicates', () => {
    const set = new Set(STYLE_KEYS)
    expect(set.size).toBe(STYLE_KEYS.length)
  })
})

describe('createAsciiPalette', () => {
  const palette = createAsciiPalette(testTheme)

  it('returns a palette with all 56 keys', () => {
    for (const key of STYLE_KEYS) {
      expect(palette[key]).toBeDefined()
      expect(palette[key].color).toBeTruthy()
      expect(palette[key].bg).toBeTruthy()
    }
  })

  it('maps background style to theme background', () => {
    expect(palette.bg.bg).toBe('#1e1e2e')
  })

  it('maps error style to theme error color', () => {
    expect(palette.queryError.color).toBe('#b04040')
  })

  it('applies bold fontWeight to title styles', () => {
    expect(palette.modalTitle.fontWeight).toBe(700)
    expect(palette.modalTitleBold.fontWeight).toBe(700)
  })
})
