import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LabelPicker } from '@features/region-labeling/LabelPicker.tsx';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Test'),
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    selectedRegionId: null,
    regionDraftCells: new Set(['2,2', '2,3', '3,2']),
    regionDraftTargetId: null,
    regionPaintStaysActive: false,
    labelPicker: {
      open: true,
      rect: { col: 2, row: 2, width: 2, height: 2 },
      exclude: [{ row: 3, col: 3 }],
      editingRegionId: null,
    },
  });
  useToolStore.setState({ activeTool: 'region-paint' });
});

describe('LabelPicker', () => {
  it('renders shape summary', () => {
    render(<LabelPicker />);
    const summary = document.querySelector('[data-component="label-picker-shape"]');
    expect(summary?.textContent).toMatch(/Rect: 2,2/);
    expect(summary?.textContent).toMatch(/2.*2/);
    expect(summary?.textContent).toMatch(/1 excluded cells/);
  });

  it('saves a region with selected component kind and semantic id', () => {
    render(<LabelPicker />);
    const kindSelect = document.querySelector('[data-property="componentKind"]') as HTMLSelectElement;
    fireEvent.change(kindSelect, { target: { value: 'button' } });
    const idInput = document.querySelector('[data-property="semanticId"]') as HTMLInputElement;
    fireEvent.change(idInput, { target: { value: 'submit' } });

    fireEvent.click(document.querySelector('[data-action="save"]') as HTMLButtonElement);

    const doc = useDocumentStore.getState().document;
    const page = doc.pages.find((p) => p.id === doc.activePageId)!;
    const regions = Object.values(page.regions ?? {});
    expect(regions).toHaveLength(1);
    expect(regions[0]?.componentKind).toBe('button');
    expect(regions[0]?.semanticId).toBe('submit');
    expect(regions[0]?.shape.rect).toEqual({ col: 2, row: 2, width: 2, height: 2 });
    expect(regions[0]?.shape.exclude).toEqual([{ row: 3, col: 3 }]);
    // Picker closes after save
    expect(useUiStore.getState().labelPicker.open).toBe(false);
  });

  it('cancel closes the picker without creating a region', () => {
    render(<LabelPicker />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(useUiStore.getState().labelPicker.open).toBe(false);
    const doc = useDocumentStore.getState().document;
    const page = doc.pages.find((p) => p.id === doc.activePageId)!;
    expect(Object.keys(page.regions ?? {})).toHaveLength(0);
  });

  it('cancel discards the in-flight draft so subsequent paints start clean', () => {
    // Pre-condition: the beforeEach seeded 3 cells in the draft.
    expect(useUiStore.getState().regionDraftCells.size).toBe(3);

    render(<LabelPicker />);
    fireEvent.click(screen.getByText('Cancel'));

    // After cancel: picker closed AND draft cleared (no phantom cells leaking
    // into the next paint session).
    expect(useUiStore.getState().labelPicker.open).toBe(false);
    expect(useUiStore.getState().regionDraftCells.size).toBe(0);
    expect(useUiStore.getState().regionDraftTargetId).toBeNull();
  });

  it('closing via the × button also clears the draft', () => {
    render(<LabelPicker />);
    fireEvent.click(document.querySelector('[aria-label="Close label picker"]') as HTMLButtonElement);
    expect(useUiStore.getState().labelPicker.open).toBe(false);
    expect(useUiStore.getState().regionDraftCells.size).toBe(0);
  });

  it('rejects invalid props JSON', () => {
    render(<LabelPicker />);
    const propsInput = document.querySelector('[data-property="props"]') as HTMLTextAreaElement;
    fireEvent.change(propsInput, { target: { value: 'not json' } });
    fireEvent.click(document.querySelector('[data-action="save"]') as HTMLButtonElement);
    expect(useUiStore.getState().labelPicker.open).toBe(true); // still open
  });

  it('Save & Label Another keeps tool in region-paint mode', () => {
    render(<LabelPicker />);
    fireEvent.click(screen.getByText('Save & Label Another'));
    expect(useToolStore.getState().activeTool).toBe('region-paint');
  });
});
