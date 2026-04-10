import { render, screen } from '@testing-library/react';
import { LayersPanel } from '@features/layers-panel/LayersPanel.tsx';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { addLayer, createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { BorderBoxProperties, TextBlockProperties } from '@primitives/document-model/types.ts';

function setupDocWithLayers() {
  const doc = createEmptyDocument('Test Doc');
  const pageId = doc.activePageId;
  let page = doc.pages.find(p => p.id === pageId)!;

  const bbProps: BorderBoxProperties = {
    borderStyle: 'rounded',
    padding: { top: 1, right: 1, bottom: 1, left: 1 },
  };
  page = addLayer(page, 'border-box', 'Header Box', { col: 0, row: 0, width: 20, height: 5 }, 'border', bbProps);

  const tbProps: TextBlockProperties = {
    content: 'Hello',
    fontFamily: 'IBM Plex Mono',
    kerning: 0,
    lineSpacing: 0,
    alignment: 'left',
    styleKey: 'text',
  };
  page = addLayer(page, 'text-block', 'Welcome Text', { col: 2, row: 2, width: 16, height: 3 }, 'text', tbProps);

  const updatedDoc = {
    ...doc,
    pages: doc.pages.map(p => p.id === pageId ? page : p),
  };

  useDocumentStore.setState({ document: updatedDoc });
  useUiStore.setState({ selectedLayerIds: [] });

  return { doc: updatedDoc, page };
}

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Test'),
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({ selectedLayerIds: [] });
});

describe('LayersPanel', () => {
  it('renders empty when no layers', () => {
    render(<LayersPanel />);
    const tree = screen.getByRole('tree');
    expect(tree).toBeInTheDocument();
    // createEmptyPage() always includes a Background group layer
    expect(tree.children).toHaveLength(1);
    const items = screen.getAllByRole('treeitem');
    expect(items[0]).toHaveAttribute('aria-label', 'Background');
  });

  it('renders layer rows for each layer in correct order', () => {
    const { page } = setupDocWithLayers();
    render(<LayersPanel />);

    const items = screen.getAllByRole('treeitem');
    // 2 user layers + 1 Background layer
    expect(items).toHaveLength(3);

    // Reversed order: last added (Welcome Text) appears first, Background last
    expect(items[0]).toHaveAttribute('aria-label', 'Welcome Text');
    expect(items[1]).toHaveAttribute('aria-label', 'Header Box');
    expect(items[2]).toHaveAttribute('aria-label', 'Background');

    // Verify layer order matches reverse of layerOrder
    // layerOrder is [bgId, headerId, textId], reversed display: [textId, headerId, bgId]
    const firstId = items[0]!.getAttribute('data-layer-id');
    const secondId = items[1]!.getAttribute('data-layer-id');
    expect(firstId).toBe(page.layerOrder[2]);
    expect(secondId).toBe(page.layerOrder[1]);
  });

  it('has correct aria attributes', () => {
    setupDocWithLayers();
    render(<LayersPanel />);

    const tree = screen.getByRole('tree');
    expect(tree).toHaveAttribute('aria-label', 'Layers');

    const items = screen.getAllByRole('treeitem');
    expect(items[0]).toHaveAttribute('aria-selected', 'false');
    expect(items[1]).toHaveAttribute('aria-selected', 'false');
    expect(items[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('marks selected layers with aria-selected', () => {
    const { page } = setupDocWithLayers();
    // layerOrder[0] is Background; select first user layer (Header Box) at index 1
    const headerLayerId = page.layerOrder[1]!;
    useUiStore.setState({ selectedLayerIds: [headerLayerId] });

    render(<LayersPanel />);
    const items = screen.getAllByRole('treeitem');

    // layerOrder is [bgId, headerId, textId], reversed display: [textId, headerId, bgId]
    // Header Box is items[1] in display
    expect(items[1]).toHaveAttribute('aria-selected', 'true');
    expect(items[0]).toHaveAttribute('aria-selected', 'false');
    expect(items[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('renders correct data attributes', () => {
    setupDocWithLayers();
    render(<LayersPanel />);

    const items = screen.getAllByRole('treeitem');
    // Welcome Text (text-block) is first in display order
    expect(items[0]).toHaveAttribute('data-layer-kind', 'text-block');
    expect(items[0]!.getAttribute('data-layer-id')).toBeTruthy();

    // Header Box (border-box) is second in display order
    expect(items[1]).toHaveAttribute('data-layer-kind', 'border-box');
    expect(items[1]!.getAttribute('data-layer-id')).toBeTruthy();
  });

  it('renders the panel with data-component attribute', () => {
    render(<LayersPanel />);
    const panel = document.querySelector('[data-component="layers-panel"]');
    expect(panel).toBeInTheDocument();
  });
});
