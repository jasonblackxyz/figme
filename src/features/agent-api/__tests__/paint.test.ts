import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@stores/documentStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { buildApi } from '../agentApi.ts';
import type { CanvasProperties } from '@primitives/document-model/types.ts';

let api: ReturnType<typeof buildApi>;

describe('paint()', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      document: createEmptyDocument(),
      undoStack: [],
      redoStack: [],
    });
    api = buildApi();
  });

  it('creates a canvas layer from content mode', () => {
    const id = api.paint({ col: 2, row: 3, content: 'ABC\nDEF', color: '#ff0000' });
    expect(id).toBeDefined();

    const layer = api.getLayer(id!);
    expect(layer).toBeDefined();
    expect(layer!.kind).toBe('canvas');
    expect(layer!.rect).toEqual({ col: 2, row: 3, width: 3, height: 2 });

    const props = layer!.properties as CanvasProperties;
    expect(props.content).toBe('ABC\nDEF');
    // All 6 non-space chars should have color overrides
    expect(Object.keys(props.cellColors)).toHaveLength(6);
    expect(props.cellColors['0,0']).toEqual({ color: '#ff0000' });
    expect(props.cellColors['1,2']).toEqual({ color: '#ff0000' });
  });

  it('creates a canvas layer from lines mode', () => {
    const id = api.paint({
      col: 0,
      row: 0,
      lines: [
        [
          { text: '░░░', color: '#3d3a34' },
          { text: '███', color: '#8b3a2a' },
        ],
      ],
    });
    expect(id).toBeDefined();

    const layer = api.getLayer(id!);
    expect(layer!.kind).toBe('canvas');
    expect(layer!.rect.width).toBe(6);
    expect(layer!.rect.height).toBe(1);

    const props = layer!.properties as CanvasProperties;
    expect(props.content).toBe('░░░███');
    expect(props.cellColors['0,0']).toEqual({ color: '#3d3a34' });
    expect(props.cellColors['0,3']).toEqual({ color: '#8b3a2a' });
  });

  it('auto-computes width from longest line', () => {
    const id = api.paint({ col: 0, row: 0, content: 'AB\nCDEF\nGH' });
    const layer = api.getLayer(id!);
    expect(layer!.rect.width).toBe(4);
    expect(layer!.rect.height).toBe(3);
  });

  it('skips cellColors for space characters in lines mode', () => {
    const id = api.paint({
      col: 0,
      row: 0,
      lines: [[{ text: 'A B', color: '#fff' }]],
    });
    const props = api.getLayer(id!)!.properties as CanvasProperties;
    expect(props.cellColors['0,0']).toEqual({ color: '#fff' });
    expect(props.cellColors['0,1']).toBeUndefined(); // space skipped
    expect(props.cellColors['0,2']).toEqual({ color: '#fff' });
  });

  it('inherits fallback color from spec when span omits it', () => {
    const id = api.paint({
      col: 0,
      row: 0,
      color: '#aaa',
      bg: '#111',
      lines: [[{ text: 'X' }, { text: 'Y', color: '#bbb' }]],
    });
    const props = api.getLayer(id!)!.properties as CanvasProperties;
    expect(props.cellColors['0,0']).toEqual({ color: '#aaa', bg: '#111' });
    expect(props.cellColors['0,1']).toEqual({ color: '#bbb', bg: '#111' });
  });

  it('handles empty content string without throwing', () => {
    const id = api.paint({ col: 0, row: 0, content: '' });
    expect(id).toBeDefined();
    const layer = api.getLayer(id!);
    expect(layer!.rect.width).toBe(1); // minimum width
    expect(layer!.rect.height).toBe(1);
  });

  it('throws when neither lines nor content is provided', () => {
    expect(() => api.paint({ col: 0, row: 0 })).toThrow(/provide either/);
  });

  it('supports destructured usage (no this binding)', () => {
    const { paint } = api;
    const id = paint({ col: 0, row: 0, content: 'X', color: '#fff' });
    expect(id).toBeDefined();
    expect(api.getLayer(id!)!.kind).toBe('canvas');
  });

  it('sets custom name when provided', () => {
    const id = api.paint({ name: 'war fog', col: 0, row: 0, content: '░▒▓' });
    expect(api.getLayer(id!)!.name).toBe('war fog');
  });

  it('defaults name to canvas when not provided', () => {
    const id = api.paint({ col: 0, row: 0, content: '░▒▓' });
    expect(api.getLayer(id!)!.name).toBe('canvas');
  });
});
