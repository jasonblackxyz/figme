import type {
  BorderBoxProperties,
  CanvasProperties,
  FigMeDocument,
  FigMePage,
  Layer,
  TextBlockProperties,
} from '@primitives/document-model/types.ts';
import { flattenLayerOrder, isEffectivelyHidden } from '@primitives/document-model/hierarchy.ts';
import {
  createRuntimeProvenance,
  DEFAULT_DESKTOP_BEHAVIOR,
  normalizeRuntimeMetadata,
  seedRuntimeBindings,
  seedRuntimeComponents,
  seedRuntimeInteractions,
  seedSemanticTokens,
  slugifyRuntimeId,
} from './defaults.ts';
import type {
  FigMeRuntimeMetadata,
  RuntimeAnnotation,
  RuntimeComponentDef,
  RuntimeDiagnostic,
  RuntimeInferenceOptions,
  RuntimeNodeRole,
} from './types.ts';

interface InferenceResult {
  document: FigMeDocument;
  diagnostics: RuntimeDiagnostic[];
}

interface AnnotationDraft {
  semanticId: string;
  role: RuntimeNodeRole;
  componentId: string;
  componentKind: RuntimeAnnotation['componentKind'];
  props?: Record<string, unknown>;
  bindingSlots?: Record<string, string>;
  interactionIds?: string[];
  customModuleKind?: string;
  inputShape?: string;
  breakpointBehavior?: string;
  tags?: string[];
}

export function inferRuntimeSemantics(
  doc: FigMeDocument,
  options: RuntimeInferenceOptions = {},
): InferenceResult {
  const runtime = normalizeRuntimeMetadata(doc.runtime);
  const diagnostics: RuntimeDiagnostic[] = [];
  const targetPageIds = new Set(options.pageIds ?? doc.pages.map((page) => page.id));

  const nextRuntime: FigMeRuntimeMetadata = {
    manifest: {
      ...runtime.manifest,
      id: runtime.manifest?.id ?? slugifyRuntimeId(doc.name, 'figmii-design'),
      family: runtime.manifest?.family ?? slugifyRuntimeId(doc.name, 'figmii-design'),
      version: runtime.manifest?.version ?? '0.1.0',
      desktopDefault: runtime.manifest?.desktopDefault ?? DEFAULT_DESKTOP_BEHAVIOR,
      backgroundToken: runtime.manifest?.backgroundToken ?? 'board.bg',
      provenance: runtime.manifest?.provenance ?? createRuntimeProvenance('figmii', undefined, 'Inferred by FIGMII runtime export preparation.'),
    },
    tokens: { ...seedSemanticTokens(doc.palette), ...runtime.tokens },
    components: { ...seedRuntimeComponents(), ...runtime.components },
    bindings: { ...seedRuntimeBindings(), ...runtime.bindings },
    interactions: { ...seedRuntimeInteractions(), ...runtime.interactions },
    annotations: { ...runtime.annotations },
  };

  const pages = doc.pages.map((page) => {
    if (!targetPageIds.has(page.id)) return page;
    return inferPage(page, nextRuntime, diagnostics);
  });

  if (!nextRuntime.manifest?.defaultScreen) {
    const firstScreen = pages.find((page) => page.runtime?.exportAsScreen === true);
    if (firstScreen) {
      nextRuntime.manifest = {
        ...nextRuntime.manifest,
        defaultScreen: firstScreen.runtime?.screenId ?? slugifyRuntimeId(firstScreen.name, firstScreen.id),
      };
    }
  }

  return {
    document: {
      ...doc,
      pages,
      runtime: nextRuntime,
    },
    diagnostics,
  };
}

