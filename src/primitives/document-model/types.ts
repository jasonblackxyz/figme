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

export const DOCUMENT_SCHEMA_VERSION = 2;

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

export const RUNTIME_ROLES = [
  'input',
  'button',
  'link',
  'container',
  'content',
  'decoration',
  'navigation',
  'list-item',
  'status',
  'form',
  'header',
  'main',
  'footer',
  'aside',
] as const;

export type RuntimeRole = typeof RUNTIME_ROLES[number];

export const RUNTIME_TIER_1_COMPONENT_KINDS = [
  'frame',
  'card',
  'modal',
  'scroll-panel',
  'text-input',
  'textarea',
  'button',
  'link',
  'text-block',
  'chip',
  'badge',
  'icon',
  'divider',
  'spacer',
  'list',
  'list-item',
  'tree',
  'tab-bar',
  'dock',
  'slider',
  'spinner',
  'custom-module',
] as const;

export const RUNTIME_TIER_2_COMPONENT_KINDS = [
  'toggle',
  'select',
  'radio-group',
  'checkbox',
  'avatar',
  'image',
  'progress-bar',
  'table',
  'accordion',
  'tooltip',
  'toast',
  'breadcrumb',
] as const;

export const RUNTIME_COMPONENT_KINDS = [
  ...RUNTIME_TIER_1_COMPONENT_KINDS,
  ...RUNTIME_TIER_2_COMPONENT_KINDS,
] as const;

export type RuntimeComponentKind = typeof RUNTIME_COMPONENT_KINDS[number];

export type RuntimeAction =
  | { kind: 'focusInput'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'submitQuery'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'openSection'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'openRead'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'navigate'; route?: string; payload?: Record<string, unknown> }
  | { kind: 'selectItem'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'toggleState'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'dismiss'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'copyValue'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'custom'; target?: string; payload?: Record<string, unknown> };

export interface RegionShape {
  rect: GridRect;
  exclude?: GridPosition[];
}

export interface RuntimeBindingRef {
  slot: string;
  path: string;
  fallback?: unknown;
  required?: boolean;
}

export interface RuntimeInteractionRef {
  id: string;
  action: RuntimeAction;
}

export interface RuntimeProvenance {
  source: 'human' | 'ai' | 'imported';
  confidence?: number;
  note?: string;
  reviewed?: boolean;
}

export interface SemanticRegion {
  id: string;
  componentKind: RuntimeComponentKind;
  semanticId?: string;
  role?: RuntimeRole;
  shape: RegionShape;
  z?: number;
  bindings?: RuntimeBindingRef[];
  interactions?: RuntimeInteractionRef[];
  props?: Record<string, unknown>;
  exportMode?: 'runtime' | 'oracle-only' | 'ignore';
  parentRegionId?: string;
  provenance?: RuntimeProvenance;
}

export interface PageRuntimeSemantics {
  screenId?: string;
  routeTarget?: string;
  defaultBreakpoint?: string;
  desktopBehavior?: 'centered-mobile-canvas' | 'widen-modules' | 'split-pane' | 'custom';
  scrollRootId?: string;
}

export type FIGMIIPageRuntime = PageRuntimeMetadata & PageRuntimeSemantics;

export interface DocumentRuntimeSemantics {
  designFamily?: string;
  packageVersion?: string;
  sourceRefs?: string[];
}

export interface FIGMIIPage {
  id: string;
  name: string;
  layers: Record<string, Layer>;
  layerOrder: string[];
  regions?: Record<string, SemanticRegion>;
  regionOrder?: string[];
  runtime?: FIGMIIPageRuntime;
  viewportPreset?: string;
  canvasColsOverride?: number;
  canvasRowsOverride?: number;
  canvasX: number;
  canvasY: number;
  cellColorOverrides?: Record<string, string>;
  backgroundColor?: string;
}

export interface SwatchCollection {
  id: string;
  name: string;
  colors: string[];
}

export interface FIGMIIDocument {
  id: string;
  name: string;
  gridConfig: GridConfig;
  palette: Palette;
  pages: FIGMIIPage[];
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

export type FigmiiPage = FIGMIIPage;
export type FigmiiDocument = FIGMIIDocument;
export type FigMePage = FIGMIIPage;
export type FigMeDocument = FIGMIIDocument;
