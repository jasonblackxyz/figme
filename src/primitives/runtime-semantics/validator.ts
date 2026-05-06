import type { FigMeDocument } from '@primitives/document-model/types.ts';
import { buildDesignPackageExport } from './designPackageExporter.ts';
import { validateDesignPackage as validateRegionDesignPackage } from './designPackageValidator.ts';
import type {
  DesignPackage,
  RuntimeDiagnostic,
  RuntimeValidationOptions,
} from './types.ts';

export function validateRuntimeSemantics(
  doc: FigMeDocument,
  options: RuntimeValidationOptions = {},
): RuntimeDiagnostic[] {
  const result = buildDesignPackageExport(doc, {
    includeRenderOracle: options.requireRenderOracle,
  });
  const diagnostics = result.diagnostics as RuntimeDiagnostic[];

  if (options.requireRenderOracle && !result.package.renderOracle) {
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
  return validateRegionDesignPackage(pkg).diagnostics as RuntimeDiagnostic[];
}
