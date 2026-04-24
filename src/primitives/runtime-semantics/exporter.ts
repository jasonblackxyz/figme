import type { FigMeDocument, FigMePage } from '@primitives/document-model/types.ts';
import { applyPageCanvasSizeToGridConfig, getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import {
  DEFAULT_DESKTOP_BEHAVIOR,
  normalizeManifestMetadata,
  normalizeRuntimeMetadata,
  seedRuntimeComponents,
  seedSemanticTokens,
  slugifyRuntimeId,
} from './defaults.ts';
import type {
  CustomModuleComponentDef,
  DesignManifest,
  DesignPackage,
  DesignScreenNode,
  DesignScreenSpec,
  FigMeRuntimeMetadata,
  RenderOracle,
  RuntimeAnnotation,
  RuntimeComponentDef,
  RuntimeExportOptions,
  RuntimeSemanticsExport,
} from './types.ts';
import { DESIGN_PACKAGE_SCHEMA_VERSION } from './types.ts';

export function buildDesignPackage(doc: FigMeDocument, options: RuntimeExportOptions = {}): DesignPackage {
  const semantics = buildRuntimeSemanticsExport(doc);
  const designPackage: DesignPackage = {
    schemaVersion: DESIGN_PACKAGE_SCHEMA_VERSION,
    manifest: semantics.manifest,
    tokens: semantics.tokens,
    components: semantics.components,
    screens: semantics.screens,
    bindings: semantics.bindings,
    interactions: semantics.interactions,
  };

  if (options.includeRenderOracle) {
    const oracle = buildRenderOracle(doc);
    if (Object.keys(oracle).length > 0) {
      designPackage.renderOracle = oracle;
    }
  }

  return designPackage;
}

export function exportDesignPackageAsJson(doc: FigMeDocument, options: RuntimeExportOptions = {}): string {
  return JSON.stringify(buildDesignPackage(doc, options), null, 2);
}

export function buildRuntimeSemanticsExport(doc: FigMeDocument): RuntimeSemanticsExport {
  const runtime = normalizeRuntimeMetadata(doc.runtime);
  const tokens = {
    ...seedSemanticTokens(doc.palette),
    ...runtime.tokens,
  };
  const componentsById: Record<string, RuntimeComponentDef> = {
    ...seedRuntimeComponents(),
    ...runtime.components,
  };

  const screens = buildScreens(doc, runtime, componentsById);
  const manifest = buildManifest(doc, runtime, tokens, screens);

  return {
    manifest,
    tokens,
    components: Object.values(componentsById),
    screens,
    bindings: { ...runtime.bindings },
    interactions: { ...runtime.interactions },
  };
}

export function exportRuntimeSemanticsAsJson(doc: FigMeDocument): string {
  return JSON.stringify(buildRuntimeSemanticsExport(doc), null, 2);
}

function buildManifest(
  doc: FigMeDocument,
  runtime: FigMeRuntimeMetadata,
  tokens: RuntimeSemanticsExport['tokens'],
  screens: DesignScreenSpec[],
): DesignManifest {
  const manifest = normalizeManifestMetadata(runtime.manifest, doc.name);
  const breakpoints = buildBreakpoints(doc);
  const backgroundToken = manifest.backgroundToken && tokens[manifest.backgroundToken]
    ? manifest.backgroundToken
    : (tokens['board.bg'] ? 'board.bg' : Object.keys(tokens)[0]);

  return {
    id: manifest.id,
    family: manifest.family,
    version: manifest.version,
    sourceRefs: manifest.sourceRefs,
    breakpoints,
    defaultScreen: manifest.defaultScreen ?? screens[0]?.id,
    desktopDefault: manifest.desktopDefault,
    backgroundToken,
    provenance: manifest.provenance,
  };
}

function buildBreakpoints(doc: FigMeDocument): Record<string, { cols: number; rows: number }> {
  const breakpoints: Record<string, { cols: number; rows: number }> = {};
  for (const page of doc.pages) {
    if (page.runtime?.exportAsScreen === false) continue;
    const canvas = getPageCanvasSizeInfo(page, doc.gridConfig);
    const id = page.runtime?.breakpointId?.trim() || page.runtime?.screenId?.trim() || slugifyRuntimeId(page.name, page.id);
    breakpoints[id] = { cols: canvas.effectiveCols, rows: canvas.effectiveRows };
  }
  if (Object.keys(breakpoints).length === 0) {
    breakpoints.default = { cols: doc.gridConfig.canvasCols, rows: doc.gridConfig.canvasRows };
  }
  return breakpoints;
}

function buildScreens(
  doc: FigMeDocument,
  runtime: FigMeRuntimeMetadata,
  componentsById: Record<string, RuntimeComponentDef>,
): DesignScreenSpec[] {
  return doc.pages
    .filter((page) => page.runtime?.exportAsScreen === true)
    .map((page) => {
      const canvas = getPageCanvasSizeInfo(page, doc.gridConfig);
      const screenId = page.runtime?.screenId?.trim() || slugifyRuntimeId(page.name, page.id);
      const annotations = Object.values(runtime.annotations)
        .filter((annotation) => annotation.pageId === page.id && annotation.export !== false)
        .sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

      const nodes = annotations.map((annotation) =>
        buildNodeFromAnnotation(annotation, componentsById),
      );

      return {
        id: screenId,
        name: page.runtime?.screenName?.trim() || page.name,
        canvas: { cols: canvas.effectiveCols, rows: canvas.effectiveRows },
        desktopBehavior: page.runtime?.desktopBehavior ?? DEFAULT_DESKTOP_BEHAVIOR,
        nodes,
        provenance: page.runtime?.provenance,
      };
    });
}

function buildNodeFromAnnotation(
  annotation: RuntimeAnnotation,
  componentsById: Record<string, RuntimeComponentDef>,
): DesignScreenNode {
  const componentId = resolveComponentId(annotation, componentsById);
  ensureAnnotationComponent(annotation, componentId, componentsById);

  return {
    id: annotation.semanticId || annotation.id,
    componentId,
    rect: { ...annotation.rect },
    ...(annotation.z !== undefined ? { z: annotation.z } : {}),
    ...(annotation.role ? { role: annotation.role } : {}),
    ...(annotation.props && Object.keys(annotation.props).length > 0 ? { props: { ...annotation.props } } : {}),
    ...(annotation.bindingSlots && Object.keys(annotation.bindingSlots).length > 0 ? { bindings: { ...annotation.bindingSlots } } : {}),
    ...(annotation.interactionIds && annotation.interactionIds.length > 0 ? { interactionIds: [...annotation.interactionIds] } : {}),
    ...(annotation.provenance ? { provenance: annotation.provenance } : {}),
  };
}

function resolveComponentId(
  annotation: RuntimeAnnotation,
  componentsById: Record<string, RuntimeComponentDef>,
): string {
  const authoredComponentId = annotation.componentId?.trim();
  if (authoredComponentId && componentsById[authoredComponentId]) {
    return authoredComponentId;
  }
  if (annotation.componentKind === 'text-input' || annotation.role === 'input') {
    return 'query.input';
  }
  if (annotation.componentKind === 'custom-module' || annotation.role === 'custom') {
    if (authoredComponentId) return authoredComponentId;
    return `module.${slugifyRuntimeId(annotation.customModuleKind ?? annotation.semanticId, 'custom')}`;
  }
  return 'panel.frame';
}

function ensureAnnotationComponent(
  annotation: RuntimeAnnotation,
  componentId: string,
  componentsById: Record<string, RuntimeComponentDef>,
): void {
  if (componentsById[componentId]) return;
  const moduleKind = annotation.customModuleKind?.trim() || slugifyRuntimeId(annotation.semanticId, 'custom-module');
  const customModule: CustomModuleComponentDef = {
    id: componentId,
    kind: 'custom-module',
    name: annotation.name ?? moduleKind,
    moduleKind,
    inputShape: annotation.inputShape,
    breakpointBehavior: annotation.breakpointBehavior,
    provenance: annotation.provenance,
  };
  componentsById[componentId] = customModule;
}

function buildRenderOracle(doc: FigMeDocument): Record<string, RenderOracle> {
  const oracle: Record<string, RenderOracle> = {};
  for (const page of doc.pages) {
    if (page.runtime?.exportAsScreen !== true) continue;
    oracle[page.runtime.screenId || slugifyRuntimeId(page.name, page.id)] = renderOracleForPage(doc, page);
  }
  return oracle;
}

function renderOracleForPage(doc: FigMeDocument, page: FigMePage): RenderOracle {
  const pageGridConfig = applyPageCanvasSizeToGridConfig(page, doc.gridConfig);
  const buffer = composePageBuffer(page, pageGridConfig);
  return {
    chars: buffer.chars.map((row) => row.join('')),
    styles: buffer.styles.map((row) => row.map((styleKey) => String(styleKey))),
  };
}
