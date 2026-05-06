import type {
  DocumentRuntimeSemantics,
  FIGMIIDocument,
  FIGMIIPage,
  FIGMIIPageRuntime,
  RegionShape,
  RuntimeAction,
  RuntimeBindingRef,
  RuntimeComponentKind,
  RuntimeInteractionRef,
  RuntimeProvenance,
  RuntimeRole,
  SemanticRegion,
} from '@primitives/document-model/types.ts';
import type { GridPosition, GridRect } from '@primitives/grid-engine/types.ts';
import {
  addRegion as addRegionOp,
  removeRegion as removeRegionOp,
  updateRegion as updateRegionOp,
  updateRegionShape as updateRegionShapeOp,
  updatePageRuntime as updatePageRuntimeOp,
  updateDocumentRuntime as updateDocumentRuntimeOp,
} from '@primitives/document-model/operations.ts';
import {
  boundingRectFromCells,
  computeExclude,
  expandShapeToCells,
  unionRect,
} from '@primitives/document-model/regionShape.ts';
import { validateRegionAuthoring, type RegionDiagnostic } from '@primitives/document-model/regionValidation.ts';
import { generateRuntimeId, slugifyRuntimeId } from '@primitives/runtime-semantics/defaults.ts';
import { batch } from './batch.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RegionInputRect = { rect: GridRect; exclude?: GridPosition[] };
type RegionInputLayer = { layerId: string };
type RegionInputLayers = { layerIds: string[] };
type RegionInputSelector = {
  layerSelector: { name?: string; nameContains?: string; kind?: string };
};

export type RegionInput = RegionInputRect | RegionInputLayer | RegionInputLayers | RegionInputSelector;

export interface DefineRegionInput {
  rect?: GridRect;
  exclude?: GridPosition[];
  layerId?: string;
  layerIds?: string[];
  layerSelector?: { name?: string; nameContains?: string; kind?: string };
  componentKind: RuntimeComponentKind;
  semanticId?: string;
  role?: RuntimeRole;
  props?: Record<string, unknown>;
  bindings?: RuntimeBindingRef[];
  interactions?: RuntimeInteractionRef[];
  exportMode?: 'runtime' | 'oracle-only' | 'ignore';
  z?: number;
  parentRegionId?: string;
  provenance?: RuntimeProvenance;
}

