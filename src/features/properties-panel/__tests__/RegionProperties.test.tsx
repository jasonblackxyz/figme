import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PropertiesPanel } from '@features/properties-panel/PropertiesPanel.tsx';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { addRegion, createEmptyDocument } from '@primitives/document-model/operations.ts';

function setupRegion() {
  const doc = createEmptyDocument('Test');
  const pageId = doc.activePageId;
  let page = doc.pages.find((p) => p.id === pageId)!;
  page = addRegion(page, {
    id: 'r1',
    componentKind: 'text-input',
    semanticId: 'search',
    shape: { rect: { col: 0, row: 0, width: 20, height: 3 } },
  });
  const updated = { ...doc, pages: doc.pages.map((p) => (p.id === pageId ? page : p)) };
  useDocumentStore.setState({ document: updated, undoStack: [], redoStack: [] });
}

beforeEach(() => {
  setupRegion();
  useUiStore.setState({
    selectedLayerIds: [],
    selectedRegionId: 'r1',
    canvasSelectionMode: 'regions',
  });
  useToolStore.setState({ activeTool: 'select' });
});

describe('RegionProperties section', () => {
  it('renders the region section with current kind', () => {
    render(<PropertiesPanel />);
    expect(document.querySelector('[data-component="region-properties"]')).toBeInTheDocument();
    const kindSelect = document.querySelector('[data-property="componentKind"]') as HTMLSelectElement;
    expect(kindSelect.value).toBe('text-input');
  });

  it('shows validation diagnostic when text-input lacks value binding', () => {
    render(<PropertiesPanel />);
    const validation = document.querySelector('[data-component="region-validation"]');
    expect(validation?.textContent).toMatch(/binding with slot "value"/);
  });

  it('updating component kind persists to the store', () => {
    render(<PropertiesPanel />);
    const kindSelect = document.querySelector('[data-property="componentKind"]') as HTMLSelectElement;
    fireEvent.change(kindSelect, { target: { value: 'button' } });
    const region = useDocumentStore
      .getState()
      .document.pages[0]!.regions!['r1'];
    expect(region!.componentKind).toBe('button');
  });

  it('adding a binding via the inline editor persists', () => {
    render(<PropertiesPanel />);
    const slotInput = document.querySelector('[data-property="binding-new-slot"]') as HTMLInputElement;
    const pathInput = document.querySelector('[data-property="binding-new-path"]') as HTMLInputElement;
    fireEvent.change(slotInput, { target: { value: 'value' } });
    fireEvent.change(pathInput, { target: { value: 'search.query' } });
    fireEvent.click(document.querySelector('[data-action="add-binding"]') as HTMLButtonElement);

    const region = useDocumentStore.getState().document.pages[0]!.regions!['r1'];
    expect(region?.bindings).toEqual([{ slot: 'value', path: 'search.query' }]);
  });

  it('Delete region clears the selection and removes the region', () => {
    render(<PropertiesPanel />);
    fireEvent.click(document.querySelector('[data-action="delete-region"]') as HTMLButtonElement);
    expect(useDocumentStore.getState().document.pages[0]!.regions?.r1).toBeUndefined();
    expect(useUiStore.getState().selectedRegionId).toBeNull();
  });
});

describe('PageRuntimeProperties section', () => {
  beforeEach(() => {
    useUiStore.setState({ selectedRegionId: null, canvasSelectionMode: 'layers' });
  });

  it('shows page runtime fields when nothing else is selected', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('Page Runtime')).toBeInTheDocument();
    const screenIdInput = document.querySelector('[data-property="screenId"]') as HTMLInputElement;
    expect(screenIdInput).toBeInTheDocument();
  });

  it('updating screenId persists to active page runtime', () => {
    render(<PropertiesPanel />);
    const input = document.querySelector('[data-property="screenId"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'home' } });
    const page = useDocumentStore.getState().document.pages[0]!;
    expect(page.runtime?.screenId).toBe('home');
  });
});
