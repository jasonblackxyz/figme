// Re-export key types from primitives for convenience.
// Feature code can import from @shared/types instead of individual primitives.

export type {
  GridConfig,
  GridPosition,
  GridRect,
  ViewportPreset,
} from '@primitives/grid-engine/types.ts';

export type {
  StyleKey,
  StyleDef,
  Palette,
  Theme,
} from '@primitives/style-system/types.ts';

export type { StampBuffer } from '@primitives/stamp-system/types.ts';

export type {
  Layer,
  LayerKind,
  FigmiiPage,
  FigmiiDocument,
  ComponentDef,
  ComponentInstanceProperties,
} from '@primitives/document-model/types.ts';

export type {
  CharEntry,
  CharCategory,
  CharRegistry,
} from '@primitives/char-registry/types.ts';
