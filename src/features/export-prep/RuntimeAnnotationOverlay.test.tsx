import { fireEvent, render, screen } from '@testing-library/react';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { RuntimeAnnotationOverlay } from './RuntimeAnnotationOverlay.tsx';

describe('RuntimeAnnotationOverlay', () => {
  it('renders regions and selects the clicked top-level region', () => {
    const doc = createEmptyDocument('Overlay Regions');
    const page = doc.pages[0]!;
    useDocumentStore.setState({
      document: {
        ...doc,
        pages: [{
          ...page,
          regions: {
            search: {
              id: 'search',
              semanticId: 'search-input',
              componentKind: 'text-input',
              shape: { rect: { col: 2, row: 3, width: 20, height: 3 } },
            },
          },
          regionOrder: ['search'],
        }],
      },
      undoStack: [],
      redoStack: [],
    });
    useUiStore.setState({
      exportDialogOpen: true,
      selectedRegionId: null,
      selectedRuntimeAnnotationId: null,
    });

    render(<RuntimeAnnotationOverlay gridConfig={doc.gridConfig} panX={0} panY={0} />);

    const button = screen.getByRole('button', { name: 'Runtime region search-input' });
    expect(button).toHaveAttribute('data-runtime-region-id', 'search');
    expect(button).toHaveAttribute('data-component-kind', 'text-input');

    fireEvent.click(button);

    expect(useUiStore.getState().selectedRegionId).toBe('search');
  });
});
