import type { FigmiiDocument } from '@primitives/document-model/types.ts';

export const DESIGN_PACKAGE_SCHEMA_VERSION = 'readme-design-package-v1' as const;

export const TIER1_COMPONENT_KINDS = [
  'frame',
  'card',
  'modal',
  'scroll-panel',
  'text-input',
  'textarea',
  'button',
  'link',
  'text-block',
  'chip',
  'badge',
  'icon',
  'divider',
  'spacer',
  'list',
  'list-item',
  'tree',
  'tab-bar',
  'dock',
  'slider',
  'spinner',
  'custom-module',
] as const;

export const TIER2_COMPONENT_KINDS = [
  'toggle',
  'select',
  'radio-group',
  'checkbox',
  'avatar',
  'image',
  'progress-bar',
  'table',
  'accordion',
  'tooltip',
  'toast',
  'breadcrumb',
] as const;

export const RUNTIME_COMPONENT_KINDS = [
  ...TIER1_COMPONENT_KINDS,
  ...TIER2_COMPONENT_KINDS,
] as const;

export const RUNTIME_ROLES = [
  'input',
  'button',
  'link',
  'container',
  'content',
  'decoration',
  'navigation',
  'list-item',
  'status',
  'form',
  'header',
  'main',
  'footer',
  'aside',
] as const;

export type DesignPackageSchemaVersion = typeof DESIGN_PACKAGE_SCHEMA_VERSION;
export type RuntimeComponentKind = typeof RUNTIME_COMPONENT_KINDS[number];
export type RuntimeRole = typeof RUNTIME_ROLES[number];
export type RuntimeDiagnosticSeverity = 'error' | 'warning';
export type RuntimeDesktopBehavior = 'centered-mobile-canvas' | 'widen-modules' | 'split-pane' | 'custom';
export type RuntimeExportMode = 'runtime' | 'oracle-only' | 'ignore';

export type RuntimeAction =
  | { kind: 'focusInput'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'submitQuery'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'openSection'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'openRead'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'navigate'; route?: string; payload?: Record<string, unknown> }
  | { kind: 'selectItem'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'toggleState'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'dismiss'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'copyValue'; target?: string; payload?: Record<string, unknown> }
  | { kind: 'custom'; target?: string; payload?: Record<string, unknown> };

export interface DesignPoint {
  col: number;
  row: number;
}

export interface DesignRect extends DesignPoint {
  width: number;
  height: number;
}

export interface DesignPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface RegionShape {
  rect: DesignRect;
  exclude?: DesignPoint[];
}

export interface RuntimeBindingRef {
  slot: string;
  path: string;
  fallback?: unknown;
  required?: boolean;
}

export interface RuntimeInteractionRef {
  id: string;
  action: RuntimeAction;
}

export interface RuntimeProvenance {
  source: 'human' | 'ai' | 'imported';
  confidence?: number;
  note?: string;
  reviewed?: boolean;
}

export interface SemanticRegion {
  id: string;
  componentKind: RuntimeComponentKind;
  semanticId?: string;
  role?: RuntimeRole;
  shape: RegionShape;
  z?: number;
  bindings?: RuntimeBindingRef[];
  interactions?: RuntimeInteractionRef[];
  props?: Record<string, unknown>;
  exportMode?: RuntimeExportMode;
  parentRegionId?: string;
  provenance?: RuntimeProvenance;
}

export interface PageRuntimeSemantics {
  screenId?: string;
  routeTarget?: string;
  defaultBreakpoint?: string;
  desktopBehavior?: RuntimeDesktopBehavior;
  scrollRootId?: string;
}

export interface DocumentRuntimeSemantics {
  designFamily?: string;
  packageVersion?: string;
  sourceRefs?: string[];
}

export interface RegionBackedPage {
  regions?: Record<string, SemanticRegion>;
  regionOrder?: string[];
  runtime?: PageRuntimeSemantics & Record<string, unknown>;
}

export type RegionBackedDocument = Omit<FigmiiDocument, 'pages' | 'runtime'> & {
  runtime?: (FigmiiDocument['runtime'] & Partial<DocumentRuntimeSemantics>) | (Partial<DocumentRuntimeSemantics> & Record<string, unknown>);
  pages: Array<FigmiiDocument['pages'][number] & RegionBackedPage>;
};

export interface DesignDiagnostic {
  severity: RuntimeDiagnosticSeverity;
  code: string;
  message: string;
  path?: string;
  provenance?: DesignProvenance;
}

export interface DesignProvenance {
  source: 'figmii' | 'ai-enrichment' | 'hand-authored' | 'readme-app';
  file?: string;
  layerIds?: string[];
  confidence?: number;
  note?: string;
}

export interface DesignStyleDef {
  color: string;
  bg: string;
  fontSize?: string;
  fontWeight?: number;
}

export interface DesignBreakpoint {
  cols: number;
  rows: number;
}

export interface FrameChars {
  tl: string;
  t: string;
  tr: string;
  l: string;
  r: string;
  bl: string;
  b: string;
  br: string;
}

export interface DesignComponentDef {
  id: string;
  kind: RuntimeComponentKind;
  name?: string;
  tokens?: Record<string, string>;
  chars?: FrameChars;
  padding?: DesignPadding;
  minWidth?: number;
  minHeight?: number;
  multiline?: boolean;
  moduleKind?: string;
  props?: Record<string, unknown>;
  provenance?: DesignProvenance;
}

export interface DesignManifest {
  id: string;
  family: string;
  version: string;
  sourceRefs?: string[];
  breakpoints: Record<string, DesignBreakpoint>;
  defaultScreen?: string;
  desktopDefault?: RuntimeDesktopBehavior;
  backgroundToken?: string;
  provenance?: DesignProvenance;
}

export interface DesignScreenNode {
  id: string;
  componentId: string;
  rect: DesignRect;
  exclude?: DesignPoint[];
  z?: number;
  role?: RuntimeRole;
  props?: Record<string, unknown>;
  bindings?: Record<string, string>;
  interactionIds?: string[];
  provenance?: DesignProvenance;
}

export interface DesignScreenSpec {
  id: string;
  name?: string;
  canvas: DesignBreakpoint;
  desktopBehavior?: RuntimeDesktopBehavior;
  nodes: DesignScreenNode[];
  provenance?: DesignProvenance;
}

export interface DesignBinding {
  id: string;
  path: string;
  fallback?: unknown;
  required?: boolean;
  provenance?: DesignProvenance;
}

export interface DesignInteraction {
  id: string;
  action: RuntimeAction;
  provenance?: DesignProvenance;
}

export interface RenderOracle {
  chars: string[];
  styles?: string[][];
}

export interface DesignPackage {
  schemaVersion: DesignPackageSchemaVersion;
  manifest: DesignManifest;
  tokens: Record<string, DesignStyleDef>;
  components: DesignComponentDef[];
  screens: DesignScreenSpec[];
  bindings?: Record<string, DesignBinding>;
  interactions?: Record<string, DesignInteraction>;
  renderOracle?: Record<string, RenderOracle>;
}

export interface DesignPackageExportOptions {
  selectedPageIds?: string[];
  strict?: boolean;
  includeRenderOracle?: boolean;
}

export interface DesignPackageExportResult {
  package: DesignPackage;
  diagnostics: DesignDiagnostic[];
}
