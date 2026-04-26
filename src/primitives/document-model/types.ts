import type { StyleKey } from '@primitives/style-system/types.ts';
import type { GridConfig, GridPosition, GridRect } from '@primitives/grid-engine/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';
import type {
  FigMeRuntimeMetadata,
  LayerRuntimeMetadata,
  PageRuntimeMetadata,
} from '@primitives/runtime-semantics/types.ts';

export type {
  FigMeRuntimeMetadata,
  LayerRuntimeMetadata,
  PageRuntimeMetadata,
} from '@primitives/runtime-semantics/types.ts';

export type LayerKind =
  | 'border-box'
  | 'text-block'
  | 'figlet-text'
  | 'divider'
  | 'image'
  | 'edge-path'
  | 'group'
  | 'component'
  | 'canvas';

export interface BorderBoxProperties {
  borderStyle: 'rounded' | 'double' | 'section' | 'custom';
  borderChars?: CustomBorderChars;
  title?: string;
  titleStyleKey?: StyleKey;
  bgStyleKey?: StyleKey;
  fillPattern?: string;
  padding?: { top: number; right: number; bottom: number; left: number };
  scrollable?: boolean;
  totalContentRows?: number;
}

export interface TextBlockProperties {
  content: string;
  fontFamily: string;
  kerning: 0 | 1 | 2;
  lineSpacing: 0 | 1;
  alignment: 'left' | 'center' | 'right';
  styleKey: StyleKey;
  renderMode?: 'flow' | 'literal';
  headingStyleKey?: StyleKey;
  boldStyleKey?: StyleKey;
}

export interface FigletTextProperties {
  content: string;
  fontName: string;
  alignment: 'left' | 'center' | 'right';
  styleKey: StyleKey;
}

export interface ImageProperties {
  src: string;
  renderStyle: 'classic' | 'smooth' | 'braille' | 'contour' | 'hatch';
  brightness: number;
  contrast: number;
  invert: boolean;
}

export interface EdgePathProperties {
  sourceLayerId: string;
  targetLayerId: string;
  routingStyle: 'manhattan' | 'straight';
  waypoints: GridPosition[];
  styleKey: StyleKey;
}

export interface ComponentInstanceProperties {
  componentId: string;
}

export interface CanvasProperties {
  /** Raw multiline ASCII art, '\n'-separated. Spaces are transparent. */
  content: string;
  /** Per-cell color overrides keyed by "relRow,relCol" — supports fg + bg hex. */
  cellColors: Record<string, { color?: string; bg?: string }>;
}

export interface CustomBorderChars {
  tl: string;
  t: string;
  tr: string;
  l: string;
  r: string;
  bl: string;
  b: string;
  br: string;
}

export interface AutoLayoutConfig {
  direction: 'vertical' | 'horizontal';
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  alignment: 'start' | 'center' | 'end';
  sizing: 'hug-contents' | 'fixed';
}

export type LayerProperties =
  | BorderBoxProperties
  | TextBlockProperties
  | FigletTextProperties
  | ImageProperties
  | EdgePathProperties
  | ComponentInstanceProperties
  | CanvasProperties
  | Record<string, never>;

export interface Layer {
  id: string;
  kind: LayerKind;
  name: string;
  rect: GridRect;
  visible: boolean;
  locked: boolean;
  opacity: number;
  styleKey: StyleKey;
  children?: string[];
  parentId?: string;
  isBackground?: boolean;
  properties: LayerProperties;
  autoLayout?: AutoLayoutConfig;
  customColors?: { color?: string; bg?: string };
  cellColorOverrides?: Record<string, string>;
  runtime?: LayerRuntimeMetadata;
}

export interface FigmiiPage {
  id: string;
  name: string;
  layers: Record<string, Layer>;
  layerOrder: string[];
  /** Region labels consumed by the Design Package exporter. Phase E owns authoring UI/API. */
  regions?: Record<string, unknown>;
  regionOrder?: string[];
  viewportPreset?: string;
  canvasColsOverride?: number;
  canvasRowsOverride?: number;
  canvasX: number;
  canvasY: number;
  cellColorOverrides?: Record<string, string>;
  backgroundColor?: string;
  runtime?: PageRuntimeMetadata;
}

export interface SwatchCollection {
  id: string;
  name: string;
  colors: string[];
}

export interface FigmiiDocument {
  id: string;
  name: string;
  gridConfig: GridConfig;
  palette: Palette;
  pages: FigmiiPage[];
  activePageId: string;
  components: Record<string, ComponentDef>;
  swatchCollections?: SwatchCollection[];
  runtime?: FigMeRuntimeMetadata;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
  };
}

export interface ComponentDef {
  id: string;
  name: string;
  description: string;
  sourceLayerIds: string[];
  thumbnail?: string;
}

export type FigMePage = FigmiiPage;
export type FigMeDocument = FigmiiDocument;
