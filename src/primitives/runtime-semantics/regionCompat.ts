import type {
  FIGMIIDocument,
  FIGMIIPage,
  Layer,
  RegionShape,
  RuntimeAction,
  RuntimeComponentKind as RegionComponentKind,
  RuntimeInteractionRef,
  RuntimeProvenance as RegionProvenance,
  RuntimeRole,
  SemanticRegion,
} from '@primitives/document-model/types.ts';
import { RUNTIME_COMPONENT_KINDS, RUNTIME_ROLES } from '@primitives/document-model/types.ts';
import type {
  DesignAction,
  LegacyFigMeRuntimeMetadata,
  LayerRuntimeMetadata,
  RuntimeAnnotation,
  RuntimeComponentKind as LegacyComponentKind,
  RuntimeNodeRole,
  RuntimeProvenance,
} from './types.ts';
import {
  generateRuntimeId,
  normalizeLegacyRuntimeMetadata,
  normalizeRuntimeMetadata,
  slugifyRuntimeId,
} from './defaults.ts';

export interface MigrationResult {
  document: FIGMIIDocument;
  changed: boolean;
}

const VALID_REGION_KINDS = new Set<string>(RUNTIME_COMPONENT_KINDS);
const VALID_REGION_ROLES = new Set<string>(RUNTIME_ROLES);

export function migrateLegacyRuntimeAuthoring(doc: FIGMIIDocument): MigrationResult {
  const legacyRuntime = normalizeLegacyRuntimeMetadata(doc.runtime as Partial<LegacyFigMeRuntimeMetadata> | undefined);
  const hasLegacyRuntimeFields = hasLegacyRuntimeAuthoring(doc.runtime);
  let changed = hasLegacyRuntimeFields;

  const pages = doc.pages.map((page) => {
    let nextPage: FIGMIIPage = {
      ...page,
      regions: { ...(page.regions ?? {}) },
      regionOrder: [...(page.regionOrder ?? Object.keys(page.regions ?? {}))],
    };

    for (const annotation of Object.values(legacyRuntime.annotations)) {
      if (annotation.pageId !== page.id) continue;
      const region = regionFromRuntimeAnnotation(annotation, legacyRuntime, nextPage);
      nextPage = appendRegion(nextPage, region);
      changed = true;
    }

    let layerRuntimeZ = nextPage.regionOrder?.length ?? 0;
    const layers: Record<string, Layer> = {};
    for (const [layerId, layer] of Object.entries(nextPage.layers)) {
      const legacyLayerRuntime = readLegacyLayerRuntime(layer);
      if (legacyLayerRuntime) {
        const region = regionFromLayerRuntime(layer, legacyLayerRuntime, legacyRuntime, nextPage, layerRuntimeZ);
        if (region) {
          nextPage = appendRegion(nextPage, region);
          layerRuntimeZ += 1;
        }
        changed = true;
      }

      layers[layerId] = stripLayerRuntime(layer);
    }

    return {
      ...nextPage,
      layers,
      regionOrder: nextPage.regionOrder ?? [],
    };
  });

  const runtime = normalizeRuntimeMetadata(doc.runtime as Partial<LegacyFigMeRuntimeMetadata> | undefined);
  const nextDoc = {
    ...doc,
    pages,
    runtime,
  };

  return { document: nextDoc, changed };
}

export function regionFromRuntimeAnnotation(
  annotation: Partial<RuntimeAnnotation>,
  runtime: Partial<LegacyFigMeRuntimeMetadata> | undefined,
  page: FIGMIIPage,
): SemanticRegion {
  const legacyRuntime = normalizeLegacyRuntimeMetadata(runtime);
  const semanticId = annotation.semanticId?.trim() || slugifyRuntimeId(annotation.name ?? annotation.id, 'region');
  const id = uniqueRegionId(page, annotation.id?.trim() || semanticId || generateRuntimeId('region'));
  const componentKind = normalizeComponentKind(annotation.componentKind, annotation.role);
  const props = buildRegionProps(annotation);

  return {
    id,
    semanticId,
    componentKind,
    shape: { rect: annotation.rect ? { ...annotation.rect } : { col: 0, row: 0, width: 8, height: 3 } },
    ...(normalizeRole(annotation.role, componentKind) ? { role: normalizeRole(annotation.role, componentKind) } : {}),
    ...(annotation.z !== undefined ? { z: annotation.z } : {}),
    ...(Object.keys(props).length > 0 ? { props } : {}),
    ...(annotation.bindingSlots ? { bindings: bindingsFromLegacySlots(annotation.bindingSlots, legacyRuntime) } : {}),
    ...(annotation.interactionIds ? { interactions: interactionsFromLegacyIds(annotation.interactionIds, legacyRuntime) } : {}),
    ...(annotation.export === false ? { exportMode: 'ignore' as const } : {}),
    provenance: provenanceFromLegacy(annotation.provenance, annotation.sourceLayerIds),
  };
}

