import type { FigMeDocument } from '@primitives/document-model/types.ts';
import { buildDesignPackage } from './exporter.ts';
import type {
  DesignPackage,
  RuntimeComponentDef,
  RuntimeDiagnostic,
  RuntimeValidationOptions,
} from './types.ts';

const VALID_ACTION_KINDS = new Set(['focusInput', 'submitQuery', 'openSection', 'openRead', 'navigate', 'custom']);
const VALID_COMPONENT_KINDS = new Set(['frame', 'text-input', 'custom-module']);
const VALID_DESKTOP_BEHAVIORS = new Set(['centered-mobile-canvas', 'widen-modules', 'split-pane']);

export function validateRuntimeSemantics(
  doc: FigMeDocument,
  options: RuntimeValidationOptions = {},
): RuntimeDiagnostic[] {
  const designPackage = buildDesignPackage(doc, { includeRenderOracle: options.requireRenderOracle });
  const diagnostics = validateDesignPackage(designPackage);

  validateFigMeAuthoringState(doc, diagnostics);
  if (options.requireRenderOracle && !designPackage.renderOracle) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_RENDER_ORACLE',
      message: 'Rendered buffer oracle was requested but no exportable screen buffer was available.',
      path: 'renderOracle',
    });
  }

  return diagnostics;
}

export function exportRuntimeDiagnosticsAsJson(
  doc: FigMeDocument,
  options: RuntimeValidationOptions = {},
): string {
  return JSON.stringify(validateRuntimeSemantics(doc, options), null, 2);
}

