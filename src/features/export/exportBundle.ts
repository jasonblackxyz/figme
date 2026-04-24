import JSZip from 'jszip';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { computeColorOverrides } from '@primitives/document-model/colorOverrides.ts';
import { applyPageCanvasSizeToGridConfig, getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';
import type { ComponentDef, FigmiiDocument, FigmiiPage, Layer } from '@primitives/document-model/types.ts';
import type { ColorOverrideMap } from '@primitives/document-model/colorOverrides.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import { exportAsJson, exportAsHtml, exportAsMarkdown } from './exporters.ts';
import { exportGridSpecAsJson } from './gridspec/exporter.ts';
import { renderBufferToCanvas } from './renderToCanvas.ts';
import { buildPageExportBaseName, buildZipExportName } from './exportNaming.ts';
import type { ExportBundleOptions } from './types.ts';

export interface PageExportContext {
  page: FigmiiPage;
  buffer: StampBuffer;
  pageGridConfig: GridConfig;
  colorOverrides: ColorOverrideMap;
  canvasSize: ReturnType<typeof getPageCanvasSizeInfo>;
}

export function createPageExportContext(doc: FigmiiDocument, page: FigmiiPage): PageExportContext {
  const canvasSize = getPageCanvasSizeInfo(page, doc.gridConfig);
  const pageGridConfig = applyPageCanvasSizeToGridConfig(page, doc.gridConfig);
  const buffer = composePageBuffer(page, pageGridConfig);
  const colorOverrides = computeColorOverrides(page);

  return { page, buffer, pageGridConfig, colorOverrides, canvasSize };
}

export function createSinglePageDocument(
  doc: FigmiiDocument,
  page: FigmiiPage,
  designName: string,
): FigmiiDocument {
  return {
    ...doc,
    name: designName,
    pages: [{ ...page }],
    activePageId: page.id,
    components: collectPageComponents(doc, page),
  };
}

function collectPageComponents(
  doc: FigmiiDocument,
  page: FigmiiPage,
): Record<string, ComponentDef> {
  const pageLayerIds = new Set(Object.keys(page.layers));
  const componentIds = new Set<string>();

  for (const layer of Object.values(page.layers)) {
    if (layer.kind === 'component') {
      const componentId = getComponentLayerId(layer);
      if (componentId && doc.components[componentId]) {
        componentIds.add(componentId);
      }
    }
  }

  for (const [componentId, component] of Object.entries(doc.components)) {
    if (component.sourceLayerIds.some((layerId) => pageLayerIds.has(layerId))) {
      componentIds.add(componentId);
    }
  }

  return Object.fromEntries(
    [...componentIds].map((componentId) => [componentId, doc.components[componentId]!]),
  );
}

function getComponentLayerId(layer: Layer): string | null {
  const componentId = (layer.properties as { componentId?: unknown }).componentId;
  return typeof componentId === 'string' && componentId ? componentId : null;
}

export async function createExportBundle(
  doc: FigmiiDocument,
  options: ExportBundleOptions,
): Promise<{ blob: Blob; filename: string }> {
  const designName = options.designName.trim() || doc.name || 'Untitled';
  const selectedPages = options.selectedPageIds
    .map((pageId) => doc.pages.find((page) => page.id === pageId))
    .filter((page): page is FigmiiPage => page !== undefined);

  if (selectedPages.length === 0) {
    throw new Error('Select at least one page to export.');
  }

  if (options.formats.length === 0) {
    throw new Error('Select at least one export format.');
  }

  const exportDate = options.date ?? new Date();
  const zip = new JSZip();

  for (const page of selectedPages) {
    const pageDoc = createSinglePageDocument(doc, page, designName);
    const context = createPageExportContext(pageDoc, page);
    const baseName = buildPageExportBaseName(designName, page.name, exportDate);
    const pageFolder = zip.folder(baseName);

    if (!pageFolder) {
      throw new Error(`Unable to create an export folder for "${page.name}".`);
    }

    for (const format of options.formats) {
      if (format === 'png') {
        const canvas = await renderBufferToCanvas(
          context.buffer,
          pageDoc.palette,
          context.pageGridConfig,
          context.colorOverrides,
        );
        const blob = await canvasToBlob(canvas);
        pageFolder.file(`${baseName}.png`, blob);
        continue;
      }

      if (format === 'html') {
        const html = exportAsHtml(
          pageDoc,
          context.buffer,
          context.pageGridConfig,
          context.colorOverrides,
        );
        pageFolder.file(`${baseName}.html`, html);
        continue;
      }

      if (format === 'figmii') {
        pageFolder.file(`${baseName}.figmii`, exportAsJson(pageDoc));
        continue;
      }

      if (format === 'gridspec') {
        const gridspec = exportGridSpecAsJson(pageDoc, { includeBuffer: options.includeBuffer });
        pageFolder.file(`${baseName}.gridspec.json`, gridspec);
        continue;
      }

      if (format === 'markdown') {
        pageFolder.file(`${baseName}-spec.md`, exportAsMarkdown(pageDoc));
      }
    }
  }

  const bytes = await zip.generateAsync({ type: 'arraybuffer' });
  const blob = new Blob([bytes], { type: 'application/zip' });
  return {
    blob,
    filename: buildZipExportName(designName, exportDate),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('Failed to render a PNG export.'));
    }, 'image/png');
  });
}
