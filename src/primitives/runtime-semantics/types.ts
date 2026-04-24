import type { GridRect } from '@primitives/grid-engine/types.ts';

export const DESIGN_PACKAGE_SCHEMA_VERSION = 'readme-design-package-v1' as const;

export type DesignPackageSchemaVersion = typeof DESIGN_PACKAGE_SCHEMA_VERSION;
export type RuntimeDiagnosticSeverity = 'error' | 'warning';
export type RuntimeDesktopBehavior = 'centered-mobile-canvas' | 'widen-modules' | 'split-pane';
export type RuntimeComponentKind = 'frame' | 'text-input' | 'custom-module';
export type RuntimeNodeRole = 'input' | 'button' | 'link' | 'decoration' | 'container' | 'content' | 'custom';
export type RuntimeProvenanceSource = 'figmii' | 'ai-enrichment' | 'hand-authored' | 'readme-app';

export interface RuntimeProvenance {
  source: RuntimeProvenanceSource;
  file?: string;
  layerIds?: string[];
  confidence?: number;
  note?: string;
}

export interface RuntimeDiagnostic {
  severity: RuntimeDiagnosticSeverity;
  code: string;
  message: string;
  path?: string;
  layerIds?: string[];
  provenance?: RuntimeProvenance;
}

export interface DesignStyleDef {
  color: string;
  bg: string;
  fontWeight?: number;
}

export interface DesignPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
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

export interface RuntimeManifestMetadata {
  id?: string;
  family?: string;
  version?: string;
  sourceRefs?: string[];
  defaultScreen?: string;
  desktopDefault?: RuntimeDesktopBehavior;
  backgroundToken?: string;
  provenance?: RuntimeProvenance;
}

export interface PageRuntimeMetadata {
  screenId?: string;
  screenName?: string;
  route?: string;
  exportAsScreen?: boolean;
  desktopBehavior?: RuntimeDesktopBehavior;
  breakpointId?: string;
  provenance?: RuntimeProvenance;
}

export interface LayerRuntimeMetadata {
  semanticId?: string;
  role?: RuntimeNodeRole;
  componentId?: string;
  componentKind?: RuntimeComponentKind;
  bindingSlots?: Record<string, string>;
  interactionIds?: string[];
  sticky?: 'top' | 'bottom' | 'none';
  scrollContainerId?: string;
  constraints?: ResponsiveConstraints;
  customModuleKind?: string;
  tags?: string[];
  provenance?: RuntimeProvenance;
}

export interface ResponsiveConstraints {
  anchor?: 'top-left' | 'top' | 'top-right' | 'center' | 'bottom';
  widthMode?: 'fixed' | 'fill' | 'hug';
  heightMode?: 'fixed' | 'fill' | 'hug';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  breakpointRects?: Record<string, GridRect>;
}

export interface RuntimeAnnotation {
  id: string;
  pageId: string;
  semanticId: string;
  name?: string;
  rect: GridRect;
  z?: number;
  export: boolean;
  sourceLayerIds?: string[];
  role?: RuntimeNodeRole;
  componentId?: string;
  componentKind?: RuntimeComponentKind;
  props?: Record<string, unknown>;
  bindingSlots?: Record<string, string>;
  interactionIds?: string[];
  sticky?: 'top' | 'bottom' | 'none';
  scrollContainerId?: string;
  constraints?: ResponsiveConstraints;
  customModuleKind?: string;
  inputShape?: string;
  breakpointBehavior?: string;
  tags?: string[];
  provenance?: RuntimeProvenance;
}

interface BaseComponentDef {
  id: string;
  name?: string;
  minWidth?: number;
  minHeight?: number;
  provenance?: RuntimeProvenance;
}

export interface FrameComponentDef extends BaseComponentDef {
  kind: 'frame';
  chars: FrameChars;
  tokens: {
    border: string;
    fill: string;
    title?: string;
    text?: string;
  };
  padding?: DesignPadding;
}

export interface TextInputComponentDef extends BaseComponentDef {
  kind: 'text-input';
  chars: FrameChars;
  tokens: {
    border: string;
    fill: string;
    text: string;
    placeholder: string;
    cursor?: string;
  };
  padding?: DesignPadding;
  multiline?: boolean;
}

export interface CustomModuleComponentDef extends BaseComponentDef {
  kind: 'custom-module';
  moduleKind: string;
  inputShape?: string;
  breakpointBehavior?: string;
}

export type RuntimeComponentDef = FrameComponentDef | TextInputComponentDef | CustomModuleComponentDef;

export interface DesignManifest {
  id: string;
  family: string;
  version: string;
  sourceRefs?: string[];
  breakpoints: Record<string, DesignBreakpoint>;
  defaultScreen?: string;
  desktopDefault?: RuntimeDesktopBehavior;
  backgroundToken?: string;
  provenance?: RuntimeProvenance;
}

export interface DesignScreenNode {
  id: string;
  componentId: string;
  rect: GridRect;
  z?: number;
  role?: RuntimeNodeRole;
  props?: Record<string, unknown>;
  bindings?: Record<string, string>;
  interactionIds?: string[];
  provenance?: RuntimeProvenance;
}

export interface DesignScreenSpec {
  id: string;
  name?: string;
  canvas: DesignBreakpoint;
  desktopBehavior?: RuntimeDesktopBehavior;
  nodes: DesignScreenNode[];
  provenance?: RuntimeProvenance;
}

export interface DesignBinding {
  id: string;
  path: string;
  fallback?: unknown;
  required?: boolean;
  provenance?: RuntimeProvenance;
}

export type DesignActionKind = 'focusInput' | 'submitQuery' | 'openSection' | 'openRead' | 'navigate' | 'custom';

export interface DesignAction {
  kind: DesignActionKind;
  target?: string;
  route?: string;
  payload?: Record<string, unknown>;
}

export interface DesignInteraction {
  id: string;
  action: DesignAction;
  provenance?: RuntimeProvenance;
}

export interface RenderOracle {
  chars: string[];
  styles?: string[][];
}

export interface DesignPackage {
  schemaVersion: DesignPackageSchemaVersion;
  manifest: DesignManifest;
  tokens: Record<string, DesignStyleDef>;
  components: RuntimeComponentDef[];
  screens: DesignScreenSpec[];
  bindings?: Record<string, DesignBinding>;
  interactions?: Record<string, DesignInteraction>;
  renderOracle?: Record<string, RenderOracle>;
}

export interface FigMeRuntimeMetadata {
  manifest?: RuntimeManifestMetadata;
  tokens: Record<string, DesignStyleDef>;
  components: Record<string, RuntimeComponentDef>;
  bindings: Record<string, DesignBinding>;
  interactions: Record<string, DesignInteraction>;
  annotations: Record<string, RuntimeAnnotation>;
}

export interface RuntimeSemanticsExport {
  manifest: DesignManifest;
  tokens: Record<string, DesignStyleDef>;
  components: RuntimeComponentDef[];
  screens: DesignScreenSpec[];
  bindings: Record<string, DesignBinding>;
  interactions: Record<string, DesignInteraction>;
}

export interface RuntimeInferenceOptions {
  pageIds?: string[];
  strategy?: 'aggressive';
}

export interface RuntimeExportOptions {
  includeRenderOracle?: boolean;
}

export interface RuntimeValidationOptions {
  requireRenderOracle?: boolean;
}
