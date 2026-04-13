import type { StyleDef } from '@primitives/style-system/types.ts';

/** Top-level GridSpec document — the structured export format. */
export interface GridSpec {
  $schema: 'figme-gridspec-v1';
  document: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    version: number;
  };
  grid: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    cellWidth: number;
    cellHeight: number;
    cols: number;
    rows: number;
    pixelWidth: number;
    pixelHeight: number;
  };
  palette: Record<string, StyleDef>;
  pages: GridSpecPage[];
  components: GridSpecComponent[];
}

export interface GridSpecPage {
  id: string;
  name: string;
  gridOverride?: { cols: number; rows: number };
  layers: GridSpecLayer[];
  buffer?: GridSpecCompactBuffer;
}

export interface GridSpecLayer {
  id: string;
  name: string;
  kind: string;
  gridRect: {
    col: number;
    row: number;
    width: number;
    height: number;
  };
  pixelBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styleKey: string;
  resolvedStyle: StyleDef;
  visible: boolean;
  locked: boolean;
  opacity: number;
  parentId?: string;
  parentName?: string;
  childIds?: string[];
  childNames?: string[];
  autoLayout?: {
    direction: 'vertical' | 'horizontal';
    gap: number;
    padding: { top: number; right: number; bottom: number; left: number };
    alignment: 'start' | 'center' | 'end';
    sizing: 'hug-contents' | 'fixed';
  };
  /** Raw properties passed through from the document model. */
  properties: Record<string, unknown>;
  /** Pre-computed convenience data resolved by the exporter. */
  resolved: GridSpecResolved;
}

export interface GridSpecResolved {
  // border-box: the actual Unicode characters
  borderChars?: {
    tl: string; t: string; tr: string;
    l: string; r: string;
    bl: string; b: string; br: string;
  };
  // border-box: resolved background style
  bgStyle?: StyleDef;
  // border-box: resolved title style
  titleStyle?: StyleDef;
  // text-block / figlet-text: resolved text style
  textStyle?: StyleDef;
  // text-block: resolved heading style
  headingStyle?: StyleDef;
  // text-block: resolved bold style
  boldStyle?: StyleDef;
  // edge-path: resolved source layer name
  sourceLayerId?: string;
  sourceLayerName?: string;
  // edge-path: resolved target layer name
  targetLayerId?: string;
  targetLayerName?: string;
  // component: inlined component definition
  componentDef?: {
    id: string;
    name: string;
    description: string;
    sourceLayerIds: string[];
    sourceLayerNames: string[];
  };
}

export interface GridSpecComponent {
  id: string;
  name: string;
  description: string;
  sourceLayerIds: string[];
  sourceLayerNames: string[];
}

/** Compact pre-resolved buffer: chars as strings-per-row, colors as indexed palette. */
export interface GridSpecCompactBuffer {
  /** One string per row — concatenated characters. */
  chars: string[];
  /** Indexed palette of unique resolved cell styles. */
  colorPalette: StyleDef[];
  /** Per-row arrays of palette indices, one index per cell. */
  colorMap: number[][];
}
