import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { buildApi } from '../agentApi.ts';

let api: ReturnType<typeof buildApi>;

describe('page canvas size API', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      document: createEmptyDocument(),
      undoStack: [],
      redoStack: [],
    });
    useUiStore.setState({ interfaceMode: 'ai' });
    api = buildApi();
  });

  it('reports the default canvas size for the active page', () => {
    const info = api.getPageCanvasSize();

    expect(info).toMatchObject({
      defaultCols: 228,
      defaultRows: 57,
      effectiveCols: 228,
      effectiveRows: 57,
      isOverridden: false,
    });
  });

  it('sets and resets the page canvas size explicitly', () => {
    const updated = api.setPageCanvasSize({ cols: 300, rows: 80 });
    expect(updated).toMatchObject({
      effectiveCols: 300,
      effectiveRows: 80,
      isOverridden: true,
    });

    const page = api.getActivePage()!;
    expect(page.canvasColsOverride).toBe(300);
    expect(page.canvasRowsOverride).toBe(80);

    const reset = api.resetPageCanvasSize();
    expect(reset).toMatchObject({
      effectiveCols: 228,
      effectiveRows: 57,
      isOverridden: false,
    });

    const resetPage = api.getActivePage()!;
    expect(resetPage.canvasColsOverride).toBeUndefined();
    expect(resetPage.canvasRowsOverride).toBeUndefined();
  });

  it('rejects invalid canvas dimensions', () => {
    expect(() => api.setPageCanvasSize({ cols: 0, rows: 57 })).toThrow(/positive integer/i);
    expect(() => api.setPageCanvasSize({ cols: 228, rows: -1 })).toThrow(/positive integer/i);
    expect(() => api.setPageCanvasSize({ cols: 228.5, rows: 57 })).toThrow(/positive integer/i);
  });

  it('rejects shrinking smaller than visible content unless clipping is allowed', () => {
    api.paint({ col: 0, row: 0, content: 'ABCDE\nFGHIJ' });

    expect(() => api.setPageCanvasSize({ cols: 4, rows: 2 })).toThrow(/would clip visible content \(5x2\)/i);
  });

  it('allows clipping when explicitly requested', () => {
    api.paint({ col: 0, row: 0, content: 'ABCDE\nFGHIJ' });

    const resized = api.setPageCanvasSize({ cols: 4, rows: 1, allowClip: true });
    expect(resized).toMatchObject({
      effectiveCols: 4,
      effectiveRows: 1,
      isOverridden: true,
    });
    expect(api.export.toAscii()).toBe('ABCD');
  });

  it('does not let paint() implicitly redefine the page size', () => {
    api.paint({ col: 0, row: 0, content: 'X'.repeat(300) });

    const info = api.getPageCanvasSize();
    expect(info).toMatchObject({
      effectiveCols: 228,
      effectiveRows: 57,
      isOverridden: false,
    });
  });
});
