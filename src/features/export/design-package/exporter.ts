import { applyPageCanvasSizeToGridConfig, getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import type { FigmiiDocument, FigmiiPage, Layer } from '@primitives/document-model/types.ts';
import type { StyleDef } from '@primitives/style-system/types.ts';
import { validateDesignPackage } from './validator.ts';
import {
  DESIGN_PACKAGE_SCHEMA_VERSION,
  RUNTIME_COMPONENT_KINDS,
  TIER1_COMPONENT_KINDS,
  TIER2_COMPONENT_KINDS,
  type DesignBinding,
  type DesignComponentDef,
  type DesignDiagnostic,
  type DesignInteraction,
  type DesignPackage,
  type DesignPackageExportOptions,
  type DesignPackageExportResult,
  type DesignPoint,
  type DesignProvenance,
  type DesignRect,
  type DesignScreenNode,
  type DesignScreenSpec,
  type DesignStyleDef,
  type FrameChars,
  type RegionBackedDocument,
  type RegionBackedPage,
  type RuntimeBindingRef,
  type RuntimeComponentKind,
  type RuntimeDesktopBehavior,
  type RuntimeInteractionRef,
  type RuntimeProvenance,
  type RuntimeRole,
  type SemanticRegion,
} from './types.ts';

const ASCII_FRAME_CHARS: FrameChars = {
  tl: '+',
  t: '-',
  tr: '+',
  l: '|',
  r: '|',
  bl: '+',
  b: '-',
  br: '+',
};

const DEFAULT_DESKTOP_BEHAVIOR: RuntimeDesktopBehavior = 'centered-mobile-canvas';
const VALID_COMPONENT_KINDS = new Set<string>(RUNTIME_COMPONENT_KINDS);
const TIER1_COMPONENT_KIND_SET = new Set<string>(TIER1_COMPONENT_KINDS);
const TIER2_COMPONENT_KIND_SET = new Set<string>(TIER2_COMPONENT_KINDS);

const DEFAULT_ROLE_BY_KIND: Record<RuntimeComponentKind, RuntimeRole> = {
  frame: 'container',
  card: 'container',
  modal: 'container',
  'scroll-panel': 'container',
  'text-input': 'input',
  textarea: 'input',
  button: 'button',
  link: 'link',
  'text-block': 'content',
  chip: 'button',
  badge: 'status',
  icon: 'decoration',
  divider: 'decoration',
  spacer: 'decoration',
  list: 'container',
  'list-item': 'list-item',
  tree: 'container',
  'tab-bar': 'navigation',
  dock: 'navigation',
  slider: 'input',
  spinner: 'status',
  'custom-module': 'container',
  toggle: 'input',
  select: 'input',
  'radio-group': 'input',
  checkbox: 'input',
  avatar: 'content',
  image: 'content',
  'progress-bar': 'status',
  table: 'content',
  accordion: 'container',
  tooltip: 'content',
  toast: 'status',
  breadcrumb: 'navigation',
};

export class DesignPackageExportError extends Error {
  readonly diagnostics: DesignDiagnostic[];

  constructor(diagnostics: DesignDiagnostic[]) {
    const firstError = diagnostics.find((diagnostic) => diagnostic.severity === 'error');
    super(firstError?.message ?? 'Design Package export failed strict validation.');
    this.name = 'DesignPackageExportError';
    this.diagnostics = diagnostics;
  }
}

export function buildDesignPackage(doc: FigmiiDocument, options: DesignPackageExportOptions = {}): DesignPackage {
  return buildDesignPackageExport(doc, options).package;
}

export function exportDesignPackageAsJson(doc: FigmiiDocument, options: DesignPackageExportOptions = {}): string {
  return JSON.stringify(buildDesignPackage(doc, options), null, 2);
}

export function buildDesignPackageExport(
  doc: FigmiiDocument,
  options: DesignPackageExportOptions = {},
): DesignPackageExportResult {
  const sourceDoc = doc as RegionBackedDocument;
  const diagnostics: DesignDiagnostic[] = [];
  const selectedPages = selectPages(sourceDoc, options.selectedPageIds, diagnostics);
  const tokens = buildTokens(sourceDoc);
  const components = new ComponentRegistry();
  const bindings: Record<string, DesignBinding> = {};
  const interactions: Record<string, DesignInteraction> = {};
  const screens: DesignScreenSpec[] = [];
  const renderOracle: DesignPackage['renderOracle'] = {};

  for (const page of selectedPages) {
    const screenId = stringFromRecord(page.runtime, 'screenId');
    const pagePath = `pages.${sourceDoc.pages.findIndex((candidate) => candidate.id === page.id)}`;
    if (!screenId) {
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_SCREEN_ID',
        message: `Page "${page.name}" is missing runtime.screenId and was skipped.`,
        path: `${pagePath}.runtime.screenId`,
      });
      continue;
    }

    const orderedRegions = getOrderedRegions(page);
    const canvas = getPageCanvasSizeInfo(page, sourceDoc.gridConfig);
    const nodes: DesignScreenNode[] = [];
    const nodeIds = new Set<string>();

    if (orderedRegions.length === 0) {
      diagnostics.push({
        severity: 'warning',
        code: 'SCREEN_WITHOUT_REGIONS',
        message: `Page "${page.name}" has runtime.screenId "${screenId}" but no semantic regions; nothing will render as runtime nodes.`,
        path: `${pagePath}.regions`,
      });
    }

    for (const region of orderedRegions) {
      const regionPath = `${pagePath}.regions.${region.id}`;
      if (region.exportMode === 'ignore') continue;
      if (!validateRegionForExport(region, regionPath, diagnostics)) continue;
      if (region.exportMode === 'oracle-only') {
        if (!options.includeRenderOracle) {
          diagnostics.push({
            severity: 'warning',
            code: 'ORACLE_ONLY_REGION_WITHOUT_ORACLE',
            message: `Region "${region.id}" is oracle-only but render oracle export is disabled.`,
            path: `${regionPath}.exportMode`,
            provenance: mapProvenance(region.provenance),
          });
        }
        continue;
      }

      const componentId = components.register(region);
      const nodeId = uniqueId(region.semanticId || region.id, nodeIds, 'node');
      nodeIds.add(nodeId);

      const nodeBindings = collectRegionBindings(region, nodeId, bindings, diagnostics, regionPath);
      const nodeInteractionIds = collectRegionInteractions(region, interactions, diagnostics, regionPath);
      const node: DesignScreenNode = {
        id: nodeId,
        componentId,
        rect: { ...region.shape.rect },
        ...(region.shape.exclude?.length ? { exclude: normalizeExclude(region.shape.exclude) } : {}),
        ...(region.z !== undefined ? { z: region.z } : {}),
        role: region.role ?? DEFAULT_ROLE_BY_KIND[region.componentKind],
        ...(region.props && Object.keys(region.props).length > 0 ? { props: { ...region.props } } : {}),
        ...(Object.keys(nodeBindings).length > 0 ? { bindings: nodeBindings } : {}),
        ...(nodeInteractionIds.length > 0 ? { interactionIds: nodeInteractionIds } : {}),
        ...(region.provenance ? { provenance: mapProvenance(region.provenance) } : {}),
      };

      addRegionAuthoringDiagnostics(region, node, diagnostics, regionPath);
      nodes.push(node);
    }

    nodes.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    screens.push({
      id: screenId,
      name: page.name,
      canvas: { cols: canvas.effectiveCols, rows: canvas.effectiveRows },
      desktopBehavior: getDesktopBehavior(page),
      nodes,
    });

    if (options.includeRenderOracle) {
      renderOracle[screenId] = renderOracleForPage(sourceDoc, page);
    }
  }

  const manifest = buildManifest(sourceDoc, screens, tokens);
  const designPackage: DesignPackage = {
    schemaVersion: DESIGN_PACKAGE_SCHEMA_VERSION,
    manifest,
    tokens,
    components: components.values(),
    screens,
    ...(Object.keys(bindings).length > 0 ? { bindings } : {}),
    ...(Object.keys(interactions).length > 0 ? { interactions } : {}),
    ...(options.includeRenderOracle && Object.keys(renderOracle).length > 0 ? { renderOracle } : {}),
  };

  const validation = validateDesignPackage(designPackage);
  diagnostics.push(...validation.diagnostics);

  if (options.strict && diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    throw new DesignPackageExportError(diagnostics);
  }

  return { package: designPackage, diagnostics };
}

