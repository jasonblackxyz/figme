import type { ToolHandler } from './types.ts';
import type { GridPosition } from '@primitives/grid-engine/types.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { boundingRectFromCells, computeExclude } from '@primitives/document-model/regionShape.ts';

let isPainting = false;

function effectiveMode(altKey: boolean, shiftKey: boolean): 'add' | 'erase' {
  const stored = useUiStore.getState().regionPaintMode;
  // Hold Alt to invert temporarily; Shift adds to selection (still 'add')
  if (altKey) return stored === 'add' ? 'erase' : 'add';
  if (shiftKey) return 'add';
  return stored;
}

function paintAt(gridPos: GridPosition, mode: 'add' | 'erase') {
  if (gridPos.row < 0 || gridPos.col < 0) return;
  if (mode === 'add') {
    useUiStore.getState().addRegionDraftCells([gridPos]);
  } else {
    useUiStore.getState().removeRegionDraftCells([gridPos]);
  }
}

function ensureDraftStarted(targetRegionId: string | null) {
  const ui = useUiStore.getState();
  if (ui.regionDraftCells.size === 0 && ui.regionDraftTargetId == null) {
    // Seed from existing region cells when re-painting an existing region
    if (targetRegionId) {
      const docStore = useDocumentStore.getState();
      const doc = docStore.document;
      const page = doc.pages.find((p) => p.id === doc.activePageId);
      const region = page?.regions?.[targetRegionId];
      if (region) {
        const cells: GridPosition[] = [];
        const excluded = new Set(
          (region.shape.exclude ?? []).map((c) => `${c.row},${c.col}`),
        );
        for (let r = region.shape.rect.row; r < region.shape.rect.row + region.shape.rect.height; r++) {
          for (let c = region.shape.rect.col; c < region.shape.rect.col + region.shape.rect.width; c++) {
            if (!excluded.has(`${r},${c}`)) cells.push({ row: r, col: c });
          }
        }
        useUiStore.getState().beginRegionDraft(targetRegionId, cells);
        return;
      }
    }
    useUiStore.getState().beginRegionDraft(targetRegionId);
  }
}

export const regionPaintTool: ToolHandler = {
  cursor: 'crosshair',

  onPointerDown(gridPos: GridPosition, event: PointerEvent) {
    isPainting = true;
    const ui = useUiStore.getState();
    ensureDraftStarted(ui.regionDraftTargetId);
    const mode = effectiveMode(event.altKey, event.shiftKey);
    paintAt(gridPos, mode);
  },

  onPointerMove(gridPos: GridPosition, event: PointerEvent) {
    if (!isPainting) return;
    const mode = effectiveMode(event.altKey, event.shiftKey);
    paintAt(gridPos, mode);
  },

  onPointerUp(_gridPos: GridPosition, _event: PointerEvent) {
    isPainting = false;
  },

  onKeyDown(event: KeyboardEvent) {
    const ui = useUiStore.getState();
    if (event.key === 'Escape') {
      // Cancel draft
      ui.clearRegionDraft();
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter') {
      // Commit current draft → open Label Picker
      const cells = Array.from(ui.regionDraftCells).map((key) => {
        const [row, col] = key.split(',').map(Number);
        return { row: row!, col: col! };
      });
      if (cells.length === 0) return;
      const rect = boundingRectFromCells(cells);
      const exclude = computeExclude(rect, cells);
      ui.openLabelPicker({ rect, exclude, editingRegionId: ui.regionDraftTargetId });
      event.preventDefault();
    }
  },
};