export function runtimeAnnotationUpdatesToRegionUpdates(
  updates: Partial<RuntimeAnnotation>,
  runtime: Partial<LegacyFigMeRuntimeMetadata> | undefined,
  existingRegion: SemanticRegion,
): Partial<Omit<SemanticRegion, 'id'>> {
  const legacyRuntime = normalizeLegacyRuntimeMetadata(runtime);
  const next: Partial<Omit<SemanticRegion, 'id'>> = {};
  if (updates.semanticId !== undefined) next.semanticId = updates.semanticId;
  if (updates.role !== undefined) next.role = normalizeRole(updates.role, existingRegion.componentKind);
  if (updates.componentKind !== undefined) next.componentKind = normalizeComponentKind(updates.componentKind, updates.role ?? existingRegion.role);
  if (updates.rect !== undefined) next.shape = { ...existingRegion.shape, rect: { ...updates.rect } };
  if (updates.z !== undefined) next.z = updates.z;
  if (updates.props !== undefined) next.props = { ...updates.props };
  if (updates.export !== undefined) next.exportMode = updates.export === false ? 'ignore' : 'runtime';
  if (updates.bindingSlots !== undefined) next.bindings = bindingsFromLegacySlots(updates.bindingSlots, legacyRuntime);
  if (updates.interactionIds !== undefined) next.interactions = interactionsFromLegacyIds(updates.interactionIds, legacyRuntime);
  if (updates.provenance !== undefined) next.provenance = provenanceFromLegacy(updates.provenance, updates.sourceLayerIds);
  return next;
}

export function runtimeAnnotationFromRegion(region: SemanticRegion, pageId: string): RuntimeAnnotation {
  return {
    id: region.id,
    pageId,
    semanticId: region.semanticId ?? region.id,
    rect: { ...region.shape.rect },
    z: region.z,
    export: region.exportMode !== 'ignore',
    role: legacyRoleFromRegionRole(region.role),
    componentKind: legacyKindFromRegionKind(region.componentKind),
    props: region.props ? { ...region.props } : undefined,
    bindingSlots: Object.fromEntries((region.bindings ?? []).map((binding) => [binding.slot, binding.path])),
    interactionIds: (region.interactions ?? []).map((interaction) => interaction.id),
    provenance: legacyProvenanceFromRegion(region.provenance),
  };
}

export function regionShapeFromRect(rect: RuntimeAnnotation['rect']): RegionShape {
  return { rect: { ...rect } };
}

function regionFromLayerRuntime(
  layer: Layer,
  runtime: LayerRuntimeMetadata,
  legacyRuntime: LegacyFigMeRuntimeMetadata,
  page: FIGMIIPage,
  z: number,
): SemanticRegion | null {
  if (!runtime.componentKind && !runtime.role && !runtime.componentId && !runtime.semanticId) {
    return null;
  }

  const semanticId = runtime.semanticId?.trim() || slugifyRuntimeId(layer.name, layer.kind);
  const annotation: Partial<RuntimeAnnotation> = {
    id: semanticId,
    pageId: page.id,
    semanticId,
    name: layer.name,
    rect: { ...layer.rect },
    z,
    export: true,
    sourceLayerIds: [layer.id],
    role: runtime.role,
    componentKind: runtime.componentKind,
    bindingSlots: runtime.bindingSlots,
    interactionIds: runtime.interactionIds,
    customModuleKind: runtime.customModuleKind,
    tags: runtime.tags,
    provenance: runtime.provenance,
  };
  return regionFromRuntimeAnnotation(annotation, legacyRuntime, page);
}

function bindingsFromLegacySlots(
  slots: Record<string, string>,
  runtime: LegacyFigMeRuntimeMetadata,
): SemanticRegion['bindings'] {
  return Object.entries(slots).map(([slot, ref]) => {
    const legacyBinding = runtime.bindings?.[ref];
    return {
      slot,
      path: legacyBinding?.path ?? ref,
      ...(legacyBinding?.fallback !== undefined ? { fallback: legacyBinding.fallback } : {}),
      ...(legacyBinding?.required !== undefined ? { required: legacyBinding.required } : {}),
    };
  });
}

function interactionsFromLegacyIds(
  ids: string[],
  runtime: LegacyFigMeRuntimeMetadata,
): RuntimeInteractionRef[] {
  return ids.map((id) => {
    const legacyInteraction = runtime.interactions?.[id];
    return {
      id,
      action: legacyInteraction ? actionFromLegacy(legacyInteraction.action) : { kind: 'custom', target: id },
    };
  });
}

function actionFromLegacy(action: DesignAction): RuntimeAction {
  switch (action.kind) {
    case 'focusInput':
    case 'submitQuery':
    case 'openSection':
    case 'openRead':
    case 'navigate':
    case 'custom':
      return { ...action };
  }
}

function buildRegionProps(annotation: Partial<RuntimeAnnotation>): Record<string, unknown> {
  const props = { ...(annotation.props ?? {}) };
  if (annotation.customModuleKind && props.moduleKind === undefined) props.moduleKind = annotation.customModuleKind;
  if (annotation.inputShape && props.inputShape === undefined) props.inputShape = annotation.inputShape;
  if (annotation.breakpointBehavior && props.breakpointBehavior === undefined) props.breakpointBehavior = annotation.breakpointBehavior;
  if (annotation.tags && props.tags === undefined) props.tags = [...annotation.tags];
  if (annotation.componentId && props.legacyComponentId === undefined) props.legacyComponentId = annotation.componentId;
  return props;
}