class ComponentRegistry {
  private readonly components = new Map<string, DesignComponentDef>();
  private readonly signatures = new Map<string, string>();

  register(region: SemanticRegion): string {
    const definition = componentDefinitionForRegion(region);
    const signature = stableStringify(definition);
    const existingId = this.signatures.get(signature);
    if (existingId) return existingId;

    let id = definition.id;
    if (this.components.has(id) && stableStringify(this.components.get(id)) !== signature) {
      id = uniqueId(id, new Set(this.components.keys()), 'component');
    }

    const stored = { ...definition, id };
    this.components.set(id, stored);
    this.signatures.set(stableStringify(stored), id);
    return id;
  }

  values(): DesignComponentDef[] {
    return [...this.components.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}

function selectPages(
  doc: RegionBackedDocument,
  selectedPageIds: string[] | undefined,
  diagnostics: DesignDiagnostic[],
): Array<FigmiiPage & RegionBackedPage> {
  if (!selectedPageIds) {
    return doc.pages;
  }

  const selected = new Set(selectedPageIds);
  const pages = doc.pages.filter((page) => selected.has(page.id));
  for (const pageId of selected) {
    if (!doc.pages.some((page) => page.id === pageId)) {
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_SELECTED_PAGE',
        message: `Selected page "${pageId}" does not exist in the document.`,
        path: 'selectedPageIds',
      });
    }
  }
  return pages;
}

