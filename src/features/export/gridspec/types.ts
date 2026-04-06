import type { StyleDef } from '@primitives/style-system/types.ts';

/** Top-level GridSpec document — the structured export format. */
export interface GridSpec {
  $schema: 'figme-gridspec-v1';
  document: {
    name: string;
    createdAt: string;
    updatedAt: string;
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
  name: string;
  gridOverride?: { cols: number; rows: number };
  layers: GridSpecLayer[];
  buffer?: {
    chars: string[][];
    styles: string[][];
  };
}

export interface GridSpecLayer {
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
  parentName?: string;
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
  sourceLayerName?: string;
  // edge-path: resolved target layer name
  targetLayerName?: string;
  // component: inlined component definition
  componentDef?: {
    name: string;
    description: string;
    sourceLayerNames: string[];
  };
}

export interface GridSpecComponent {
  name: string;
  description: string;
  sourceLayerNames: string[];
}
