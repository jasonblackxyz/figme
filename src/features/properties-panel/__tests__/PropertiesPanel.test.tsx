import { render, screen } from '@testing-library/react';
import { PropertiesPanel } from '@features/properties-panel/PropertiesPanel.tsx';
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
  const bbLayerId = page.layerOrder[page.layerOrder.length - 1]!;

  const tbProps: TextBlockProperties = {
    content: 'Hello World',
    fontFamily: 'IBM Plex Mono',
    kerning: 0,
    lineSpacing: 0,
    alignment: 'left',
    styleKey: 'text',
  };
  page = addLayer(page, 'text-block', 'Welcome Text', { col: 2, row: 2, width: 16, height: 3 }, 'text', tbProps);
  const tbLayerId = page.layerOrder[page.layerOrder.length - 1]!;

  const updatedDoc = {
    ...doc,
    pages: doc.pages.map(p => p.id === pageId ? page : p),
  };

  useDocumentStore.setState({ document: updatedDoc });

  return { doc: updatedDoc, page, bbLayerId, tbLayerId };
}

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Test'),
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({ selectedLayerIds: [] });
});

describe('PropertiesPanel', () => {
  it('shows "No selection" when nothing selected', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('No selection')).toBeInTheDocument();
    expect(document.querySelector('[data-component="properties-panel"]')).toBeInTheDocument();
  });

  it('shows CommonProperties for selected layer', () => {
    const { bbLayerId } = setupDocWithLayers();
    useUiStore.setState({ selectedLayerIds: [bbLayerId] });

    render(<PropertiesPanel />);
    expect(screen.getByText('Common')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();

    // Check common fields rendered
    const nameInput = screen.getByDisplayValue('Header Box');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('data-property', 'name');
  });

  it('shows BorderBoxProperties for border-box layer', () => {
    const { bbLayerId } = setupDocWithLayers();
    useUiStore.setState({ selectedLayerIds: [bbLayerId] });

    render(<PropertiesPanel />);
    expect(screen.getByText('Border Box')).toBeInTheDocument();

    // Check border style buttons
    expect(screen.getByText('rounded')).toBeInTheDocument();
    expect(screen.getByText('double')).toBeInTheDocument();
    expect(screen.getByText('section')).toBeInTheDocument();
    expect(screen.getByText('custom')).toBeInTheDocument();
  });

  it('shows TextBlockProperties for text-block layer', () => {
    const { tbLayerId } = setupDocWithLayers();
    useUiStore.setState({ selectedLayerIds: [tbLayerId] });

    render(<PropertiesPanel />);
    expect(screen.getByText('Text Block')).toBeInTheDocument();

    // Check text content textarea
    const textarea = screen.getByDisplayValue('Hello World');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('data-property', 'content');

    // Check alignment buttons
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('does not show TextBlockProperties for border-box layer', () => {
    const { bbLayerId } = setupDocWithLayers();
    useUiStore.setState({ selectedLayerIds: [bbLayerId] });

    render(<PropertiesPanel />);
    expect(screen.queryByText('Text Block')).not.toBeInTheDocument();
  });

  it('does not show BorderBoxProperties for text-block layer', () => {
    const { tbLayerId } = setupDocWithLayers();
    useUiStore.setState({ selectedLayerIds: [tbLayerId] });

    render(<PropertiesPanel />);
    expect(screen.queryByText('Border Box')).not.toBeInTheDocument();
  });
});