function getOrderedRegions(page: RegionBackedPage): SemanticRegion[] {
  const regions = page.regions ?? {};
  const order = page.regionOrder?.filter((id) => regions[id]) ?? [];
  const orderedIds = new Set(order);
  const remaining = Object.keys(regions).filter((id) => !orderedIds.has(id));
  return [...order, ...remaining]
    .map((id) => regions[id])
    .filter((region): region is SemanticRegion => region !== undefined)
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
}

function validateRegionForExport(
  region: SemanticRegion,
  path: string,
  diagnostics: DesignDiagnostic[],
): boolean {
  let valid = true;
  if (!region.id.trim()) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_REGION_ID',
      message: 'Semantic region id must be a non-empty string.',
      path: `${path}.id`,
      provenance: mapProvenance(region.provenance),
    });
    valid = false;
  }
  if (!VALID_COMPONENT_KINDS.has(region.componentKind)) {
    diagnostics.push({
      severity: 'error',
      code: 'UNSUPPORTED_COMPONENT_KIND',
      message: `Region "${region.id}" has unsupported componentKind "${String(region.componentKind)}".`,
      path: `${path}.componentKind`,
      provenance: mapProvenance(region.provenance),
    });
    valid = false;
  }
  if (!isValidRect(region.shape?.rect)) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_REGION_SHAPE',
      message: `Region "${region.id}" must include a shape.rect with positive width and height.`,
      path: `${path}.shape.rect`,
      provenance: mapProvenance(region.provenance),
    });
    valid = false;
  }
  if (TIER2_COMPONENT_KIND_SET.has(region.componentKind)) {
    diagnostics.push({
      severity: 'warning',
      code: 'RESERVED_COMPONENT_KIND',
      message: `Region "${region.id}" uses Tier 2 component kind "${region.componentKind}"; readme-app should render an unsupported placeholder until Phase G implements it.`,
      path: `${path}.componentKind`,
      provenance: mapProvenance(region.provenance),
    });
  } else if (!TIER1_COMPONENT_KIND_SET.has(region.componentKind)) {
    valid = false;
  }
  return valid;
}