function inferPage(
  page: FigMePage,
  runtime: FigMeRuntimeMetadata,
  diagnostics: RuntimeDiagnostic[],
): FigMePage {
  const existingSourceLayerIds = new Set(
    Object.values(runtime.annotations)
      .flatMap((annotation) => annotation.sourceLayerIds ?? []),
  );
  const screenId = page.runtime?.screenId?.trim() || slugifyRuntimeId(page.name, page.id);
  const pageRuntime = {
    ...page.runtime,
    screenId,
    screenName: page.runtime?.screenName ?? page.name,
    exportAsScreen: true,
    desktopBehavior: page.runtime?.desktopBehavior ?? DEFAULT_DESKTOP_BEHAVIOR,
    breakpointId: page.runtime?.breakpointId ?? 'mobile',
    provenance: page.runtime?.provenance ?? createRuntimeProvenance('figmii', undefined, 'Inferred by FIGMII runtime export preparation.'),
  };

  let z = Object.values(runtime.annotations).filter((annotation) => annotation.pageId === page.id).length;
  let inputCreated = Object.values(runtime.annotations).some((annotation) =>
    annotation.pageId === page.id && (annotation.role === 'input' || annotation.componentKind === 'text-input')
  );

  for (const layerId of flattenLayerOrder(page)) {
    const layer = page.layers[layerId];
    if (!layer || layer.isBackground || isEffectivelyHidden(page, layerId)) continue;
    if (existingSourceLayerIds.has(layer.id)) continue;

    const draft = inferLayerDraft(layer, inputCreated);
    if (!draft) continue;

    if (draft.role === 'input') {
      inputCreated = true;
    }

    if (draft.componentKind === 'custom-module') {
      ensureCustomModuleComponent(runtime.components, draft);
      diagnostics.push({
        severity: 'warning',
        code: 'CUSTOM_MODULE_INFERRED',
        message: `Layer "${layer.name}" was inferred as a custom module and will require readme-app renderer support.`,
        path: `runtime.annotations.${layer.id}`,
        layerIds: [layer.id],
      });
    }

    const annotation: RuntimeAnnotation = {
      id: uniqueAnnotationId(runtime, draft.semanticId),
      pageId: page.id,
      semanticId: uniqueSemanticId(runtime, page.id, draft.semanticId),
      name: layer.name,
      rect: { ...layer.rect },
      z: z++,
      export: true,
      sourceLayerIds: [layer.id],
      role: draft.role,
      componentId: draft.componentId,
      componentKind: draft.componentKind,
      ...(draft.props ? { props: draft.props } : {}),
      ...(draft.bindingSlots ? { bindingSlots: draft.bindingSlots } : {}),
      ...(draft.interactionIds ? { interactionIds: draft.interactionIds } : {}),
      ...(draft.customModuleKind ? { customModuleKind: draft.customModuleKind } : {}),
      ...(draft.inputShape ? { inputShape: draft.inputShape } : {}),
      ...(draft.breakpointBehavior ? { breakpointBehavior: draft.breakpointBehavior } : {}),
      ...(draft.tags ? { tags: draft.tags } : {}),
      provenance: createRuntimeProvenance('ai-enrichment', [layer.id], 'Deterministically inferred by FIGMII.', 0.72),
    };
    runtime.annotations[annotation.id] = annotation;
  }

  return {
    ...page,
    runtime: pageRuntime,
  };
}

function inferLayerDraft(layer: Layer, inputAlreadyCreated: boolean): AnnotationDraft | null {
  const name = layer.name.toLowerCase();
  const layerRuntime = layer.runtime;
  const layerSemanticId = layerRuntime?.semanticId;
  const nameSlug = slugifyRuntimeId(layerSemanticId ?? layer.name, layer.kind);

  if (layerRuntime?.componentKind || layerRuntime?.role || layerRuntime?.componentId) {
    const componentKind = layerRuntime.componentKind ?? (layerRuntime.role === 'input' ? 'text-input' : 'frame');
    return {
      semanticId: layerSemanticId ?? nameSlug,
      role: layerRuntime.role ?? roleForComponentKind(componentKind),
      componentId: layerRuntime.componentId ?? defaultComponentIdForKind(componentKind, layerRuntime.customModuleKind ?? nameSlug),
      componentKind,
      bindingSlots: layerRuntime.bindingSlots,
      interactionIds: layerRuntime.interactionIds,
      customModuleKind: layerRuntime.customModuleKind,
      tags: layerRuntime.tags,
    };
  }

  if (layer.kind === 'border-box') {
    const props = layer.properties as BorderBoxProperties;
    const isInput = looksLikeInput(name, layer.rect.height) && !inputAlreadyCreated;
    if (isInput) {
      return {
        semanticId: 'search-input',
        role: 'input',
        componentId: 'query.input',
        componentKind: 'text-input',
        props: { placeholder: props.title || 'Ask about the graph' },
        bindingSlots: { value: 'queryValue' },
        interactionIds: ['focusSearch', 'submitSearch'],
        tags: ['inferred', 'interactive'],
      };
    }

    return {
      semanticId: nameSlug,
      role: looksLikeButton(name) ? 'button' : 'container',
      componentId: 'panel.frame',
      componentKind: 'frame',
      props: framePropsForBorderLayer(layer, props),
      bindingSlots: bindingSlotsForName(name),
      tags: ['inferred', 'frame'],
    };
  }

  if (layer.kind === 'canvas') {
    const props = layer.properties as CanvasProperties;
    const content = props.content.toLowerCase();
    const isInput = !inputAlreadyCreated && (looksLikeInput(name, layer.rect.height) || content.includes('search') || content.includes('query'));
    if (isInput) {
      return {
        semanticId: 'search-input',
        role: 'input',
        componentId: 'query.input',
        componentKind: 'text-input',
        props: { placeholder: 'Ask about the graph' },
        bindingSlots: { value: 'queryValue' },
        interactionIds: ['focusSearch', 'submitSearch'],
        tags: ['inferred', 'canvas', 'interactive'],
      };
    }

    return {
      semanticId: nameSlug,
      role: looksLikeDecoration(name, content) ? 'decoration' : 'custom',
      componentId: `module.${slugifyRuntimeId(nameSlug, 'canvas')}`,
      componentKind: 'custom-module',
      props: { text: props.content },
      customModuleKind: looksLikeDecoration(name, content) ? 'ascii-decoration' : slugifyRuntimeId(nameSlug, 'ascii-canvas'),
      inputShape: 'renderOracle + optional props.text',
      breakpointBehavior: 'mobile-stacked desktop-centered',
      tags: ['inferred', 'canvas'],
    };
  }

  if (layer.kind === 'text-block') {
    const props = layer.properties as TextBlockProperties;
    return {
      semanticId: nameSlug,
      role: looksLikeButton(name) ? 'button' : 'content',
      componentId: `module.${slugifyRuntimeId(nameSlug, 'text')}`,
      componentKind: 'custom-module',
      props: { text: props.content },
      customModuleKind: 'text-block',
      inputShape: 'props.text',
      breakpointBehavior: 'mobile-stacked desktop-centered',
      tags: ['inferred', 'text'],
    };
  }

  if (layer.kind === 'group' && layer.children?.length) {
    return {
      semanticId: nameSlug,
      role: 'container',
      componentId: 'panel.frame',
      componentKind: 'frame',
      props: { title: humanTitle(layer.name) },
      tags: ['inferred', 'group'],
    };
  }

  return null;
}

