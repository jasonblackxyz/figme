import type { Palette, StyleDef } from '@primitives/style-system/types.ts';
import type {
  DesignBinding,
  DesignInteraction,
  DesignStyleDef,
  FigMeRuntimeMetadata,
  FrameChars,
  RuntimeComponentDef,
  RuntimeManifestMetadata,
  RuntimeProvenance,
} from './types.ts';

export const ASCII_FRAME_CHARS: FrameChars = {
  tl: '+',
  t: '-',
  tr: '+',
  l: '|',
  r: '|',
  bl: '+',
  b: '-',
  br: '+',
};

export const DEFAULT_DESKTOP_BEHAVIOR = 'centered-mobile-canvas' as const;

let runtimeIdCounter = 0;

export function generateRuntimeId(prefix: string): string {
  runtimeIdCounter += 1;
  return `${prefix}_${Date.now()}_${runtimeIdCounter}`;
}

export function slugifyRuntimeId(value: string | undefined, fallback = 'item'): string {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export function createRuntimeProvenance(
  source: RuntimeProvenance['source'],
  layerIds?: string[],
  note?: string,
  confidence = 1,
): RuntimeProvenance {
  return {
    source,
    confidence,
    ...(layerIds && layerIds.length > 0 ? { layerIds } : {}),
    ...(note ? { note } : {}),
  };
}

export function createEmptyRuntimeMetadata(): FigMeRuntimeMetadata {
  return {
    manifest: {
      version: '0.1.0',
      desktopDefault: DEFAULT_DESKTOP_BEHAVIOR,
      provenance: createRuntimeProvenance('figmii', undefined, 'Runtime metadata initialized by FIGMII.'),
    },
    tokens: {},
    components: {},
    bindings: {},
    interactions: {},
    annotations: {},
  };
}

export function normalizeRuntimeMetadata(runtime?: Partial<FigMeRuntimeMetadata>): FigMeRuntimeMetadata {
  const empty = createEmptyRuntimeMetadata();
  return {
    manifest: { ...empty.manifest, ...(runtime?.manifest ?? {}) },
    tokens: { ...(runtime?.tokens ?? {}) },
    components: { ...(runtime?.components ?? {}) },
    bindings: { ...(runtime?.bindings ?? {}) },
    interactions: { ...(runtime?.interactions ?? {}) },
    annotations: { ...(runtime?.annotations ?? {}) },
  };
}

export function normalizeManifestMetadata(
  manifest: RuntimeManifestMetadata | undefined,
  documentName: string,
): Required<Pick<RuntimeManifestMetadata, 'id' | 'family' | 'version' | 'desktopDefault'>> & RuntimeManifestMetadata {
  const fallbackId = slugifyRuntimeId(documentName, 'figmii-design');
  return {
    id: manifest?.id?.trim() || fallbackId,
    family: manifest?.family?.trim() || fallbackId,
    version: manifest?.version?.trim() || '0.1.0',
    desktopDefault: manifest?.desktopDefault ?? DEFAULT_DESKTOP_BEHAVIOR,
    sourceRefs: manifest?.sourceRefs ?? [],
    defaultScreen: manifest?.defaultScreen,
    backgroundToken: manifest?.backgroundToken,
    provenance: manifest?.provenance,
  };
}

export function seedSemanticTokens(palette: Palette): Record<string, DesignStyleDef> {
  const tokenEntries: Array<[string, StyleDef | undefined]> = [
    ['board.bg', palette.bg],
    ['panel.border', palette.border ?? palette.modalBorder],
    ['panel.fill', palette.nodeBg ?? palette.modalBg ?? palette.bg],
    ['text.primary', palette.text ?? palette.modalText],
    ['text.muted', palette.dim ?? palette.modalHint],
    ['input.border', palette.queryBorder ?? palette.accentBorder ?? palette.border],
    ['input.fill', palette.queryBg ?? palette.modalBg ?? palette.bg],
    ['input.text', palette.queryText ?? palette.text],
    ['input.placeholder', palette.queryHint ?? palette.dim],
    ['input.cursor', palette.queryCursor ?? palette.accentText],
  ];

  const tokens: Record<string, DesignStyleDef> = {};
  for (const [id, style] of tokenEntries) {
    tokens[id] = normalizeStyleDef(style);
  }
  return tokens;
}

export function seedRuntimeComponents(): Record<string, RuntimeComponentDef> {
  const provenance = createRuntimeProvenance('figmii', undefined, 'Seeded by FIGMII runtime export workflow.');
  return {
    'panel.frame': {
      id: 'panel.frame',
      kind: 'frame',
      name: 'Panel Frame',
      chars: ASCII_FRAME_CHARS,
      tokens: {
        border: 'panel.border',
        fill: 'panel.fill',
        title: 'text.primary',
        text: 'text.muted',
      },
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      minWidth: 8,
      minHeight: 3,
      provenance,
    },
    'query.input': {
      id: 'query.input',
      kind: 'text-input',
      name: 'Search Input',
      chars: ASCII_FRAME_CHARS,
      tokens: {
        border: 'input.border',
        fill: 'input.fill',
        text: 'input.text',
        placeholder: 'input.placeholder',
        cursor: 'input.cursor',
      },
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
      minWidth: 8,
      minHeight: 3,
      multiline: false,
      provenance,
    },
  };
}

export function seedRuntimeBindings(): Record<string, DesignBinding> {
  const provenance = createRuntimeProvenance('figmii', undefined, 'Seeded binding catalog for readme-app Design Lab data.');
  return {
    screenTitle: { id: 'screenTitle', path: 'screen.title', fallback: 'Design Lab', provenance },
    queryValue: { id: 'queryValue', path: 'search.query', fallback: '', provenance },
    graphSummaryLines: { id: 'graphSummaryLines', path: 'graph.summaryLines', fallback: [], provenance },
    searchResultLines: { id: 'searchResultLines', path: 'search.resultLines', fallback: [], provenance },
    readerTitle: { id: 'readerTitle', path: 'reader.title', fallback: 'Reader', provenance },
    readerLines: { id: 'readerLines', path: 'reader.lines', fallback: [], provenance },
  };
}

export function seedRuntimeInteractions(): Record<string, DesignInteraction> {
  const provenance = createRuntimeProvenance('figmii', undefined, 'Seeded interaction catalog for readme-app Design Lab actions.');
  return {
    focusSearch: {
      id: 'focusSearch',
      action: { kind: 'focusInput', target: 'search-input' },
      provenance,
    },
    submitSearch: {
      id: 'submitSearch',
      action: { kind: 'submitQuery', target: 'search-input' },
      provenance,
    },
  };
}

export function normalizeStyleDef(style: StyleDef | DesignStyleDef | undefined): DesignStyleDef {
  return {
    color: style?.color ?? '#ffffff',
    bg: style?.bg ?? '#000000',
    ...(style?.fontWeight ? { fontWeight: style.fontWeight } : {}),
  };
}