function componentDefinitionForRegion(region: SemanticRegion): DesignComponentDef {
  const kind = region.componentKind;
  const componentId = stringFromRecord(region.props, 'componentId') || defaultComponentId(kind, region);
  const base: DesignComponentDef = {
    id: componentId,
    kind,
    name: stringFromRecord(region.props, 'name') || componentName(kind),
    minWidth: minWidthForKind(kind),
    minHeight: minHeightForKind(kind),
    provenance: region.provenance ? mapProvenance(region.provenance) : undefined,
  };

  if (usesFrameChars(kind)) {
    base.chars = ASCII_FRAME_CHARS;
  }
  if (kind === 'textarea') {
    base.multiline = true;
  }
  if (kind === 'text-input') {
    base.multiline = false;
  }
  if (kind === 'custom-module') {
    base.moduleKind = stringFromRecord(region.props, 'moduleKind') ||
      stringFromRecord(region.props, 'customModuleKind') ||
      slugifyId(region.semanticId || region.id, 'custom-module');
  }

  const tokens = tokenRefsForKind(kind);
  if (Object.keys(tokens).length > 0) {
    base.tokens = tokens;
  }
  if (usesPadding(kind)) {
    base.padding = paddingForKind(kind);
  }
  return compactComponent(base);
}

function collectRegionBindings(
  region: SemanticRegion,
  nodeId: string,
  bindings: Record<string, DesignBinding>,
  diagnostics: DesignDiagnostic[],
  regionPath: string,
): Record<string, string> {
  const nodeBindings: Record<string, string> = {};
  for (const binding of region.bindings ?? []) {
    if (!binding.slot.trim() || !binding.path.trim()) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_REGION_BINDING',
        message: `Region "${region.id}" has a binding with an empty slot or path.`,
        path: `${regionPath}.bindings`,
        provenance: mapProvenance(region.provenance),
      });
      continue;
    }
    const id = uniqueCatalogId(
      slugifyId(`${nodeId}.${binding.slot}`, 'binding'),
      bindings,
      (existing) => sameBinding(existing, binding),
    );
    bindings[id] = {
      id,
      path: binding.path,
      ...(binding.fallback !== undefined ? { fallback: binding.fallback } : {}),
      ...(binding.required !== undefined ? { required: binding.required } : {}),
      ...(region.provenance ? { provenance: mapProvenance(region.provenance) } : {}),
    };
    nodeBindings[binding.slot] = id;
  }
  return nodeBindings;
}

function collectRegionInteractions(
  region: SemanticRegion,
  interactions: Record<string, DesignInteraction>,
  diagnostics: DesignDiagnostic[],
  regionPath: string,
): string[] {
  const ids: string[] = [];
  for (const interaction of region.interactions ?? []) {
    if (!interaction.id.trim()) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_REGION_INTERACTION',
        message: `Region "${region.id}" has an interaction with an empty id.`,
        path: `${regionPath}.interactions`,
        provenance: mapProvenance(region.provenance),
      });
      continue;
    }
    const id = uniqueCatalogId(
      slugifyId(interaction.id, 'interaction'),
      interactions,
      (existing) => sameInteraction(existing, interaction),
    );
    interactions[id] = {
      id,
      action: { ...interaction.action },
      ...(region.provenance ? { provenance: mapProvenance(region.provenance) } : {}),
    };
    ids.push(id);
  }
  return ids;
}

function addRegionAuthoringDiagnostics(
  region: SemanticRegion,
  node: DesignScreenNode,
  diagnostics: DesignDiagnostic[],
  regionPath: string,
): void {
  if ((region.componentKind === 'text-input' || region.componentKind === 'textarea') && !node.bindings?.value) {
    diagnostics.push({
      severity: 'warning',
      code: 'INPUT_WITHOUT_VALUE_BINDING',
      message: `Region "${region.id}" is ${region.componentKind} but does not bind a value slot.`,
      path: `${regionPath}.bindings`,
      provenance: mapProvenance(region.provenance),
    });
  }
  if ((region.componentKind === 'button' || region.role === 'button') && !node.interactionIds?.length) {
    diagnostics.push({
      severity: 'warning',
      code: 'BUTTON_WITHOUT_INTERACTION',
      message: `Region "${region.id}" is button-like but has no interaction.`,
      path: `${regionPath}.interactions`,
      provenance: mapProvenance(region.provenance),
    });
  }
  if (
    region.exportMode !== 'oracle-only' &&
    region.role !== 'decoration' &&
    !node.bindings &&
    !node.interactionIds &&
    region.componentKind !== 'spacer' &&
    region.componentKind !== 'divider' &&
    region.componentKind !== 'icon'
  ) {
    diagnostics.push({
      severity: 'warning',
      code: 'RUNTIME_REGION_WITHOUT_BEHAVIOR',
      message: `Region "${region.id}" exports to runtime but has no bindings or interactions.`,
      path: regionPath,
      provenance: mapProvenance(region.provenance),
    });
  }
}

