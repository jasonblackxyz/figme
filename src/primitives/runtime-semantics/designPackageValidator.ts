import {
  DESIGN_PACKAGE_SCHEMA_VERSION,
  RUNTIME_COMPONENT_KINDS,
  RUNTIME_ROLES,
  TIER2_COMPONENT_KINDS,
  type DesignComponentDef,
  type DesignDiagnostic,
  type DesignPackage,
  type DesignRect,
  type DesignScreenNode,
  type DesignScreenSpec,
} from './designPackageTypes.ts';

export interface ValidationResult {
  diagnostics: DesignDiagnostic[];
  package?: DesignPackage;
}

const VALID_COMPONENT_KINDS = new Set<string>(RUNTIME_COMPONENT_KINDS);
const RESERVED_COMPONENT_KINDS = new Set<string>(TIER2_COMPONENT_KINDS);
const VALID_ROLES = new Set<string>(RUNTIME_ROLES);
const VALID_ACTION_KINDS = new Set([
  'focusInput',
  'submitQuery',
  'openSection',
  'openRead',
  'navigate',
  'selectItem',
  'toggleState',
  'dismiss',
  'copyValue',
  'custom',
]);
const VALID_DESKTOP_BEHAVIORS = new Set(['centered-mobile-canvas', 'widen-modules', 'split-pane', 'custom']);

export function validateDesignPackage(candidate: unknown): ValidationResult {
  const diagnostics: DesignDiagnostic[] = [];
  const add = (diagnostic: DesignDiagnostic) => diagnostics.push(diagnostic);

  if (!isRecord(candidate)) {
    add({
      severity: 'error',
      code: 'INVALID_PACKAGE',
      message: 'Design package must be an object.',
    });
    return { diagnostics };
  }

  const pkg = candidate as Partial<DesignPackage>;
  if (pkg.schemaVersion !== DESIGN_PACKAGE_SCHEMA_VERSION) {
    add({
      severity: 'error',
      code: 'INVALID_SCHEMA_VERSION',
      message: `Design package schemaVersion must be "${DESIGN_PACKAGE_SCHEMA_VERSION}".`,
      path: 'schemaVersion',
    });
  }

  validateManifest(pkg, add);
  validateTokens(pkg, add);
  validateComponents(pkg, add);
  validateBindings(pkg, add);
  validateInteractions(pkg, add);
  validateScreens(pkg, add);
  validateRenderOracle(pkg, add);

  return {
    diagnostics,
    package: diagnostics.some((diagnostic) => diagnostic.severity === 'error')
      ? undefined
      : (pkg as DesignPackage),
  };
}

function validateManifest(pkg: Partial<DesignPackage>, add: (diagnostic: DesignDiagnostic) => void): void {
  if (!isRecord(pkg.manifest)) {
    add({ severity: 'error', code: 'MISSING_MANIFEST', message: 'Design package requires a manifest.', path: 'manifest' });
    return;
  }

  for (const key of ['id', 'family', 'version'] as const) {
    if (typeof pkg.manifest[key] !== 'string' || !pkg.manifest[key].trim()) {
      add({
        severity: 'error',
        code: 'INVALID_MANIFEST_FIELD',
        message: `Manifest field "${key}" must be a non-empty string.`,
        path: `manifest.${key}`,
      });
    }
  }

  if (!isRecord(pkg.manifest.breakpoints) || Object.keys(pkg.manifest.breakpoints).length === 0) {
    add({
      severity: 'error',
      code: 'MISSING_BREAKPOINTS',
      message: 'Manifest requires at least one breakpoint.',
      path: 'manifest.breakpoints',
    });
  } else {
    for (const [id, breakpoint] of Object.entries(pkg.manifest.breakpoints)) {
      if (!isRecord(breakpoint) || !isPositiveInteger(breakpoint.cols) || !isPositiveInteger(breakpoint.rows)) {
        add({
          severity: 'error',
          code: 'INVALID_BREAKPOINT',
          message: `Breakpoint "${id}" must declare positive integer cols and rows.`,
          path: `manifest.breakpoints.${id}`,
        });
      }
    }
  }

  if (pkg.manifest.defaultScreen && typeof pkg.manifest.defaultScreen !== 'string') {
    add({
      severity: 'error',
      code: 'INVALID_DEFAULT_SCREEN',
      message: 'Manifest defaultScreen must be a string when present.',
      path: 'manifest.defaultScreen',
    });
  }

  if (pkg.manifest.desktopDefault && !VALID_DESKTOP_BEHAVIORS.has(pkg.manifest.desktopDefault)) {
    add({
      severity: 'error',
      code: 'INVALID_DESKTOP_BEHAVIOR',
      message: `Desktop behavior "${pkg.manifest.desktopDefault}" is not supported.`,
      path: 'manifest.desktopDefault',
    });
  }

  if (pkg.manifest.backgroundToken && !pkg.tokens?.[pkg.manifest.backgroundToken]) {
    add({
      severity: 'error',
      code: 'MISSING_TOKEN',
      message: `Background token "${pkg.manifest.backgroundToken}" is not defined.`,
      path: 'manifest.backgroundToken',
    });
  }
}