export interface MarkRegionMetadataBase {
  semanticId?: string;
  z?: number;
  exportMode?: 'runtime' | 'oracle-only' | 'ignore';
  provenance?: RuntimeProvenance;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RegionApiContext {
  getDocument: () => FIGMIIDocument;
  commitDocument: (next: FIGMIIDocument) => void;
}

function getActivePage(doc: FIGMIIDocument): FIGMIIPage | undefined {
  return doc.pages.find((p) => p.id === doc.activePageId);
}

function getPage(doc: FIGMIIDocument, pageId?: string): FIGMIIPage | undefined {
  if (!pageId) return getActivePage(doc);
  return doc.pages.find((p) => p.id === pageId);
}

function findLayerById(page: FIGMIIPage, id: string) {
  return page.layers[id];
}

function matchLayers(page: FIGMIIPage, selector: { name?: string; nameContains?: string; kind?: string }) {
  return Object.values(page.layers).filter((layer) => {
    if (layer.isBackground) return false;
    if (selector.name && layer.name !== selector.name) return false;
    if (selector.nameContains && !layer.name.toLowerCase().includes(selector.nameContains.toLowerCase())) return false;
    if (selector.kind && layer.kind !== selector.kind) return false;
    return true;
  });
}

function shapeFromInput(page: FIGMIIPage, input: DefineRegionInput): { shape: RegionShape; warnings: string[] } {
  const warnings: string[] = [];

  if (input.rect) {
    return {
      shape: {
        rect: { ...input.rect },
        ...(input.exclude && input.exclude.length > 0
          ? { exclude: input.exclude.map((c) => ({ ...c })) }
          : {}),
      },
      warnings,
    };
  }

  if (input.layerId) {
    const layer = findLayerById(page, input.layerId);
    if (!layer) throw new Error(`FIGMII.regions: no layer with id "${input.layerId}"`);
    return { shape: { rect: { ...layer.rect } }, warnings };
  }

  if (input.layerIds && input.layerIds.length > 0) {
    const rects: GridRect[] = [];
    for (const id of input.layerIds) {
      const layer = findLayerById(page, id);
      if (!layer) {
        warnings.push(`Layer "${id}" not found and was skipped.`);
        continue;
      }
      rects.push(layer.rect);
    }
    const u = unionRect(rects);
    if (!u) throw new Error('FIGMII.regions: no valid layers in layerIds.');
    return { shape: { rect: u }, warnings };
  }

  if (input.layerSelector) {
    const matches = matchLayers(page, input.layerSelector);
    if (matches.length === 0) {
      throw new Error('FIGMII.regions: layerSelector matched no layers.');
    }
    const u = unionRect(matches.map((l) => l.rect));
    if (!u) throw new Error('FIGMII.regions: layerSelector union produced empty rect.');
    return { shape: { rect: u }, warnings };
  }

  throw new Error('FIGMII.regions: provide one of rect, layerId, layerIds, or layerSelector.');
}

function uniqueSemanticId(page: FIGMIIPage, base: string, excludeId?: string): string {
  const slug = slugifyRuntimeId(base, 'region');
  const existing = new Set<string>();
  for (const region of Object.values(page.regions ?? {})) {
    if (region.id === excludeId) continue;
    if (region.semanticId) existing.add(region.semanticId);
  }
  if (!existing.has(slug)) return slug;
  let i = 2;
  while (existing.has(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
}

function buildRegion(page: FIGMIIPage, input: DefineRegionInput, existingId?: string): SemanticRegion {
  const { shape } = shapeFromInput(page, input);
  const id = existingId ?? generateRuntimeId('region');
  const semanticId = input.semanticId ? uniqueSemanticId(page, input.semanticId, existingId) : undefined;
  const provenance: RuntimeProvenance =
    input.provenance ?? { source: 'ai', confidence: 0.9 };

  return {
    id,
    componentKind: input.componentKind,
    shape,
    ...(semanticId ? { semanticId } : {}),
    ...(input.role ? { role: input.role } : {}),
    ...(input.exportMode ? { exportMode: input.exportMode } : {}),
    ...(input.z !== undefined ? { z: input.z } : {}),
    ...(input.bindings && input.bindings.length > 0
      ? { bindings: input.bindings.map((b) => ({ ...b })) }
      : {}),
    ...(input.interactions && input.interactions.length > 0
      ? { interactions: input.interactions.map((i) => ({ ...i, action: { ...i.action } })) }
      : {}),
    ...(input.props && Object.keys(input.props).length > 0 ? { props: { ...input.props } } : {}),
    ...(input.parentRegionId ? { parentRegionId: input.parentRegionId } : {}),
    provenance,
  };
}

function applyToPage(
  ctx: RegionApiContext,
  pageId: string | undefined,
  fn: (page: FIGMIIPage) => FIGMIIPage,
): void {
  const doc = ctx.getDocument();
  const page = getPage(doc, pageId);
  if (!page) {
    throw new Error(pageId
      ? `FIGMII.regions: no page with id "${pageId}"`
      : 'FIGMII.regions: no active page');
  }
  const next = fn(page);
  ctx.commitDocument({
    ...doc,
    pages: doc.pages.map((p) => (p.id === page.id ? next : p)),
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildRegionApi(ctx: RegionApiContext) {
  // --- Region CRUD ---------------------------------------------------------

  function defineRegion(input: DefineRegionInput): string {
    const doc = ctx.getDocument();
    const page = getActivePage(doc);
    if (!page) throw new Error('FIGMII.regions.defineRegion: no active page.');
    const region = buildRegion(page, input);
    applyToPage(ctx, undefined, (p) => addRegionOp(p, region));
    return region.id;
  }

  function defineRegionsBatch(inputs: DefineRegionInput[]): string[] {
    if (inputs.length === 0) return [];
    const ids: string[] = [];
    batch(() => {
      for (const input of inputs) {
        ids.push(defineRegion(input));
      }
    });
    return ids;
  }

  function updateRegion(regionId: string, updates: Partial<Omit<SemanticRegion, 'id'>>): void {
    applyToPage(ctx, undefined, (page) => {
      if (!page.regions?.[regionId]) {
        throw new Error(`FIGMII.regions.updateRegion: no region "${regionId}"`);
      }
      return updateRegionOp(page, regionId, updates);
    });
  }

  function removeRegion(regionId: string): void {
    applyToPage(ctx, undefined, (page) => {
      if (!page.regions?.[regionId]) {
        throw new Error(`FIGMII.regions.removeRegion: no region "${regionId}"`);
      }
      return removeRegionOp(page, regionId);
    });
  }

  function getRegion(regionId: string, pageId?: string): SemanticRegion | undefined {
    const page = getPage(ctx.getDocument(), pageId);
    return page?.regions?.[regionId];
  }

  function listRegions(pageId?: string): SemanticRegion[] {
    const page = getPage(ctx.getDocument(), pageId);
    if (!page?.regions) return [];
    const order = page.regionOrder ?? Object.keys(page.regions);
    const out: SemanticRegion[] = [];
    for (const id of order) {
      const region = page.regions[id];
      if (region) out.push(region);
    }
    return out;
  }

  // --- Shape mutation ------------------------------------------------------

  function setRegionShape(regionId: string, shape: RegionShape): void {
    applyToPage(ctx, undefined, (page) => {
      if (!page.regions?.[regionId]) {
        throw new Error(`FIGMII.regions.setRegionShape: no region "${regionId}"`);
      }
      return updateRegionShapeOp(page, regionId, {
        rect: { ...shape.rect },
        ...(shape.exclude && shape.exclude.length > 0
          ? { exclude: shape.exclude.map((c) => ({ ...c })) }
          : {}),
      });
    });
  }

  function addCellsToRegion(regionId: string, cells: GridPosition[]): void {
    if (cells.length === 0) return;
    applyToPage(ctx, undefined, (page) => {
      const region = page.regions?.[regionId];
      if (!region) {
        throw new Error(`FIGMII.regions.addCellsToRegion: no region "${regionId}"`);
      }
      const existingCells = expandShapeToCells(region.shape);
      const seen = new Set(existingCells.map((c) => `${c.row},${c.col}`));
      const merged: GridPosition[] = [...existingCells];
      for (const cell of cells) {
        const key = `${cell.row},${cell.col}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(cell);
        }
      }
      const rect = boundingRectFromCells(merged);
      const exclude = computeExclude(rect, merged);
      return updateRegionShapeOp(page, regionId, {
        rect,
        ...(exclude.length > 0 ? { exclude } : {}),
      });
    });
  }

  function removeCellsFromRegion(regionId: string, cells: GridPosition[]): void {
    if (cells.length === 0) return;
    applyToPage(ctx, undefined, (page) => {
      const region = page.regions?.[regionId];
      if (!region) {
        throw new Error(`FIGMII.regions.removeCellsFromRegion: no region "${regionId}"`);
      }
      const blacklist = new Set(cells.map((c) => `${c.row},${c.col}`));
      const remaining = expandShapeToCells(region.shape).filter(
        (c) => !blacklist.has(`${c.row},${c.col}`),
      );
      if (remaining.length === 0) {
        // Nothing left — drop the region entirely.
        return removeRegionOp(page, regionId);
      }
      const rect = boundingRectFromCells(remaining);
      const exclude = computeExclude(rect, remaining);
      return updateRegionShapeOp(page, regionId, {
        rect,
        ...(exclude.length > 0 ? { exclude } : {}),
      });
    });
  }

  // --- Bindings & interactions on existing regions ------------------------

  function addBinding(regionId: string, binding: RuntimeBindingRef): void {
    applyToPage(ctx, undefined, (page) => {
      const region = page.regions?.[regionId];
      if (!region) throw new Error(`FIGMII.regions.addBinding: no region "${regionId}"`);
      const next = (region.bindings ?? []).filter((b) => b.slot !== binding.slot);
      next.push({ ...binding });
      return updateRegionOp(page, regionId, { bindings: next });
    });
  }

  function removeBinding(regionId: string, slot: string): void {
    applyToPage(ctx, undefined, (page) => {
      const region = page.regions?.[regionId];
      if (!region) throw new Error(`FIGMII.regions.removeBinding: no region "${regionId}"`);
      const next = (region.bindings ?? []).filter((b) => b.slot !== slot);
      return updateRegionOp(page, regionId, { bindings: next.length > 0 ? next : undefined });
    });
  }

  function addInteraction(regionId: string, interaction: RuntimeInteractionRef): void {
    applyToPage(ctx, undefined, (page) => {
      const region = page.regions?.[regionId];
      if (!region) throw new Error(`FIGMII.regions.addInteraction: no region "${regionId}"`);
      const next = (region.interactions ?? []).filter((i) => i.id !== interaction.id);
      next.push({ id: interaction.id, action: { ...interaction.action } });
      return updateRegionOp(page, regionId, { interactions: next });
    });
  }

  function removeInteraction(regionId: string, interactionId: string): void {
    applyToPage(ctx, undefined, (page) => {
      const region = page.regions?.[regionId];
      if (!region) throw new Error(`FIGMII.regions.removeInteraction: no region "${regionId}"`);
      const next = (region.interactions ?? []).filter((i) => i.id !== interactionId);
      return updateRegionOp(page, regionId, { interactions: next.length > 0 ? next : undefined });
    });
  }

  // --- Convenience helpers (mark*) ----------------------------------------

  function buildMarkInput(input: RegionInput, base: Partial<DefineRegionInput>): DefineRegionInput {
    if ('rect' in input) {
      return { ...base, rect: input.rect, ...(input.exclude ? { exclude: input.exclude } : {}) } as DefineRegionInput;
    }
    if ('layerId' in input) {
      return { ...base, layerId: input.layerId } as DefineRegionInput;
    }
    if ('layerIds' in input) {
      return { ...base, layerIds: input.layerIds } as DefineRegionInput;
    }
    if ('layerSelector' in input) {
      return { ...base, layerSelector: input.layerSelector } as DefineRegionInput;
    }
    throw new Error('FIGMII.regions.mark*: invalid regionInput.');
  }

  function markInput(
    input: RegionInput,
    spec: MarkRegionMetadataBase & {
      semanticId: string;
      valuePath: string;
      placeholder?: string;
      submitInteractionId?: string;
      submitAction?: RuntimeAction;
    },
  ): string {
    const bindings: RuntimeBindingRef[] = [{ slot: 'value', path: spec.valuePath }];
    const interactions: RuntimeInteractionRef[] = [];
    if (spec.submitInteractionId) {
      interactions.push({
        id: spec.submitInteractionId,
        action: spec.submitAction ?? { kind: 'submitQuery' },
      });
    }
    const props: Record<string, unknown> = {};
    if (spec.placeholder) props.placeholder = spec.placeholder;

    return defineRegion(
      buildMarkInput(input, {
        componentKind: 'text-input',
        semanticId: spec.semanticId,
        role: 'input',
        bindings,
        ...(interactions.length > 0 ? { interactions } : {}),
        ...(Object.keys(props).length > 0 ? { props } : {}),
        ...(spec.exportMode ? { exportMode: spec.exportMode } : {}),
        ...(spec.z !== undefined ? { z: spec.z } : {}),
        ...(spec.provenance ? { provenance: spec.provenance } : {}),
      }),
    );
  }

  function markTextarea(
    input: RegionInput,
    spec: MarkRegionMetadataBase & {
      semanticId: string;
      valuePath: string;
      placeholder?: string;
    },
  ): string {
    const props: Record<string, unknown> = {};
    if (spec.placeholder) props.placeholder = spec.placeholder;

    return defineRegion(
      buildMarkInput(input, {
        componentKind: 'textarea',
        semanticId: spec.semanticId,
        role: 'input',
        bindings: [{ slot: 'value', path: spec.valuePath }],
        ...(Object.keys(props).length > 0 ? { props } : {}),
        ...(spec.exportMode ? { exportMode: spec.exportMode } : {}),
        ...(spec.z !== undefined ? { z: spec.z } : {}),
        ...(spec.provenance ? { provenance: spec.provenance } : {}),
      }),
    );
  }

  function markButton(
    input: RegionInput,
    spec: MarkRegionMetadataBase & {
      semanticId: string;
      action: RuntimeAction;
      label?: string;
    },
  ): string {
    const interactionId = `${spec.semanticId}-action`;
    const props: Record<string, unknown> = {};
    if (spec.label) props.label = spec.label;

    return defineRegion(
      buildMarkInput(input, {
        componentKind: 'button',
        semanticId: spec.semanticId,
        role: 'button',
        interactions: [{ id: interactionId, action: { ...spec.action } }],
        ...(Object.keys(props).length > 0 ? { props } : {}),
        ...(spec.exportMode ? { exportMode: spec.exportMode } : {}),
        ...(spec.z !== undefined ? { z: spec.z } : {}),
        ...(spec.provenance ? { provenance: spec.provenance } : {}),
      }),
    );
  }

  function markChip(
    input: RegionInput,
    spec: MarkRegionMetadataBase & {
      semanticId: string;
      label?: string;
      toggleable?: boolean;
    },
  ): string {
    const props: Record<string, unknown> = {};
    if (spec.label) props.label = spec.label;
    if (spec.toggleable) props.toggleable = true;
    const interactions: RuntimeInteractionRef[] = spec.toggleable
      ? [{ id: `${spec.semanticId}-toggle`, action: { kind: 'toggleState' } }]
      : [];

    return defineRegion(
      buildMarkInput(input, {
        componentKind: 'chip',
        semanticId: spec.semanticId,
        ...(interactions.length > 0 ? { interactions } : {}),
        ...(Object.keys(props).length > 0 ? { props } : {}),
        ...(spec.exportMode ? { exportMode: spec.exportMode } : {}),
        ...(spec.z !== undefined ? { z: spec.z } : {}),
        ...(spec.provenance ? { provenance: spec.provenance } : {}),
      }),
    );
  }

  function markLink(
    input: RegionInput,
    spec: MarkRegionMetadataBase & {
      semanticId: string;
      route?: string;
      externalUrl?: string;
    },
  ): string {
    const action: RuntimeAction = spec.externalUrl
      ? { kind: 'navigate', payload: { externalUrl: spec.externalUrl } }
      : { kind: 'navigate', route: spec.route };

    return defineRegion(
      buildMarkInput(input, {
        componentKind: 'link',
        semanticId: spec.semanticId,
        role: 'link',
        interactions: [{ id: `${spec.semanticId}-navigate`, action }],
        ...(spec.exportMode ? { exportMode: spec.exportMode } : {}),
        ...(spec.z !== undefined ? { z: spec.z } : {}),
        ...(spec.provenance ? { provenance: spec.provenance } : {}),
      }),
    );
  }

  function markDecoration(
    input: RegionInput,
    spec: MarkRegionMetadataBase & { semanticId?: string; componentKind?: RuntimeComponentKind } = {},
  ): string {
    return defineRegion(
      buildMarkInput(input, {
        componentKind: spec.componentKind ?? 'frame',
        semanticId: spec.semanticId,
        role: 'decoration',
        exportMode: spec.exportMode ?? 'ignore',
        ...(spec.z !== undefined ? { z: spec.z } : {}),
        ...(spec.provenance ? { provenance: spec.provenance } : {}),
      }),
    );
  }

  function markCustomModule(
    input: RegionInput,
    spec: MarkRegionMetadataBase & {
      semanticId: string;
      moduleKind: string;
      props?: Record<string, unknown>;
    },
  ): string {
    const props: Record<string, unknown> = { ...spec.props, moduleKind: spec.moduleKind };

    return defineRegion(
      buildMarkInput(input, {
        componentKind: 'custom-module',
        semanticId: spec.semanticId,
        props,
        ...(spec.exportMode ? { exportMode: spec.exportMode } : {}),
        ...(spec.z !== undefined ? { z: spec.z } : {}),
        ...(spec.provenance ? { provenance: spec.provenance } : {}),
      }),
    );
  }

  // --- Layer-aware bulk authoring -----------------------------------------

  interface LabelByLayerBoundsInput extends Omit<DefineRegionInput, 'rect' | 'exclude'> {
    layerId?: string;
    layerIds?: string[];
    layerSelector?: { name?: string; nameContains?: string; kind?: string };
  }

  function labelByLayerBounds(input: LabelByLayerBoundsInput): string {
    if (!input.layerId && !input.layerIds && !input.layerSelector) {
      throw new Error('FIGMII.regions.labelByLayerBounds: requires layerId, layerIds, or layerSelector.');
    }
    return defineRegion({
      ...input,
      ...(input.layerId ? { layerId: input.layerId } : {}),
      ...(input.layerIds ? { layerIds: input.layerIds } : {}),
      ...(input.layerSelector ? { layerSelector: input.layerSelector } : {}),
    });
  }

  function inferRegionFromGroupedLayers(
    groupId: string,
    componentKind: RuntimeComponentKind,
    metadata: Omit<DefineRegionInput, 'componentKind' | 'rect' | 'exclude' | 'layerId' | 'layerIds' | 'layerSelector'> = {},
  ): string {
    const doc = ctx.getDocument();
    const page = getActivePage(doc);
    if (!page) throw new Error('FIGMII.regions.inferRegionFromGroupedLayers: no active page.');
    const group = page.layers[groupId];
    if (!group || group.kind !== 'group') {
      throw new Error(`FIGMII.regions.inferRegionFromGroupedLayers: layer "${groupId}" is not a group.`);
    }

    const collectDescendants = (id: string, acc: string[]) => {
      const layer = page.layers[id];
      if (!layer) return;
      if (layer.kind === 'group' && layer.children) {
        for (const child of layer.children) collectDescendants(child, acc);
        return;
      }
      acc.push(id);
    };
    const layerIds: string[] = [];
    if (group.children) {
      for (const id of group.children) collectDescendants(id, layerIds);
    }
    if (layerIds.length === 0) {
      throw new Error(`FIGMII.regions.inferRegionFromGroupedLayers: group "${groupId}" has no leaf layers.`);
    }

    return defineRegion({
      componentKind,
      ...metadata,
      layerIds,
    } as DefineRegionInput);
  }

  // --- Page / Document runtime --------------------------------------------

  function setPageRuntime(pageId: string, runtime: Partial<FIGMIIPageRuntime>): void {
    applyToPage(ctx, pageId, (page) => updatePageRuntimeOp(page, runtime));
  }

  function getPageRuntime(pageId?: string): FIGMIIPageRuntime | undefined {
    return getPage(ctx.getDocument(), pageId)?.runtime;
  }

  function setDocumentRuntime(runtime: Partial<DocumentRuntimeSemantics>): void {
    const doc = ctx.getDocument();
    ctx.commitDocument(updateDocumentRuntimeOp(doc, runtime));
  }

  function getDocumentRuntime(): DocumentRuntimeSemantics | undefined {
    const doc = ctx.getDocument();
    const manifest = doc.runtime?.manifest;
    if (!manifest) return undefined;
    const out: DocumentRuntimeSemantics = {};
    if (manifest.family) out.designFamily = manifest.family;
    if (manifest.version) out.packageVersion = manifest.version;
    if (manifest.sourceRefs) out.sourceRefs = [...manifest.sourceRefs];
    return Object.keys(out).length > 0 ? out : undefined;
  }

  // --- Validation ----------------------------------------------------------

  function validateRegions(pageId?: string): RegionDiagnostic[] {
    const doc = ctx.getDocument();
    const page = getPage(doc, pageId);
    if (!page?.regions) return [];
    const diagnostics: RegionDiagnostic[] = [];
    for (const region of Object.values(page.regions)) {
      for (const d of validateRegionAuthoring(region)) {
        diagnostics.push({ ...d, message: `${region.id}: ${d.message}` });
      }
    }
    return diagnostics;
  }

  // --- Aggregate -----------------------------------------------------------

  return {
    defineRegion,
    defineRegionsBatch,
    updateRegion,
    removeRegion,
    getRegion,
    listRegions,
    setRegionShape,
    addCellsToRegion,
    removeCellsFromRegion,
    addBinding,
    removeBinding,
    addInteraction,
    removeInteraction,
    markInput,
    markTextarea,
    markButton,
    markChip,
    markLink,
    markDecoration,
    markCustomModule,
    labelByLayerBounds,
    inferRegionFromGroupedLayers,
    setPageRuntime,
    getPageRuntime,
    setDocumentRuntime,
    getDocumentRuntime,
    validateRegions,
  };
}

export type RegionApi = ReturnType<typeof buildRegionApi>;
