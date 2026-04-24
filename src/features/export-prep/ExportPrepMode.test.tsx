import { fireEvent, render, screen } from '@testing-library/react';
import { createEmptyDocument, addLayer } from '@primitives/document-model/operations.ts';
import type { BorderBoxProperties } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { ExportPrepMode } from './ExportPrepMode.tsx';

function setupDocument() {
  const doc = createEmptyDocument('Runtime UI');
  const page = doc.pages[0]!;
  const props: BorderBoxProperties = {
    borderStyle: 'rounded',
    padding: { top: 1, right: 1, bottom: 1, left: 1 },
  };
  const updatedPage = addLayer(page, 'border-box', 'Search Input', { col: 2, row: 3, width: 24, height: 3 }, 'border', props);
  const layerId = updatedPage.layerOrder[updatedPage.layerOrder.length - 1]!;
  const updatedDoc = {
    ...doc,
    pages: doc.pages.map((candidate) => candidate.id === page.id ? updatedPage : candidate),
  };
  useDocumentStore.setState({ document: updatedDoc, undoStack: [], redoStack: [] });
  useUiStore.setState({
    selectedLayerIds: [layerId],
    selectedRuntimeAnnotationId: null,
    exportDialogOpen: true,
  });
}

beforeEach(() => {
  setupDocument();
});

describe('ExportPrepMode', () => {
  it('runs inference and creates editable runtime annotations', () => {
    render(<ExportPrepMode visible onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Infer/i }));

    const annotations = Object.values(useDocumentStore.getState().document.runtime?.annotations ?? {});
    expect(annotations.some((annotation) => annotation.semanticId === 'search-input')).toBe(true);
    expect(screen.getByText('search-input')).toBeInTheDocument();
  });

  it('creates and deletes an annotation from the selected layer', () => {
    render(<ExportPrepMode visible onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Region/i }));
    expect(Object.keys(useDocumentStore.getState().document.runtime?.annotations ?? {})).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(Object.keys(useDocumentStore.getState().document.runtime?.annotations ?? {})).toHaveLength(0);
  });
});