function validateTokens(pkg: Partial<DesignPackage>, add: (diagnostic: DesignDiagnostic) => void): void {
  if (!isRecord(pkg.tokens) || Object.keys(pkg.tokens).length === 0) {
    add({ severity: 'error', code: 'MISSING_TOKENS', message: 'Design package requires tokens.', path: 'tokens' });
    return;
  }

  for (const [id, token] of Object.entries(pkg.tokens)) {
    if (!isRecord(token) || typeof token.color !== 'string' || typeof token.bg !== 'string') {
      add({
        severity: 'error',
        code: 'INVALID_TOKEN',
        message: `Token "${id}" must declare color and bg strings.`,
        path: `tokens.${id}`,
      });
    }
  }
}

function validateComponents(pkg: Partial<DesignPackage>, add: (diagnostic: DesignDiagnostic) => void): void {
  if (!Array.isArray(pkg.components)) {
    add({ severity: 'error', code: 'MISSING_COMPONENTS', message: 'Design package requires components.', path: 'components' });
    return;
  }

  forDuplicateIds(pkg.components, 'components', add);
  for (const [index, component] of pkg.components.entries()) {
    const path = `components.${index}`;
    if (!isRecord(component)) {
      add({ severity: 'error', code: 'INVALID_COMPONENT', message: 'Component definitions must be objects.', path });
      continue;
    }

    if (typeof component.id !== 'string' || !component.id.trim()) {
      add({
        severity: 'error',
        code: 'INVALID_COMPONENT_ID',
        message: 'Component id must be a non-empty string.',
        path: `${path}.id`,
      });
    }

    if (typeof component.kind !== 'string' || !VALID_COMPONENT_KINDS.has(component.kind)) {
      add({
        severity: 'error',
        code: 'UNSUPPORTED_COMPONENT_KIND',
        message: `Unsupported component kind "${String(component.kind)}".`,
        path: `${path}.kind`,
      });
      continue;
    }

    if (RESERVED_COMPONENT_KINDS.has(component.kind)) {
      add({
        severity: 'warning',
        code: 'RESERVED_COMPONENT_KIND',
        message: `Component kind "${component.kind}" is reserved but not yet implemented in this runtime version.`,
        path: `${path}.kind`,
      });
    }

    validateComponentTokens(component as DesignComponentDef, pkg, path, add);
    if (component.kind === 'custom-module' && typeof component.moduleKind !== 'string') {
      add({
        severity: 'error',
        code: 'INVALID_CUSTOM_MODULE',
        message: 'Custom module components require moduleKind.',
        path: `${path}.moduleKind`,
      });
    }
  }
}

