import { describe, it, expect } from 'vitest'
import { createCharRegistry, CHAR_CATALOG } from '../catalog.ts'

describe('CHAR_CATALOG', () => {
  it('contains at least 30 characters', () => {
    expect(CHAR_CATALOG.length).toBeGreaterThanOrEqual(30)
  })

  it('includes box-drawing characters', () => {
    const boxDrawing = CHAR_CATALOG.filter(e => e.category === 'box-drawing')
    expect(boxDrawing.length).toBeGreaterThan(0)
    expect(boxDrawing.some(e => e.char === '╭')).toBe(true)
  })

  it('includes block elements', () => {
    const blocks = CHAR_CATALOG.filter(e => e.category === 'block-elements')
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks.some(e => e.char === '█')).toBe(true)
  })

  it('all entries have required fields', () => {
    for (const entry of CHAR_CATALOG) {
      expect(entry.char).toBeTruthy()
      expect(entry.codepoint).toBeGreaterThan(0)
      expect(entry.name).toBeTruthy()
      expect(entry.category).toBeTruthy()
      expect(Array.isArray(entry.tags)).toBe(true)
    }
  })
})

describe('createCharRegistry', () => {
  const registry = createCharRegistry()

  it('search finds characters by name', () => {
    const results = registry.search('horizontal')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(e => e.char === '─')).toBe(true)
  })

  it('search finds characters by tag', () => {
    const results = registry.search('corner')
    expect(results.length).toBeGreaterThan(0)
  })

  it('search finds characters by the character itself', () => {
    const results = registry.search('─')
    expect(results.length).toBeGreaterThan(0)
  })

  it('getByCategory returns correct category', () => {
    const arrows = registry.getByCategory('arrows')
    expect(arrows.every(e => e.category === 'arrows')).toBe(true)
    expect(arrows.length).toBeGreaterThan(0)
  })

  it('addCustom adds a new character', () => {
    const initialLength = registry.entries.length
    registry.addCustom('⚡', ['lightning', 'energy'])
    expect(registry.entries.length).toBe(initialLength + 1)
    const found = registry.search('lightning')
    expect(found.length).toBe(1)
    expect(found[0]!.char).toBe('⚡')
  })
})
