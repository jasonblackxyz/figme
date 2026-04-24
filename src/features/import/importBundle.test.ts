import JSZip from 'jszip';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FigmiiDocument } from '@primitives/document-model/types.ts';
import { importFigmeDirectoryFiles, importFigmeZipFile } from './importBundle.ts';

function makeDoc(name: string, pageName: string): FigmiiDocument {
  const doc = createEmptyDocument(name);
  const page = doc.pages[0]!;

  return {
    ...doc,
    pages: [{ ...page, id: `${name}-page`, name: pageName }],
    activePageId: `${name}-page`,
  };
}

function makeFigmiiFile(filename: string, doc: FigmiiDocument, relativePath?: string): File {
  const file = new File([JSON.stringify(doc)], filename, { type: 'application/json' });
  if (relativePath) {
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: relativePath,
    });
  }
  return file;
}

describe('importBundle helpers', () => {
  it('imports .figmii files from nested zip folders in file order', async () => {
    const zip = new JSZip();
    zip.file('bundle/circuit/page-a.figmii', JSON.stringify(makeDoc('First', 'Page A')));
    zip.file('bundle/circuit/page-b.figmii', JSON.stringify(makeDoc('Second', 'Page B')));
    zip.file('bundle/circuit/readme.txt', 'ignore me');

    const blob = await zip.generateAsync({ type: 'arraybuffer' });
    const file = new File([blob], 'bundle.zip', { type: 'application/zip' });
    const docs = await importFigmeZipFile(file);

    expect(docs).toHaveLength(2);
    expect(docs[0]!.pages[0]!.name).toBe('Page A');
    expect(docs[1]!.pages[0]!.name).toBe('Page B');
  });

  it('imports multiple .figmii files from a folder selection in path order', async () => {
    const docs = await importFigmeDirectoryFiles([
      makeFigmiiFile('beta.figmii', makeDoc('Second', 'Beta'), 'bundle/beta.figmii'),
      makeFigmiiFile('alpha.figmii', makeDoc('First', 'Alpha'), 'bundle/alpha.figmii'),
      new File(['ignored'], 'notes.txt', { type: 'text/plain' }),
    ]);

    expect(docs).toHaveLength(2);
    expect(docs[0]!.pages[0]!.name).toBe('Alpha');
    expect(docs[1]!.pages[0]!.name).toBe('Beta');
  });

  it('still imports legacy .figme files', async () => {
    const zip = new JSZip();
    zip.file('bundle/legacy/page-a.figme', JSON.stringify(makeDoc('First', 'Legacy Page')));
    const blob = await zip.generateAsync({ type: 'arraybuffer' });
    const file = new File([blob], 'bundle.zip', { type: 'application/zip' });

    const docs = await importFigmeZipFile(file);

    expect(docs).toHaveLength(1);
    expect(docs[0]!.pages[0]!.name).toBe('Legacy Page');
  });

  it('fails when a zip archive has no .figme files', async () => {
    const zip = new JSZip();
    zip.file('bundle/readme.txt', 'no documents here');
    const blob = await zip.generateAsync({ type: 'arraybuffer' });
    const file = new File([blob], 'bundle.zip', { type: 'application/zip' });

    await expect(importFigmeZipFile(file)).rejects.toThrow(
      'No .figmii or .figme files were found in the selected zip archive.',
    );
  });
});