function validateComponentTokens(
  component: DesignComponentDef,
  pkg: Partial<DesignPackage>,
  path: string,
  add: (diagnostic: DesignDiagnostic) => void,
): void {
  if (!component.tokens) return;

  for (const [slot, tokenId] of Object.entries(component.tokens)) {
    if (typeof tokenId !== 'string' || !pkg.tokens?.[tokenId]) {
      add({
        severity: 'error',
        code: 'MISSING_TOKEN',
        message: `Component "${component.id}" references missing token "${String(tokenId)}" for slot "${slot}".`,
        path: `${path}.tokens.${slot}`,
        provenance: component.provenance,
      });
    }
  }

  if (component.chars) {
    validateFrameChars(component.chars, path, add);
  }
}

function validateFrameChars(
  chars: unknown,
  path: string,
  add: (diagnostic: DesignDiagnostic) => void,
): void {
  if (!isRecord(chars)) {
    add({ severity: 'error', code: 'INVALID_FRAME_CHARS', message: 'Frame chars must be an object.', path: `${path}.chars` });
    return;
  }
  for (const key of ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br']) {
    if (typeof chars[key] !== 'string' || chars[key].length === 0) {
      add({
        severity: 'error',
        code: 'INVALID_FRAME_CHARS',
        message: `Frame char "${key}" must be a non-empty string.`,
        path: `${path}.chars.${key}`,
      });
    }
  }
}

function validateBindings(pkg: Partial<DesignPackage>, add: (diagnostic: DesignDiagnostic) => void): void {
  if (!pkg.bindings) return;
  if (!isRecord(pkg.bindings)) {
    add({ severity: 'error', code: 'INVALID_BINDINGS', message: 'Bindings must be an object.', path: 'bindings' });
    return;
  }

  for (const [id, binding] of Object.entries(pkg.bindings)) {
    if (!isRecord(binding) || binding.id !== id || typeof binding.path !== 'string' || !binding.path.trim()) {
      add({
        severity: 'error',
        code: 'INVALID_BINDING',
        message: `Binding "${id}" must include matching id and non-empty path.`,
        path: `bindings.${id}`,
      });
    }
  }
}

function validateInteractions(pkg: Partial<DesignPackage>, add: (diagnostic: DesignDiagnostic) => void): void {
  if (!pkg.interactions) return;
  if (!isRecord(pkg.interactions)) {
    add({ severity: 'error', code: 'INVALID_INTERACTIONS', message: 'Interactions must be an object.', path: 'interactions' });
    return;
  }

  for (const [id, interaction] of Object.entries(pkg.interactions)) {
    if (!isRecord(interaction) || interaction.id !== id || !isRecord(interaction.action) || typeof interaction.action.kind !== 'string') {
      add({
        severity: 'error',
        code: 'INVALID_INTERACTION',
        message: `Interaction "${id}" must include matching id and action.kind.`,
        path: `interactions.${id}`,
      });
      continue;
    }
    if (!VALID_ACTION_KINDS.has(interaction.action.kind)) {
      add({
        severity: 'error',
        code: 'UNSUPPORTED_ACTION_KIND',
        message: `Interaction "${id}" has unsupported action kind "${interaction.action.kind}".`,
        path: `interactions.${id}.action.kind`,
      });
    }
  }
}

function validateScreens(pkg: Partial<DesignPackage>, add: (diagnostic: DesignDiagnostic) => void): void {
  if (!Array.isArray(pkg.screens)) {
    add({ severity: 'error', code: 'MISSING_SCREENS', message: 'Design package requires screens.', path: 'screens' });
    return;
  }

  forDuplicateIds(pkg.screens, 'screens', add);
  const componentById = new Map((pkg.components ?? []).map((component) => [component.id, component]));
  const screenIds = new Set(pkg.screens.map((screen) => screen.id));
  if (pkg.manifest?.defaultScreen && !screenIds.has(pkg.manifest.defaultScreen)) {
    add({
      severity: 'error',
      code: 'MISSING_SCREEN',
      message: `Default screen "${pkg.manifest.defaultScreen}" is not defined.`,
      path: 'manifest.defaultScreen',
    });
  }

  for (const [screenIndex, screen] of pkg.screens.entries()) {
    validateScreen(screen, screenIndex, componentById, pkg, screenIds, add);
  }
}

