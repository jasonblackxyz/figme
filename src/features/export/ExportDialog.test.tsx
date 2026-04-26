import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FigmiiDocument, FigmiiPage } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { ExportDialog } from './ExportDialog.tsx';
import { createExportBundle } from './exportBundle.ts';
import { downloadBlob } from './downloadBlob.ts';

vi.mock('./exportBundle.ts', () => ({
  createExportBundle: vi.fn(),
}));

vi.mock('./downloadBlob.ts', () => ({
  downloadBlob: vi.fn(),
}));

function makeDocument(name = 'Starter Kit'): FigmiiDocument {
  const base = createEmptyDocument(name);
  const secondBase = createEmptyDocument('Second');

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
    name,
    pages: [pageOne, pageTwo],
    activePageId: pageOne.id,
  };
}

function makeDesignPackageDocument(): FigmiiDocument {
  const doc = makeDocument();
  const pageOne = doc.pages[0]!;
  return {
    ...doc,
    pages: [
      {
        ...pageOne,
        runtime: { ...pageOne.runtime, screenId: 'search' },
        regions: {
          search: {
            id: 'search',
            semanticId: 'search',
            componentKind: 'text-input',
            shape: { rect: { col: 2, row: 2, width: 20, height: 3 } },
            bindings: [{ slot: 'value', path: 'search.query', fallback: '' }],
            interactions: [{ id: 'submitSearch', action: { kind: 'submitQuery', target: 'search' } }],
          },
        },
        regionOrder: ['search'],
      },
      doc.pages[1]!,
    ],
  };
}

describe('ExportDialog', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      document: makeDocument(),
      undoStack: [],
      redoStack: [],
    });
    vi.mocked(createExportBundle).mockReset();
    vi.mocked(downloadBlob).mockReset();
    vi.mocked(createExportBundle).mockResolvedValue({
      blob: new Blob(['zip-bytes'], { type: 'application/zip' }),
      filename: 'Starter Kit_export_22-04-2026.zip',
    });
  });

  it('defaults to all pages and all formats selected', async () => {
    const onClose = vi.fn();
    render(<ExportDialog visible onClose={onClose} />);

    expect(screen.getByLabelText('PNG Image')).toBeChecked();
    expect(screen.getByLabelText('HTML')).toBeChecked();
    expect(screen.getByLabelText('JSON (.figmii)')).toBeChecked();
    expect(screen.getByLabelText('Grid Spec (.gridspec.json)')).toBeChecked();
    expect(screen.getByLabelText('Spec Markdown')).toBeChecked();
    expect(screen.getByLabelText('Page One')).toBeChecked();
    expect(screen.getByLabelText('Page Two')).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Export zip' }));

    await waitFor(() => {
      expect(createExportBundle).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Starter Kit' }),
        expect.objectContaining({
          designName: 'Starter Kit',
          selectedPageIds: ['page-one', 'page-two'],
          formats: ['png', 'html', 'figmii', 'gridspec', 'markdown'],
          includeBuffer: false,
        }),
      );
    });
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Starter Kit_export_22-04-2026.zip');
    expect(onClose).toHaveBeenCalled();
  });

  it('lets the user narrow formats and pages before exporting', async () => {
    render(<ExportDialog visible onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Design name'), {
      target: { value: 'Circuit Kit' },
    });
    fireEvent.click(screen.getByLabelText('Spec Markdown'));
    fireEvent.click(screen.getByLabelText('Page One'));
    fireEvent.click(screen.getByRole('button', { name: 'Export zip' }));

    await waitFor(() => {
      expect(createExportBundle).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Starter Kit' }),
        expect.objectContaining({
          designName: 'Circuit Kit',
          selectedPageIds: ['page-two'],
          formats: ['png', 'html', 'figmii', 'gridspec'],
          includeBuffer: false,
        }),
      );
    });

    await waitFor(() => {
      expect(useDocumentStore.getState().document.name).toBe('Circuit Kit');
    });
  });

  it('exports a selected page as a Design Package JSON file', async () => {
    useDocumentStore.setState({
      document: makeDesignPackageDocument(),
      undoStack: [],
      redoStack: [],
    });
    const onClose = vi.fn();
    render(<ExportDialog visible onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Page Two'));
    fireEvent.click(screen.getByLabelText('Include render oracle in Design Package'));
    fireEvent.click(screen.getByRole('button', { name: 'Design Package (.design-package.json)' }));

    await waitFor(() => {
      expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Starter Kit.design-package.json');
    });
    expect(onClose).toHaveBeenCalled();
  });
});