function buildManifest(
  doc: RegionBackedDocument,
  screens: DesignScreenSpec[],
  tokens: Record<string, DesignStyleDef>,
): DesignPackage['manifest'] {
  const runtime = recordFromUnknown(doc.runtime);
  const legacyManifest = recordFromUnknown(runtime.manifest);
  const fallbackId = slugifyId(doc.name, 'figmii-design');
  const id = stringFromRecord(legacyManifest, 'id') || fallbackId;
  const family = stringFromRecord(runtime, 'designFamily') || stringFromRecord(legacyManifest, 'family') || fallbackId;
  const version = stringFromRecord(runtime, 'packageVersion') || stringFromRecord(legacyManifest, 'version') || '0.1.0';
  const defaultScreen = stringFromRecord(legacyManifest, 'defaultScreen') || screens[0]?.id;
  const desktopDefault = desktopBehaviorFromUnknown(legacyManifest.desktopDefault) || DEFAULT_DESKTOP_BEHAVIOR;
  const backgroundToken = stringFromRecord(legacyManifest, 'backgroundToken');
  const sourceRefs = stringArrayFromUnknown(runtime.sourceRefs) ?? stringArrayFromUnknown(legacyManifest.sourceRefs);

  return {
    id,
    family,
    version,
    ...(sourceRefs && sourceRefs.length > 0 ? { sourceRefs } : {}),
    breakpoints: Object.fromEntries(screens.map((screen) => [screen.id, screen.canvas])),
    ...(defaultScreen ? { defaultScreen } : {}),
    desktopDefault,
    backgroundToken: backgroundToken && tokens[backgroundToken] ? backgroundToken : 'board.bg',
    provenance: { source: 'figmii', note: 'Exported from FIGMII Design Package exporter.' },
  };
}

function buildTokens(doc: RegionBackedDocument): Record<string, DesignStyleDef> {
  const tokens: Record<string, DesignStyleDef> = {};
  for (const [key, style] of Object.entries(doc.palette).sort(([a], [b]) => a.localeCompare(b))) {
    tokens[`palette.${key}`] = normalizeStyle(style);
  }

  aliasToken(tokens, 'board.bg', 'palette.bg');
  aliasToken(tokens, 'panel.border', 'palette.border');
  aliasToken(tokens, 'panel.fill', 'palette.nodeBg', 'palette.modalBg', 'palette.bg');
  aliasToken(tokens, 'text.primary', 'palette.text', 'palette.modalText');
  aliasToken(tokens, 'text.muted', 'palette.dim', 'palette.modalHint');
  aliasToken(tokens, 'accent.primary', 'palette.accentText', 'palette.queryButton', 'palette.text');
  aliasToken(tokens, 'input.border', 'palette.queryBorder', 'palette.accentBorder', 'palette.border');
  aliasToken(tokens, 'input.fill', 'palette.queryBg', 'palette.modalBg', 'palette.bg');
  aliasToken(tokens, 'input.text', 'palette.queryText', 'palette.text');
  aliasToken(tokens, 'input.placeholder', 'palette.queryHint', 'palette.dim');
  aliasToken(tokens, 'input.cursor', 'palette.queryCursor', 'palette.accentText');
  aliasToken(tokens, 'status.fill', 'palette.badge', 'palette.success', 'palette.nodeBg');

  const runtimeTokens = recordFromUnknown(recordFromUnknown(doc.runtime).tokens);
  for (const [key, token] of Object.entries(runtimeTokens).sort(([a], [b]) => a.localeCompare(b))) {
    if (isStyleLike(token)) {
      tokens[key] = normalizeStyle(token);
    }
  }

  for (const page of doc.pages) {
    for (const layer of Object.values(page.layers)) {
      collectCustomLayerTokens(layer, tokens);
    }
    collectColorOverrideTokens(page.cellColorOverrides, tokens);
  }

  return tokens;
}