function normalizeComponentKind(
  kind: LegacyComponentKind | undefined,
  role: RuntimeNodeRole | RuntimeRole | undefined,
): RegionComponentKind {
  if (kind && VALID_REGION_KINDS.has(kind)) return kind as RegionComponentKind;
  if (role === 'input') return 'text-input';
  if (role === 'link') return 'link';
  if (role === 'button') return 'button';
  return 'frame';
}

function legacyKindFromRegionKind(kind: RegionComponentKind): LegacyComponentKind {
  if (kind === 'text-input' || kind === 'custom-module') return kind;
  return 'frame';
}

function normalizeRole(role: RuntimeNodeRole | RuntimeRole | undefined, componentKind: RegionComponentKind): RuntimeRole | undefined {
  if (role && VALID_REGION_ROLES.has(role)) return role as RuntimeRole;
  if (role === 'custom') return 'container';
  switch (componentKind) {
    case 'text-input':
    case 'textarea':
    case 'slider':
    case 'toggle':
    case 'select':
    case 'radio-group':
    case 'checkbox':
      return 'input';
    case 'button':
    case 'chip':
      return 'button';
    case 'link':
      return 'link';
    case 'badge':
    case 'spinner':
    case 'toast':
    case 'progress-bar':
      return 'status';
    case 'icon':
    case 'divider':
    case 'spacer':
      return 'decoration';
    case 'text-block':
    case 'avatar':
    case 'image':
    case 'table':
    case 'tooltip':
      return 'content';
    case 'list-item':
      return 'list-item';
    case 'tab-bar':
    case 'dock':
    case 'breadcrumb':
      return 'navigation';
    default:
      return 'container';
  }
}

function legacyRoleFromRegionRole(role: RuntimeRole | undefined): RuntimeNodeRole | undefined {
  if (!role) return undefined;
  if (role === 'status' || role === 'navigation' || role === 'list-item' || role === 'form' || role === 'header' || role === 'main' || role === 'footer' || role === 'aside') {
    return 'container';
  }
  return role;
}

function provenanceFromLegacy(
  provenance: RuntimeProvenance | undefined,
  layerIds: string[] | undefined,
): RegionProvenance {
  const source: RegionProvenance['source'] = provenance?.source === 'ai-enrichment'
    ? 'ai'
    : provenance?.source === 'hand-authored'
      ? 'human'
      : 'imported';
  const noteParts = [
    provenance?.note,
    layerIds && layerIds.length > 0 ? `Legacy source layers: ${layerIds.join(', ')}` : undefined,
  ].filter(Boolean);
  return {
    source,
    ...(provenance?.confidence !== undefined ? { confidence: provenance.confidence } : {}),
    ...(noteParts.length > 0 ? { note: noteParts.join(' ') } : {}),
  };
}

function legacyProvenanceFromRegion(provenance: RegionProvenance | undefined): RuntimeProvenance | undefined {
  if (!provenance) return undefined;
  return {
    source: provenance.source === 'ai'
      ? 'ai-enrichment'
      : provenance.source === 'human'
        ? 'hand-authored'
        : 'figmii',
    ...(provenance.confidence !== undefined ? { confidence: provenance.confidence } : {}),
    ...(provenance.note ? { note: provenance.note } : {}),
  };
}

function appendRegion(page: FIGMIIPage, region: SemanticRegion): FIGMIIPage {
  const regions = { ...(page.regions ?? {}), [region.id]: region };
  const regionOrder = page.regionOrder?.includes(region.id)
    ? [...page.regionOrder]
    : [...(page.regionOrder ?? Object.keys(page.regions ?? {})), region.id];
  return { ...page, regions, regionOrder };
}

function uniqueRegionId(page: FIGMIIPage, base: string): string {
  const normalized = slugifyRuntimeId(base, 'region');
  const regions = page.regions ?? {};
  if (!regions[normalized]) return normalized;
  let index = 2;
  while (regions[`${normalized}-${index}`]) index += 1;
  return `${normalized}-${index}`;
}

function hasLegacyRuntimeAuthoring(runtime: FIGMIIDocument['runtime'] | undefined): boolean {
  const candidate = runtime as LegacyFigMeRuntimeMetadata | undefined;
  return Boolean(
    candidate?.components && Object.keys(candidate.components).length > 0 ||
    candidate?.bindings && Object.keys(candidate.bindings).length > 0 ||
    candidate?.interactions && Object.keys(candidate.interactions).length > 0 ||
    candidate?.annotations && Object.keys(candidate.annotations).length > 0,
  );
}

function readLegacyLayerRuntime(layer: Layer): LayerRuntimeMetadata | undefined {
  return (layer as Layer & { runtime?: LayerRuntimeMetadata }).runtime;
}

function stripLayerRuntime(layer: Layer): Layer {
  const { runtime: _runtime, ...cleanLayer } = layer as Layer & { runtime?: LayerRuntimeMetadata };
  void _runtime;
  return cleanLayer;
}
