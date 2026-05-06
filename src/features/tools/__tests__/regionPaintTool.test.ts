import { describe, it, expect, beforeEach } from 'vitest';
import { regionPaintTool } from '@features/tools/regionPaintTool.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

function fakePointerEvent(opts: { altKey?: boolean; shiftKey?: boolean } = {}): PointerEvent {
  return {
    altKey: !!opts.altKey,
    shiftKey: !!opts.shiftKey,
    preventDefault: () => {},
  } as unknown as PointerEvent;
}

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument(),
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    regionPaintMode: 'add',
    regionDraftCells: new Set(),
    regionDraftTargetId: null,
    labelPicker: { open: false, rect: null, exclude: [], editingRegionId: null },
  });
});

describe('regionPaintTool', () => {
  it('adds cells on pointerDown + pointerMove in add mode', () => {
    regionPaintTool.onPointerDown({ col: 2, row: 2 }, fakePointerEvent());
    regionPaintTool.onPointerMove({ col: 3, row: 2 }, fakePointerEvent());
    regionPaintTool.onPointerMove({ col: 4, row: 2 }, fakePointerEvent());
    regionPaintTool.onPointerUp({ col: 4, row: 2 }, fakePointerEvent());

    const draft = useUiStore.getState().regionDraftCells;
    expect(draft.size).toBe(3);
    expect(draft.has('2,2')).toBe(true);
    expect(draft.has('2,3')).toBe(true);
    expect(draft.has('2,4')).toBe(true);
  });

  it('erases cells in erase mode', () => {
    useUiStore.setState({
      regionDraftCells: new Set(['1,1', '1,2', '1,3']),
      regionDraftTargetId: 'r1',
      regionPaintMode: 'erase',
    });
    regionPaintTool.onPointerDown({ col: 2, row: 1 }, fakePointerEvent());
    const draft = useUiStore.getState().regionDraftCells;
    expect(draft.has('1,2')).toBe(false);
    expect(draft.has('1,1')).toBe(true);
    expect(draft.has('1,3')).toBe(true);
  });

  it('alt key inverts the current paint mode', () => {
    useUiStore.setState({
      regionDraftCells: new Set(['1,1', '1,2']),
      regionDraftTargetId: 'r1',
      regionPaintMode: 'add',
    });
    regionPaintTool.onPointerDown({ col: 1, row: 1 }, fakePointerEvent({ altKey: true }));
    expect(useUiStore.getState().regionDraftCells.has('1,1')).toBe(false);
  });

  it('Enter opens the label picker with the current draft bounds', () => {
    useUiStore.setState({
      regionDraftCells: new Set(['2,2', '2,3', '3,2']),
      regionDraftTargetId: null,
    });
    const event = {
      key: 'Enter',
      preventDefault: () => {},
    } as unknown as KeyboardEvent;
    regionPaintTool.onKeyDown!(event);

    const picker = useUiStore.getState().labelPicker;
    expect(picker.open).toBe(true);
    expect(picker.rect).toEqual({ col: 2, row: 2, width: 2, height: 2 });
    // (3,3) cell is missing → excluded
    expect(picker.exclude).toEqual([{ row: 3, col: 3 }]);
  });

  it('Escape clears the draft', () => {
    useUiStore.setState({
      regionDraftCells: new Set(['1,1']),
      regionDraftTargetId: null,
    });
    const event = {
      key: 'Escape',
      preventDefault: () => {},
    } as unknown as KeyboardEvent;
    regionPaintTool.onKeyDown!(event);
    expect(useUiStore.getState().regionDraftCells.size).toBe(0);
  });
});