function collectCustomLayerTokens(layer: Layer, tokens: Record<string, DesignStyleDef>): void {
  if (layer.customColors) {
    addCustomToken(tokens, {
      color: layer.customColors.color ?? tokens['text.primary']?.color ?? '#ffffff',
      bg: layer.customColors.bg ?? tokens['board.bg']?.bg ?? '#000000',
    });
  }
  collectColorOverrideTokens(layer.cellColorOverrides, tokens);
}

function collectColorOverrideTokens(
  overrides: Record<string, string> | undefined,
  tokens: Record<string, DesignStyleDef>,
): void {
  if (!overrides) return;
  for (const bg of Object.values(overrides)) {
    addCustomToken(tokens, {
      color: tokens['text.primary']?.color ?? '#ffffff',
      bg,
    });
  }
}

function addCustomToken(tokens: Record<string, DesignStyleDef>, style: DesignStyleDef): void {
  tokens[`custom.${hashStyle(style)}`] = style;
}

function renderOracleForPage(doc: RegionBackedDocument, page: FigmiiPage) {
  const pageGridConfig = applyPageCanvasSizeToGridConfig(page, doc.gridConfig);
  const buffer = composePageBuffer(page, pageGridConfig);
  return {
    chars: buffer.chars.map((row) => row.join('')),
    styles: buffer.styles.map((row) => row.map((styleKey) => String(styleKey))),
  };
}

function defaultComponentId(kind: RuntimeComponentKind, region: SemanticRegion): string {
  if (kind === 'custom-module') {
    const moduleKind = stringFromRecord(region.props, 'moduleKind') ||
      stringFromRecord(region.props, 'customModuleKind') ||
      region.semanticId ||
      region.id;
    return `custom.${slugifyId(moduleKind, 'module')}`;
  }
  return `runtime.${kind}`;
}

