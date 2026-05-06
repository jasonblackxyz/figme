import type { FigMeDocument } from '@primitives/document-model/types.ts';
import {
  buildDesignPackage as buildRegionDesignPackage,
  buildDesignPackageExport,
  exportDesignPackageAsJson as exportRegionDesignPackageAsJson,
} from './designPackageExporter.ts';
import type {
  DesignPackage,
  RuntimeExportOptions,
  RuntimeSemanticsExport,
} from './types.ts';

export function buildDesignPackage(doc: FigMeDocument, options: RuntimeExportOptions = {}): DesignPackage {
  return buildRegionDesignPackage(doc, {
    includeRenderOracle: options.includeRenderOracle,
  }) as unknown as DesignPackage;
}

export function exportDesignPackageAsJson(doc: FigMeDocument, options: RuntimeExportOptions = {}): string {
  return exportRegionDesignPackageAsJson(doc, {
    includeRenderOracle: options.includeRenderOracle,
  });
}

export function buildRuntimeSemanticsExport(doc: FigMeDocument): RuntimeSemanticsExport {
  const result = buildDesignPackageExport(doc);
  return {
    manifest: result.package.manifest as RuntimeSemanticsExport['manifest'],
    tokens: result.package.tokens as RuntimeSemanticsExport['tokens'],
    components: result.package.components as RuntimeSemanticsExport['components'],
    screens: result.package.screens as RuntimeSemanticsExport['screens'],
    bindings: (result.package.bindings ?? {}) as RuntimeSemanticsExport['bindings'],
    interactions: (result.package.interactions ?? {}) as RuntimeSemanticsExport['interactions'],
  };
}

export function exportRuntimeSemanticsAsJson(doc: FigMeDocument): string {
  return JSON.stringify(buildRuntimeSemanticsExport(doc), null, 2);
}
