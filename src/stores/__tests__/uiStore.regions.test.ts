import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@stores/uiStore.ts';

beforeEach(() => {
  useUiStore.setState({
    selectedLayerIds: [],
    selectedRegionId: null,
    canvasSelectionMode: 'layers',
    regionOverlayVisible: true,
    regionPaintMode: 'add',
    regionPaintStaysActive: false,
    regionDraftCells: new Set(),
    regionDraftTargetId: null,
    labelPicker: { open: false, rect: null, exclude: [], editingRegionId: null },
  });
});

describe('uiStore — region labeling state', () => {
  it('toggles selection mode and clears region selection on layer mode', () => {
    useUiStore.getState().setSelectedRegion('r1');
    useUiStore.getState().toggleCanvasSelectionMode();
    expect(useUiStore.getState().canvasSelectionMode).toBe('regions');
    useUiStore.getState().toggleCanvasSelectionMode();
    expect(useUiStore.getState().canvasSelectionMode).toBe('layers');
    expect(useUiStore.getState().selectedRegionId).toBeNull();
  });

  it('beginRegionDraft seeds initial cells and sets target', () => {
    useUiStore.getState().beginRegionDraft('r1', [{ row: 1, col: 1 }, { row: 1, col: 2 }]);
    const state = useUiStore.getState();
    expect(state.regionDraftTargetId).toBe('r1');
    expect(state.regionDraftCells.has('1,1')).toBe(true);
    expect(state.regionDraftCells.has('1,2')).toBe(true);
  });

  it('addRegionDraftCells extends the draft', () => {
    useUiStore.getState().beginRegionDraft(null);
    useUiStore.getState().addRegionDraftCells([{ row: 0, col: 0 }, { row: 0, col: 1 }]);
    expect(useUiStore.getState().regionDraftCells.size).toBe(2);
  });

  it('removeRegionDraftCells removes cells', () => {
    useUiStore.setState({ regionDraftCells: new Set(['0,0', '0,1']), regionDraftTargetId: null });
    useUiStore.getState().removeRegionDraftCells([{ row: 0, col: 1 }]);
    expect(useUiStore.getState().regionDraftCells.has('0,1')).toBe(false);
    expect(useUiStore.getState().regionDraftCells.has('0,0')).toBe(true);
  });

  it('openLabelPicker / closeLabelPicker mutate dialog state', () => {
    useUiStore.getState().openLabelPicker({
      rect: { col: 0, row: 0, width: 4, height: 2 },
      exclude: [{ row: 1, col: 1 }],
      editingRegionId: 'r9',
    });
    let picker = useUiStore.getState().labelPicker;
    expect(picker.open).toBe(true);
    expect(picker.rect).toEqual({ col: 0, row: 0, width: 4, height: 2 });
    expect(picker.exclude).toEqual([{ row: 1, col: 1 }]);
    expect(picker.editingRegionId).toBe('r9');

    useUiStore.getState().closeLabelPicker();
    picker = useUiStore.getState().labelPicker;
    expect(picker.open).toBe(false);
    expect(picker.rect).toBeNull();
  });

  it('toggleRegionPaintMode switches between add and erase', () => {
    expect(useUiStore.getState().regionPaintMode).toBe('add');
    useUiStore.getState().toggleRegionPaintMode();
    expect(useUiStore.getState().regionPaintMode).toBe('erase');
    useUiStore.getState().toggleRegionPaintMode();
    expect(useUiStore.getState().regionPaintMode).toBe('add');
  });
});