function validateScreen(
  screen: DesignScreenSpec,
  screenIndex: number,
  componentById: Map<string | undefined, DesignComponentDef>,
  pkg: Partial<DesignPackage>,
  screenIds: Set<string>,
  add: (diagnostic: DesignDiagnostic) => void,
): void {
  const screenPath = `screens.${screenIndex}`;
  if (typeof screen.id !== 'string' || !screen.id.trim()) {
    add({ severity: 'error', code: 'INVALID_SCREEN_ID', message: 'Screen id must be a non-empty string.', path: `${screenPath}.id` });
  }
  if (!isRecord(screen.canvas) || !isPositiveInteger(screen.canvas.cols) || !isPositiveInteger(screen.canvas.rows)) {
    add({ severity: 'error', code: 'INVALID_SCREEN_CANVAS', message: 'Screen canvas requires positive integer cols and rows.', path: `${screenPath}.canvas` });
  }
  if (screen.desktopBehavior && !VALID_DESKTOP_BEHAVIORS.has(screen.desktopBehavior)) {
    add({
      severity: 'error',
      code: 'INVALID_DESKTOP_BEHAVIOR',
      message: `Desktop behavior "${screen.desktopBehavior}" is not supported.`,
      path: `${screenPath}.desktopBehavior`,
    });
  }
  if (!Array.isArray(screen.nodes)) {
    add({ severity: 'error', code: 'INVALID_SCREEN_NODES', message: 'Screen nodes must be an array.', path: `${screenPath}.nodes` });
    return;
  }

  forDuplicateIds(screen.nodes, `${screenPath}.nodes`, add);
  for (const [nodeIndex, node] of screen.nodes.entries()) {
    const nodePath = `${screenPath}.nodes.${nodeIndex}`;
    const component = componentById.get(node.componentId);
    if (!component) {
      add({
        severity: 'error',
        code: 'MISSING_COMPONENT',
        message: `Node "${node.id}" references missing component "${node.componentId}".`,
        path: `${nodePath}.componentId`,
        provenance: node.provenance,
      });
    }
    if ((component?.kind === 'text-input' || component?.kind === 'textarea') && !node.bindings?.value) {
      add({
        severity: 'error',
        code: 'TEXT_INPUT_MISSING_VALUE_BINDING',
        message: `Input node "${node.id}" must bind its value slot.`,
        path: `${nodePath}.bindings.value`,
        provenance: node.provenance,
      });
    }
    validateRect(node.rect, `${nodePath}.rect`, add);
    validateNodeExclude(node, nodePath, add);
    if (node.role && !VALID_ROLES.has(node.role)) {
      add({
        severity: 'error',
        code: 'INVALID_ROLE',
        message: `Node "${node.id}" has unsupported role "${node.role}".`,
        path: `${nodePath}.role`,
        provenance: node.provenance,
      });
    }
    for (const [slot, bindingId] of Object.entries(node.bindings ?? {})) {
      if (!pkg.bindings?.[bindingId]) {
        add({
          severity: 'error',
          code: 'MISSING_BINDING',
          message: `Node "${node.id}" slot "${slot}" references missing binding "${bindingId}".`,
          path: `${nodePath}.bindings.${slot}`,
          provenance: node.provenance,
        });
      }
    }
    for (const interactionId of node.interactionIds ?? []) {
      const interaction = pkg.interactions?.[interactionId];
      if (!interaction) {
        add({
          severity: 'error',
          code: 'MISSING_INTERACTION',
          message: `Node "${node.id}" references missing interaction "${interactionId}".`,
          path: `${nodePath}.interactionIds`,
          provenance: node.provenance,
        });
        continue;
      }
      if (interaction.action.kind === 'navigate' && interaction.action.route && !screenIds.has(interaction.action.route)) {
        add({
          severity: 'error',
          code: 'INVALID_NAVIGATION_ROUTE',
          message: `Navigation route "${interaction.action.route}" does not map to an exported screen.`,
          path: `interactions.${interaction.id}.action.route`,
          provenance: interaction.provenance,
        });
      }
    }
  }
}

