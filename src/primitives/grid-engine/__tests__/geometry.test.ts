import { describe, it, expect } from 'vitest'
import {
  rectIntersects,
  rectContains,
  rectOverlap,
  innerRect,
  rectsEqual,
} from '../geometry.ts'
import type { GridRect } from '../types.ts'

describe('geometry', () => {
  const a: GridRect = { col: 0, row: 0, width: 10, height: 10 }
  const b: GridRect = { col: 5, row: 5, width: 10, height: 10 }
  const c: GridRect = { col: 20, row: 20, width: 5, height: 5 }
  const inner: GridRect = { col: 2, row: 2, width: 4, height: 4 }

  describe('rectIntersects', () => {
    it('returns true for overlapping rects', () => {
      expect(rectIntersects(a, b)).toBe(true)
    })

    it('returns false for non-overlapping rects', () => {
      expect(rectIntersects(a, c)).toBe(false)
    })

    it('returns false for adjacent rects (touching edges)', () => {
      const adj: GridRect = { col: 10, row: 0, width: 5, height: 5 }
      expect(rectIntersects(a, adj)).toBe(false)
    })
  })

  describe('rectContains', () => {
    it('returns true when outer fully contains inner', () => {
      expect(rectContains(a, inner)).toBe(true)
    })

    it('returns false when inner extends beyond outer', () => {
      expect(rectContains(a, b)).toBe(false)
    })

    it('returns true when rects are identical', () => {
      expect(rectContains(a, a)).toBe(true)
    })
  })

  describe('rectOverlap', () => {
    it('returns the overlap region for intersecting rects', () => {
      const overlap = rectOverlap(a, b)
      expect(overlap).toEqual({ col: 5, row: 5, width: 5, height: 5 })
    })

    it('returns null for non-overlapping rects', () => {
      expect(rectOverlap(a, c)).toBeNull()
    })
  })

  describe('innerRect', () => {
    it('computes inner rect with padding', () => {
      const result = innerRect(a, { top: 1, right: 2, bottom: 1, left: 2 })
      expect(result).toEqual({ col: 2, row: 1, width: 6, height: 8 })
    })

    it('handles zero padding', () => {
      const result = innerRect(a, { top: 0, right: 0, bottom: 0, left: 0 })
      expect(result).toEqual(a)
    })
  })

  describe('rectsEqual', () => {
    it('returns true for identical rects', () => {
      expect(rectsEqual(a, { ...a })).toBe(true)
    })

    it('returns false for different rects', () => {
      expect(rectsEqual(a, b)).toBe(false)
    })
  })
})