function ensureCustomModuleComponent(
  components: Record<string, RuntimeComponentDef>,
  draft: AnnotationDraft,
): void {
  if (components[draft.componentId]) return;
  components[draft.componentId] = {
    id: draft.componentId,
    kind: 'custom-module',
    name: humanTitle(draft.customModuleKind ?? draft.semanticId),
    moduleKind: draft.customModuleKind ?? slugifyRuntimeId(draft.semanticId, 'custom-module'),
    inputShape: draft.inputShape,
    breakpointBehavior: draft.breakpointBehavior,
    provenance: createRuntimeProvenance('ai-enrichment', undefined, 'Created for inferred custom module.', 0.72),
  };
}

function framePropsForBorderLayer(layer: Layer, props: BorderBoxProperties): Record<string, unknown> | undefined {
  const title = props.title?.trim() || humanTitle(layer.name);
  if (!title || title.toLowerCase() === 'box' || title.toLowerCase() === 'border box') return undefined;
  return { title };
}

function bindingSlotsForName(name: string): Record<string, string> | undefined {
  if (name.includes('summary') || name.includes('graph')) return { lines: 'graphSummaryLines' };
  if (name.includes('result')) return { lines: 'searchResultLines' };
  if (name.includes('reader')) return { title: 'readerTitle', lines: 'readerLines' };
  if (name.includes('title') || name.includes('header')) return { title: 'screenTitle' };
  return undefined;
}

function looksLikeInput(name: string, height: number): boolean {
  return height <= 4 && ['input', 'search', 'query', 'ask', 'prompt'].some((term) => name.includes(term));
}

function looksLikeButton(name: string): boolean {
  return ['button', 'link', 'open', 'submit', 'back', 'next', 'reader'].some((term) => name.includes(term));
}

function looksLikeDecoration(name: string, content: string): boolean {
  return name.includes('decor') || name.includes('ornament') || content.length > 0 && !/[a-z0-9]{3,}/i.test(content);
}

function roleForComponentKind(componentKind: RuntimeAnnotation['componentKind']): RuntimeNodeRole {
  if (componentKind === 'text-input') return 'input';
  if (componentKind === 'custom-module') return 'custom';
  return 'container';
}

function defaultComponentIdForKind(componentKind: RuntimeAnnotation['componentKind'], moduleKind: string): string {
  if (componentKind === 'text-input') return 'query.input';
  if (componentKind === 'custom-module') return `module.${slugifyRuntimeId(moduleKind, 'custom')}`;
  return 'panel.frame';
}

function uniqueAnnotationId(runtime: FigMeRuntimeMetadata, base: string): string {
  const normalized = `annotation.${slugifyRuntimeId(base, 'node')}`;
  if (!runtime.annotations[normalized]) return normalized;
  let index = 2;
  while (runtime.annotations[`${normalized}-${index}`]) index += 1;
  return `${normalized}-${index}`;
}

function uniqueSemanticId(runtime: FigMeRuntimeMetadata, pageId: string, base: string): string {
  const normalized = slugifyRuntimeId(base, 'node');
  const pageSemantics = new Set(
    Object.values(runtime.annotations)
      .filter((annotation) => annotation.pageId === pageId)
      .map((annotation) => annotation.semanticId),
  );
  if (!pageSemantics.has(normalized)) return normalized;
  let index = 2;
  while (pageSemantics.has(`${normalized}-${index}`)) index += 1;
  return `${normalized}-${index}`;
}

function humanTitle(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