function validateNodeExclude(
  node: DesignScreenNode,
  nodePath: string,
  add: (diagnostic: DesignDiagnostic) => void,
): void {
  if (!node.exclude) return;
  if (!Array.isArray(node.exclude)) {
    add({
      severity: 'error',
      code: 'INVALID_EXCLUDE_CELLS',
      message: `Node "${node.id}" exclude cells must be an array.`,
      path: `${nodePath}.exclude`,
      provenance: node.provenance,
    });
    return;
  }
  for (const [index, cell] of node.exclude.entries()) {
    if (!isRecord(cell) || !isInteger(cell.col) || !isInteger(cell.row)) {
      add({
        severity: 'error',
        code: 'INVALID_EXCLUDE_CELL',
        message: `Node "${node.id}" exclude cell ${index} must declare integer col and row.`,
        path: `${nodePath}.exclude.${index}`,
        provenance: node.provenance,
      });
      continue;
    }
    if (!pointInsideRect(cell, node.rect)) {
      add({
        severity: 'error',
        code: 'EXCLUDE_CELL_OUTSIDE_RECT',
        message: `Node "${node.id}" exclude cell ${index} is outside its rect.`,
        path: `${nodePath}.exclude.${index}`,
        provenance: node.provenance,
      });
    }
  }
}

function validateRenderOracle(pkg: Partial<DesignPackage>, add: (diagnostic: DesignDiagnostic) => void): void {
  if (!pkg.renderOracle) return;
  if (!isRecord(pkg.renderOracle)) {
    add({ severity: 'error', code: 'INVALID_RENDER_ORACLE', message: 'renderOracle must be an object.', path: 'renderOracle' });
    return;
  }
  for (const [screenId, oracle] of Object.entries(pkg.renderOracle)) {
    if (!isRecord(oracle) || !Array.isArray(oracle.chars) || oracle.chars.some((row) => typeof row !== 'string')) {
      add({
        severity: 'error',
        code: 'INVALID_RENDER_ORACLE',
        message: `Render oracle "${screenId}" must include string rows.`,
        path: `renderOracle.${screenId}.chars`,
      });
    }
  }
}

function validateRect(rect: DesignRect, path: string, add: (diagnostic: DesignDiagnostic) => void): void {
  if (!isRecord(rect) || !isInteger(rect.col) || !isInteger(rect.row) || !isPositiveInteger(rect.width) || !isPositiveInteger(rect.height)) {
    add({
      severity: 'error',
      code: 'INVALID_RECT',
      message: 'Rect requires integer col/row and positive integer width/height.',
      path,
    });
  }
}

function forDuplicateIds(items: Array<{ id?: unknown }>, path: string, add: (diagnostic: DesignDiagnostic) => void): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item.id !== 'string') {
      continue;
    }
    if (seen.has(item.id)) {
      add({
        severity: 'error',
        code: 'DUPLICATE_ID',
        message: `Duplicate id "${item.id}" in ${path}.`,
        path,
      });
    }
    seen.add(item.id);
  }
}

function pointInsideRect(point: { col: number; row: number }, rect: DesignRect): boolean {
  return point.col >= rect.col &&
    point.row >= rect.row &&
    point.col < rect.col + rect.width &&
    point.row < rect.row + rect.height;
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0;
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