export function validateDesignPackage(pkg: DesignPackage): RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];
  const tokens = pkg.tokens ?? {};
  const components = pkg.components ?? [];
  const componentIds = new Set(components.map((component) => component.id));
  const screenIds = new Set((pkg.screens ?? []).map((screen) => screen.id));

  if (pkg.schemaVersion !== 'readme-design-package-v1') {
    diagnostics.push({ severity: 'error', code: 'INVALID_SCHEMA_VERSION', message: 'Design package schemaVersion is not readme-design-package-v1.', path: 'schemaVersion' });
  }
  if (!pkg.manifest.id || !pkg.manifest.family || !pkg.manifest.version) {
    diagnostics.push({ severity: 'error', code: 'INVALID_MANIFEST', message: 'Manifest id, family, and version are required.', path: 'manifest' });
  }
  if (!pkg.manifest.desktopDefault || !VALID_DESKTOP_BEHAVIORS.has(pkg.manifest.desktopDefault)) {
    diagnostics.push({ severity: 'warning', code: 'MISSING_DESKTOP_BEHAVIOR', message: 'Manifest should declare an explicit desktopDefault.', path: 'manifest.desktopDefault' });
  }
  if (pkg.manifest.backgroundToken && !tokens[pkg.manifest.backgroundToken]) {
    diagnostics.push({ severity: 'error', code: 'MISSING_TOKEN', message: `Background token "${pkg.manifest.backgroundToken}" is not defined.`, path: 'manifest.backgroundToken' });
  }
  if (Object.keys(tokens).length === 0) {
    diagnostics.push({ severity: 'error', code: 'MISSING_TOKENS', message: 'Design package requires semantic tokens.', path: 'tokens' });
  }
  if (components.length === 0) {
    diagnostics.push({ severity: 'error', code: 'MISSING_COMPONENTS', message: 'Design package requires runtime components.', path: 'components' });
  }
  if (pkg.screens.length === 0) {
    diagnostics.push({ severity: 'error', code: 'MISSING_SCREENS', message: 'At least one page must export as a runtime screen.', path: 'screens' });
  }

  findDuplicateIds(components, 'components', diagnostics);
  findDuplicateIds(pkg.screens, 'screens', diagnostics);
  validateComponents(components, tokens, diagnostics);
  validateBindings(pkg, diagnostics);
  validateInteractions(pkg, diagnostics);

  if (pkg.manifest.defaultScreen && !screenIds.has(pkg.manifest.defaultScreen)) {
    diagnostics.push({ severity: 'error', code: 'MISSING_SCREEN', message: `Default screen "${pkg.manifest.defaultScreen}" is not exported.`, path: 'manifest.defaultScreen' });
  }

  for (const [screenIndex, screen] of pkg.screens.entries()) {
    const screenPath = `screens.${screenIndex}`;
    if (!screen.desktopBehavior) {
      diagnostics.push({ severity: 'warning', code: 'MISSING_DESKTOP_BEHAVIOR', message: `Screen "${screen.id}" should declare desktopBehavior.`, path: `${screenPath}.desktopBehavior`, provenance: screen.provenance });
    }
    if (!Number.isInteger(screen.canvas.cols) || !Number.isInteger(screen.canvas.rows) || screen.canvas.cols <= 0 || screen.canvas.rows <= 0) {
      diagnostics.push({ severity: 'error', code: 'INVALID_SCREEN_CANVAS', message: `Screen "${screen.id}" canvas must declare positive cols and rows.`, path: `${screenPath}.canvas`, provenance: screen.provenance });
    }
    findDuplicateIds(screen.nodes, `${screenPath}.nodes`, diagnostics);
    const hasQueryBinding = screen.nodes.some((node) => Object.values(node.bindings ?? {}).some((bindingId) => pkg.bindings?.[bindingId]?.path === 'search.query'));

    for (const [nodeIndex, node] of screen.nodes.entries()) {
      const nodePath = `${screenPath}.nodes.${nodeIndex}`;
      const component = components.find((candidate) => candidate.id === node.componentId);
      if (!component || !componentIds.has(node.componentId)) {
        diagnostics.push({ severity: 'error', code: 'MISSING_COMPONENT', message: `Node "${node.id}" references missing component "${node.componentId}".`, path: `${nodePath}.componentId`, provenance: node.provenance });
        continue;
      }
      if (!isValidRect(node.rect)) {
        diagnostics.push({ severity: 'error', code: 'INVALID_RECT', message: `Node "${node.id}" has an invalid rect.`, path: `${nodePath}.rect`, provenance: node.provenance });
      }
      if (node.role === 'input' && component.kind !== 'text-input') {
        diagnostics.push({ severity: 'error', code: 'INPUT_ROLE_WITHOUT_TEXT_INPUT', message: `Input node "${node.id}" must use a text-input component.`, path: nodePath, provenance: node.provenance });
      }
      if (component.kind === 'text-input' && !node.bindings?.value) {
        diagnostics.push({ severity: 'error', code: 'TEXT_INPUT_MISSING_VALUE_BINDING', message: `Text input node "${node.id}" must bind its value slot.`, path: `${nodePath}.bindings.value`, provenance: node.provenance });
      }
      for (const [slot, bindingId] of Object.entries(node.bindings ?? {})) {
        if (!pkg.bindings?.[bindingId]) {
          diagnostics.push({ severity: 'error', code: 'MISSING_BINDING', message: `Node "${node.id}" slot "${slot}" references missing binding "${bindingId}".`, path: `${nodePath}.bindings.${slot}`, provenance: node.provenance });
        }
      }
      for (const interactionId of node.interactionIds ?? []) {
        const interaction = pkg.interactions?.[interactionId];
        if (!interaction) {
          diagnostics.push({ severity: 'error', code: 'MISSING_INTERACTION', message: `Node "${node.id}" references missing interaction "${interactionId}".`, path: `${nodePath}.interactionIds`, provenance: node.provenance });
          continue;
        }
        if (interaction.action.kind === 'submitQuery' && !hasQueryBinding) {
          diagnostics.push({ severity: 'error', code: 'SUBMIT_QUERY_WITHOUT_QUERY_BINDING', message: `Screen "${screen.id}" has submitQuery but no search.query value binding.`, path: `${nodePath}.interactionIds`, provenance: interaction.provenance });
        }
        if (interaction.action.kind === 'navigate' && interaction.action.route && !screenIds.has(interaction.action.route)) {
          diagnostics.push({ severity: 'error', code: 'INVALID_NAVIGATION_ROUTE', message: `Navigation route "${interaction.action.route}" does not map to an exported screen.`, path: `interactions.${interaction.id}.action.route`, provenance: interaction.provenance });
        }
      }
    }
  }

  return diagnostics;
}

