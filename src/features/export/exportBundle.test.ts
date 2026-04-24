import JSZip from 'jszip';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FigmiiDocument, FigmiiPage, Layer } from '@primitives/document-model/types.ts';
import { createExportBundle } from './exportBundle.ts';
import { buildPageExportBaseName } from './exportNaming.ts';
import { renderBufferToCanvas } from './renderToCanvas.ts';

vi.mock('./renderToCanvas.ts', () => ({
  renderBufferToCanvas: vi.fn(async () => ({
    toBlob: (callback: (blob: Blob | null) => void) => {
      callback(new Blob(['png-bytes'], { type: 'image/png' }));
    },
  })),
}));

function makeDocument(): FigmiiDocument {
  const base = createEmptyDocument('Source Document');
  const secondBase = createEmptyDocument('Second Document');

  const pageOne: FigmiiPage = {
    ...base.pages[0]!,
    id: 'page-one',
    name: 'Page One',
  };
  const pageTwo: FigmiiPage = {
    ...secondBase.pages[0]!,
    id: 'page-two',
    name: 'Page Two',
  };

  return {
    ...base,
    pages: [pageOne, pageTwo],
    activePageId: pageOne.id,
  };
}

async function loadZip(blob: Blob): Promise<JSZip> {
  return JSZip.loadAsync(await readBlobAsArrayBuffer(blob));
}

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read export bundle.'));
    reader.readAsArrayBuffer(blob);
  });
}

describe('createExportBundle', () => {
  beforeEach(() => {
    vi.mocked(renderBufferToCanvas).mockClear();
  });

  it('creates page folders for each selected page and each selected format', async () => {
    const date = new Date('2026-04-22T15:30:00Z');
    const doc = makeDocument();
    const { blob, filename } = await createExportBundle(doc, {
      designName: 'Circuit',
      selectedPageIds: ['page-one', 'page-two'],
      formats: ['png', 'html', 'figmii', 'gridspec', 'markdown'],
      includeBuffer: false,
      date,
    });

    expect(filename).toBe('Circuit_export_22-04-2026.zip');
    expect(renderBufferToCanvas).toHaveBeenCalledTimes(2);

    const zip = await loadZip(blob);
    const pageOneBase = buildPageExportBaseName('Circuit', 'Page One', date);
    const pageTwoBase = buildPageExportBaseName('Circuit', 'Page Two', date);

    expect(zip.file(`${pageOneBase}/${pageOneBase}.png`)).not.toBeNull();
    expect(zip.file(`${pageOneBase}/${pageOneBase}.html`)).not.toBeNull();
    expect(zip.file(`${pageOneBase}/${pageOneBase}.figmii`)).not.toBeNull();
    expect(zip.file(`${pageOneBase}/${pageOneBase}.gridspec.json`)).not.toBeNull();
    expect(zip.file(`${pageOneBase}/${pageOneBase}-spec.md`)).not.toBeNull();
    expect(zip.file(`${pageTwoBase}/${pageTwoBase}.figmii`)).not.toBeNull();
  });

  it('writes one-page .figmii files for each page folder', async () => {
    const date = new Date('2026-04-22T15:30:00Z');
    const doc = makeDocument();
    const { blob } = await createExportBundle(doc, {
      designName: 'Circuit',
      selectedPageIds: ['page-one'],
      formats: ['figmii'],
      includeBuffer: false,
      date,
    });

    const zip = await loadZip(blob);
    const pageBase = buildPageExportBaseName('Circuit', 'Page One', date);
    const file = zip.file(`${pageBase}/${pageBase}.figmii`);

    expect(file).not.toBeNull();
    const exportedDoc = JSON.parse(await file!.async('string')) as FigmiiDocument;

    expect(exportedDoc.name).toBe('Circuit');
    expect(exportedDoc.pages).toHaveLength(1);
    expect(exportedDoc.pages[0]!.name).toBe('Page One');
  });

  it('scopes one-page .figmii files to components used by that page', async () => {
    const date = new Date('2026-04-22T15:30:00Z');
    const doc = makeDocument();
    const componentLayer: Layer = {
      id: 'page-one-component',
      kind: 'component',
      name: 'Page One Instance',
      rect: { col: 1, row: 1, width: 4, height: 2 },
      visible: true,
      locked: false,
      opacity: 1,
      styleKey: 'border',
      properties: { componentId: 'component-page-one' },
    };
    const pageOne = {
      ...doc.pages[0]!,
      layers: {
        ...doc.pages[0]!.layers,
        [componentLayer.id]: componentLayer,
      },
      layerOrder: [...doc.pages[0]!.layerOrder, componentLayer.id],
    };
    const sourceOnlyLayer: Layer = {
      id: 'page-two-source',
      kind: 'divider',
      name: 'Page Two Source',
      rect: { col: 0, row: 0, width: 4, height: 1 },
      visible: true,
      locked: false,
      opacity: 1,
      styleKey: 'border',
      properties: {},
    };
    const pageTwo = {
      ...doc.pages[1]!,
      layers: {
        ...doc.pages[1]!.layers,
        [sourceOnlyLayer.id]: sourceOnlyLayer,
      },
      layerOrder: [...doc.pages[1]!.layerOrder, sourceOnlyLayer.id],
    };
    const componentDoc: FigmiiDocument = {
      ...doc,
      pages: [pageOne, pageTwo],
      components: {
        'component-page-one': {
          id: 'component-page-one',
          name: 'Page One Component',
          description: '',
          sourceLayerIds: ['external-source'],
        },
        'component-page-two': {
          id: 'component-page-two',
          name: 'Page Two Component',
          description: '',
          sourceLayerIds: [sourceOnlyLayer.id],
        },
      },
    };

    const { blob } = await createExportBundle(componentDoc, {
      designName: 'Circuit',
      selectedPageIds: ['page-one'],
      formats: ['figmii'],
      includeBuffer: false,
      date,
    });

    const zip = await loadZip(blob);
    const pageBase = buildPageExportBaseName('Circuit', 'Page One', date);
    const file = zip.file(`${pageBase}/${pageBase}.figmii`);
    const exportedDoc = JSON.parse(await file!.async('string')) as FigmiiDocument;

    expect(Object.keys(exportedDoc.components)).toEqual(['component-page-one']);
  });

  it('includes rendered buffers in gridspec exports when requested', async () => {
    const date = new Date('2026-04-22T15:30:00Z');
    const doc = makeDocument();
    const { blob } = await createExportBundle(doc, {
      designName: 'Circuit',
      selectedPageIds: ['page-one'],
      formats: ['gridspec'],
      includeBuffer: true,
      date,
    });

    const zip = await loadZip(blob);
    const pageBase = buildPageExportBaseName('Circuit', 'Page One', date);
    const file = zip.file(`${pageBase}/${pageBase}.gridspec.json`);

    expect(file).not.toBeNull();
    const exportedGridSpec = JSON.parse(await file!.async('string')) as {
      pages: Array<{ buffer?: unknown }>;
    };

    expect(exportedGridSpec.pages[0]!.buffer).toBeDefined();
  });
});