function componentName(kind: RuntimeComponentKind): string {
  return kind
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function tokenRefsForKind(kind: RuntimeComponentKind): Record<string, string> {
  if (kind === 'spacer') return {};
  if (kind === 'text-input' || kind === 'textarea') {
    return {
      border: 'input.border',
      fill: 'input.fill',
      text: 'input.text',
      placeholder: 'input.placeholder',
      cursor: 'input.cursor',
    };
  }
  if (kind === 'badge' || kind === 'spinner' || kind === 'progress-bar' || kind === 'toast') {
    return {
      text: 'text.primary',
      fill: 'status.fill',
      border: 'accent.primary',
    };
  }
  if (kind === 'link' || kind === 'button' || kind === 'chip' || kind === 'tab-bar' || kind === 'dock') {
    return {
      text: 'accent.primary',
      fill: 'panel.fill',
      border: 'panel.border',
    };
  }
  return {
    text: 'text.primary',
    fill: 'panel.fill',
    border: 'panel.border',
  };
}

function usesFrameChars(kind: RuntimeComponentKind): boolean {
  return !['text-block', 'icon', 'divider', 'spacer', 'list', 'tree', 'spinner', 'breadcrumb'].includes(kind);
}

function usesPadding(kind: RuntimeComponentKind): boolean {
  return !['divider', 'icon', 'spacer', 'spinner'].includes(kind);
}

function paddingForKind(kind: RuntimeComponentKind) {
  if (kind === 'text-input' || kind === 'textarea') {
    return { top: 0, right: 1, bottom: 0, left: 1 };
  }
  if (kind === 'badge' || kind === 'chip') {
    return { top: 0, right: 1, bottom: 0, left: 1 };
  }
  return { top: 1, right: 2, bottom: 1, left: 2 };
}

function minWidthForKind(kind: RuntimeComponentKind): number {
  if (kind === 'icon' || kind === 'spinner') return 1;
  if (kind === 'divider' || kind === 'spacer') return 0;
  if (kind === 'badge' || kind === 'chip') return 3;
  return 4;
}

function minHeightForKind(kind: RuntimeComponentKind): number {
  if (kind === 'textarea' || kind === 'modal' || kind === 'scroll-panel') return 3;
  if (kind === 'divider' || kind === 'spacer' || kind === 'icon') return 1;
  return 1;
}

function getDesktopBehavior(page: RegionBackedPage): RuntimeDesktopBehavior {
  return desktopBehaviorFromUnknown(page.runtime?.desktopBehavior) ?? DEFAULT_DESKTOP_BEHAVIOR;
}

function desktopBehaviorFromUnknown(value: unknown): RuntimeDesktopBehavior | undefined {
  if (value === 'centered-mobile-canvas' || value === 'widen-modules' || value === 'split-pane' || value === 'custom') {
    return value;
  }
  return undefined;
}

function mapProvenance(provenance: RuntimeProvenance | undefined): DesignProvenance | undefined {
  if (!provenance) return undefined;
  const source: DesignProvenance['source'] = provenance.source === 'ai'
    ? 'ai-enrichment'
    : provenance.source === 'human'
      ? 'hand-authored'
      : 'figmii';
  return {
    source,
    ...(provenance.confidence !== undefined ? { confidence: provenance.confidence } : {}),
    ...(provenance.note ? { note: provenance.note } : {}),
  };
}

function normalizeExclude(exclude: DesignPoint[]): DesignPoint[] {
  const seen = new Set<string>();
  const cells: DesignPoint[] = [];
  for (const cell of exclude) {
    const key = `${cell.col},${cell.row}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push({ col: cell.col, row: cell.row });
  }
  return cells.sort((a, b) => a.row - b.row || a.col - b.col);
}

function uniqueCatalogId<T>(
  base: string,
  catalog: Record<string, T>,
  same: (existing: T) => boolean,
): string {
  const existing = catalog[base];
  if (!existing || same(existing)) return base;
  let index = 2;
  while (true) {
    const candidateId = `${base}-${index}`;
    const candidate = catalog[candidateId];
    if (!candidate || same(candidate)) {
      return candidateId;
    }
    index += 1;
  }
}

function sameBinding(existing: DesignBinding, binding: RuntimeBindingRef): boolean {
  return existing.path === binding.path &&
    existing.required === binding.required &&
    stableStringify(existing.fallback) === stableStringify(binding.fallback);
}

function sameInteraction(existing: DesignInteraction, interaction: RuntimeInteractionRef): boolean {
  return stableStringify(existing.action) === stableStringify(interaction.action);
}

function uniqueId(rawBase: string, existing: Set<string>, fallback: string): string {
  const base = slugifyId(rawBase, fallback);
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function slugifyId(value: string | undefined, fallback: string): string {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function compactComponent(component: DesignComponentDef): DesignComponentDef {
  return Object.fromEntries(
    Object.entries(component).filter(([, value]) => value !== undefined),
  ) as DesignComponentDef;
}

function aliasToken(tokens: Record<string, DesignStyleDef>, alias: string, ...candidates: string[]): void {
  const source = candidates.map((candidate) => tokens[candidate]).find(Boolean);
  tokens[alias] = source ? { ...source } : { color: '#ffffff', bg: '#000000' };
}

function normalizeStyle(style: StyleDef | DesignStyleDef): DesignStyleDef {
  return {
    color: style.color,
    bg: style.bg,
    ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...('fontSize' in style && style.fontSize ? { fontSize: style.fontSize } : {}),
  };
}

function hashStyle(style: DesignStyleDef): string {
  const input = `${style.color}|${style.bg}|${style.fontWeight ?? ''}|${style.fontSize ?? ''}`;
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function isValidRect(rect: unknown): rect is DesignRect {
  return isRecord(rect) &&
    Number.isInteger(rect.col) &&
    Number.isInteger(rect.row) &&
    Number.isInteger(rect.width) &&
    Number.isInteger(rect.height) &&
    Number(rect.width) > 0 &&
    Number(rect.height) > 0;
}

function isStyleLike(value: unknown): value is DesignStyleDef {
  return isRecord(value) && typeof value.color === 'string' && typeof value.bg === 'string';
}

function stringFromRecord(source: unknown, key: string): string | undefined {
  const record = recordFromUnknown(source);
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringArrayFromUnknown(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return strings.length > 0 ? strings : undefined;
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