function validateComponents(
  components: RuntimeComponentDef[],
  tokens: DesignPackage['tokens'],
  diagnostics: RuntimeDiagnostic[],
): void {
  for (const [index, component] of components.entries()) {
    if (!component.id || !VALID_COMPONENT_KINDS.has(component.kind)) {
      diagnostics.push({ severity: 'error', code: 'INVALID_COMPONENT', message: `Component at index ${index} has an invalid id or kind.`, path: `components.${index}` });
      continue;
    }
    if (component.kind === 'custom-module') {
      if (!component.moduleKind.trim()) {
        diagnostics.push({ severity: 'error', code: 'INVALID_CUSTOM_MODULE', message: `Custom module "${component.id}" requires moduleKind.`, path: `components.${index}.moduleKind`, provenance: component.provenance });
      }
      continue;
    }
    for (const [slot, tokenId] of Object.entries(component.tokens)) {
      if (!tokens[tokenId]) {
        diagnostics.push({ severity: 'error', code: 'MISSING_TOKEN', message: `Component "${component.id}" references missing token "${tokenId}" for "${slot}".`, path: `components.${index}.tokens.${slot}`, provenance: component.provenance });
      }
    }
  }
}

function validateBindings(pkg: DesignPackage, diagnostics: RuntimeDiagnostic[]): void {
  for (const [id, binding] of Object.entries(pkg.bindings ?? {})) {
    if (binding.id !== id || !binding.path.trim()) {
      diagnostics.push({ severity: 'error', code: 'INVALID_BINDING', message: `Binding "${id}" must include matching id and non-empty path.`, path: `bindings.${id}`, provenance: binding.provenance });
    }
  }
}

function validateInteractions(pkg: DesignPackage, diagnostics: RuntimeDiagnostic[]): void {
  for (const [id, interaction] of Object.entries(pkg.interactions ?? {})) {
    if (interaction.id !== id || !VALID_ACTION_KINDS.has(interaction.action.kind)) {
      diagnostics.push({ severity: 'error', code: 'INVALID_INTERACTION', message: `Interaction "${id}" must include matching id and supported action.kind.`, path: `interactions.${id}`, provenance: interaction.provenance });
    }
  }
}

function validateFigMeAuthoringState(doc: FigMeDocument, diagnostics: RuntimeDiagnostic[]): void {
  const pageIds = new Set(doc.pages.map((page) => page.id));
  for (const [id, annotation] of Object.entries(doc.runtime?.annotations ?? {})) {
    if (!pageIds.has(annotation.pageId)) {
      diagnostics.push({ severity: 'error', code: 'ANNOTATION_MISSING_PAGE', message: `Runtime annotation "${id}" references missing page "${annotation.pageId}".`, path: `runtime.annotations.${id}.pageId`, layerIds: annotation.sourceLayerIds, provenance: annotation.provenance });
    }
  }
}

function findDuplicateIds(
  items: Array<{ id?: unknown }>,
  path: string,
  diagnostics: RuntimeDiagnostic[],
): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item.id !== 'string') continue;
    if (seen.has(item.id)) {
      diagnostics.push({ severity: 'error', code: 'DUPLICATE_ID', message: `Duplicate id "${item.id}" in ${path}.`, path });
    }
    seen.add(item.id);
  }
}

function isValidRect(rect: unknown): boolean {
  if (typeof rect !== 'object' || rect === null) return false;
  const candidate = rect as Record<string, unknown>;
  return Number.isInteger(candidate.col) &&
    Number.isInteger(candidate.row) &&
    Number.isInteger(candidate.width) &&
    Number.isInteger(candidate.height) &&
    Number(candidate.width) > 0 &&
    Number(candidate.height) > 0;
}
