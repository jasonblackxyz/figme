export type {
  GridConfig,
  GridPosition,
  GridRect,
  ViewportPreset,
} from './types.ts'

export { measureCellDimensions, createDefaultGridConfig } from './measurement.ts'
export { pixelToGrid, gridToPixel, snapToGrid } from './coordinates.ts'
export {
  rectIntersects,
  rectContains,
  rectOverlap,
  innerRect,
  rectsEqual,
} from './geometry.ts'
export { VIEWPORT_PRESETS, computePreset } from './presets.ts'
