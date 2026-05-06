import type { SemanticRegion } from './types.ts';

export interface RegionDiagnostic {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

/**
 * Region-level authoring checks. Mirrors the warnings the design-package
 * exporter emits, but operates on a single region so the Properties Panel
 * can surface issues live (without re-exporting the whole document).
 */
export function validateRegionAuthoring(region: SemanticRegion): RegionDiagnostic[] {
  const diagnostics: RegionDiagnostic[] = [];

  const hasValueBinding = region.bindings?.some((b) => b.slot === 'value');
  const hasInteractions = (region.interactions?.length ?? 0) > 0;

  if ((region.componentKind === 'text-input' || region.componentKind === 'textarea') && !hasValueBinding) {
    diagnostics.push({
      severity: 'error',
      code: 'INPUT_WITHOUT_VALUE_BINDING',
      message: `${region.componentKind} regions need a binding with slot "value".`,
    });
  }

  if ((region.componentKind === 'button' || region.role === 'button') && !hasInteractions) {
    diagnostics.push({
      severity: 'warning',
      code: 'BUTTON_WITHOUT_INTERACTION',
      message: 'Button-like regions usually need at least one interaction.',
    });
  }

  if (
    (region.exportMode ?? 'runtime') === 'runtime' &&
    region.role !== 'decoration' &&
    !hasInteractions &&
    !(region.bindings?.length) &&
    region.componentKind !== 'spacer' &&
    region.componentKind !== 'divider' &&
    region.componentKind !== 'icon'
  ) {
    diagnostics.push({
      severity: 'warning',
      code: 'RUNTIME_REGION_WITHOUT_BEHAVIOR',
      message: 'Runtime region has no bindings or interactions — consider exportMode "ignore" or role "decoration".',
    });
  }

  if (region.shape.rect.width <= 0 || region.shape.rect.height <= 0) {
    diagnostics.push({
      severity: 'error',
      code: 'EMPTY_SHAPE',
      message: 'Region shape is empty.',
    });
  }

  return diagnostics;
}
