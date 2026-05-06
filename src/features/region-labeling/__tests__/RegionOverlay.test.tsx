import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { RegionOverlay } from '@features/region-labeling/RegionOverlay.tsx';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { createEmptyDocument, addRegion } from '@primitives/document-model/operations.ts';

const gridConfig = { cellWidth: 10, cellHeight: 18 } as const;

function setupDocWithRegions() {
  const doc = createEmptyDocument('Test');
  const pageId = doc.activePageId;
  let page = doc.pages.find((p) => p.id === pageId)!;
  page = addRegion(page, {
    id: 'r1',
    componentKind: 'frame',
    semanticId: 'header',
    shape: { rect: { col: 0, row: 0, width: 10, height: 3 } },
  });
  page = addRegion(page, {
    id: 'r2',
    componentKind: 'button',
    semanticId: 'submit',
    shape: { rect: { col: 5, row: 1, width: 3, height: 1 } },
    z: 2,
  });
  const updatedDoc = {
    ...doc,
    pages: doc.pages.map((p) => (p.id === pageId ? page : p)),
  };
  useDocumentStore.setState({ document: updatedDoc });
  return updatedDoc;
}

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Test'),
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    selectedLayerIds: [],
    selectedRegionId: null,
    canvasSelectionMode: 'layers',
    regionOverlayVisible: true,
    regionDraftCells: new Set(),
    regionDraftTargetId: null,
  });
  useToolStore.setState({ activeTool: 'select' });
});

describe('RegionOverlay', () => {
  it('renders a button per region with kind + semanticId label', () => {
    setupDocWithRegions();
    render(<RegionOverlay gridConfig={gridConfig as never} panX={0} panY={0} />);
    expect(screen.getByLabelText(/Region header · frame/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Region submit · button/)).toBeInTheDocument();
  });

  it('regions are not clickable when not in regions mode and not in paint tool', () => {
    setupDocWithRegions();
    render(<RegionOverlay gridConfig={gridConfig as never} panX={0} panY={0} />);
    const button = screen.getByLabelText(/Region header · frame/);
    fireEvent.click(button);
    expect(useUiStore.getState().selectedRegionId).toBeNull();
  });

  it('clicking a region selects it in regions mode', () => {
    setupDocWithRegions();
    useUiStore.setState({ canvasSelectionMode: 'regions' });
    render(<RegionOverlay gridConfig={gridConfig as never} panX={0} panY={0} />);
    fireEvent.click(screen.getByLabelText(/Region submit · button/));
    expect(useUiStore.getState().selectedRegionId).toBe('r2');
  });

  it('renders draft cells when paint tool is active', () => {
    useToolStore.setState({ activeTool: 'region-paint' });
    useUiStore.setState({
      regionDraftCells: new Set(['2,2', '2,3']),
      regionDraftTargetId: null,
    });
    const { container } = render(
      <RegionOverlay gridConfig={gridConfig as never} panX={0} panY={0} />,
    );
    const drafts = container.querySelectorAll('[data-region-draft-cell="true"]');
    expect(drafts).toHaveLength(2);
  });

  it('hides regions when overlay toggle is off and paint tool inactive', () => {
    setupDocWithRegions();
    useUiStore.setState({ regionOverlayVisible: false });
    render(<RegionOverlay gridConfig={gridConfig as never} panX={0} panY={0} />);
    expect(screen.queryByLabelText(/Region header/)).not.toBeInTheDocument();
  });
});
