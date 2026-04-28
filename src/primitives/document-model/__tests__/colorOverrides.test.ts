import { describe, it, expect } from 'vitest';
import { computeColorOverrides } from '../colorOverrides.ts';
import { createEmptyPage } from '../operations.ts';
import type { FIGMIIPage, Layer } from '../types.ts';

function makeLayer(overrides: Partial<Layer>): Layer {
  return {
    id: `layer_${Date.now()}`,
    name: 'Test Layer',
    kind: 'border-box',
    rect: { col: 0, row: 0, width: 2, height: 2 },
    styleKey: 'border',
    visible: true,
    locked: false,
    opacity: 1,
    properties: {},
    ...overrides,
  };
}

function pageWithLayers(layers: Layer[], pageOverrides?: Partial<FIGMIIPage>): FIGMIIPage {
  const page = createEmptyPage('Test');
  for (const layer of layers) {
    page.layers[layer.id] = layer;
    page.layerOrder.push(layer.id);
  }
  return { ...page, ...pageOverrides };
}

describe('computeColorOverrides', () => {
  it('returns empty map for a page with no layers or overrides', () => {
    const page = createEmptyPage();
    expect(computeColorOverrides(page)).toEqual({});
  });

  it('applies page-level cellColorOverrides as bg entries', () => {
    const page = createEmptyPage();
    page.cellColorOverrides = {
      '0,0': '#ff0000',
      '1,2': '#00ff00',
    };

    const result = computeColorOverrides(page);
    expect(result['0,0']).toEqual({ bg: '#ff0000' });
    expect(result['1,2']).toEqual({ bg: '#00ff00' });
  });

  it('fills entire rect with layer customColors', () => {
    const layer = makeLayer({
      id: 'l1',
      rect: { col: 1, row: 1, width: 2, height: 2 },
      customColors: { bg: '#ff00ff' },
    });
    const page = pageWithLayers([layer]);

    const result = computeColorOverrides(page);
    expect(result['1,1']).toEqual({ bg: '#ff00ff' });
    expect(result['1,2']).toEqual({ bg: '#ff00ff' });
    expect(result['2,1']).toEqual({ bg: '#ff00ff' });
    expect(result['2,2']).toEqual({ bg: '#ff00ff' });
    // Outside the rect
    expect(result['0,0']).toBeUndefined();
    expect(result['3,3']).toBeUndefined();
  });

  it('supports customColors with both color and bg', () => {
    const layer = makeLayer({
      id: 'l1',
      rect: { col: 0, row: 0, width: 1, height: 1 },
      customColors: { color: '#111', bg: '#222' },
    });
    const page = pageWithLayers([layer]);

    const result = computeColorOverrides(page);
    expect(result['0,0']).toEqual({ color: '#111', bg: '#222' });
  });

  it('converts layer cellColorOverrides from relative to absolute coords', () => {
    const layer = makeLayer({
      id: 'l1',
      rect: { col: 5, row: 10, width: 3, height: 3 },
      cellColorOverrides: {
        '0,0': '#aaa',
        '1,2': '#bbb',
      },
    });
    const page = pageWithLayers([layer]);

    const result = computeColorOverrides(page);
    expect(result['10,5']).toEqual({ bg: '#aaa' });
    expect(result['11,7']).toEqual({ bg: '#bbb' });
  });

  it('skips hidden layers', () => {
    const layer = makeLayer({
      id: 'l1',
      visible: false,
      customColors: { bg: '#ff0000' },
    });
    const page = pageWithLayers([layer]);

    expect(computeColorOverrides(page)).toEqual({});
  });

  it('later layers in layerOrder overwrite earlier ones', () => {
    const bottom = makeLayer({
      id: 'l_bottom',
      rect: { col: 0, row: 0, width: 2, height: 2 },
      customColors: { bg: '#111' },
    });
    const top = makeLayer({
      id: 'l_top',
      rect: { col: 0, row: 0, width: 2, height: 2 },
      customColors: { bg: '#222' },
    });
    const page = pageWithLayers([bottom, top]);

    const result = computeColorOverrides(page);
    expect(result['0,0']!.bg).toBe('#222');
    expect(result['1,1']!.bg).toBe('#222');
  });

  it('merges customColors and cellColorOverrides within a layer', () => {
    const layer = makeLayer({
      id: 'l1',
      rect: { col: 0, row: 0, width: 3, height: 3 },
      customColors: { bg: '#aaa' },
      cellColorOverrides: {
        '1,1': '#bbb',
      },
    });
    const page = pageWithLayers([layer]);

    const result = computeColorOverrides(page);
    // All cells get customColors bg
    expect(result['0,0']!.bg).toBe('#aaa');
    // Cell 1,1 (absolute 1,1) gets cellColorOverrides bg on top
    expect(result['1,1']!.bg).toBe('#bbb');
    // Other cells still have customColors
    expect(result['2,2']!.bg).toBe('#aaa');
  });

  it('page-level overrides sit below layer overrides', () => {
    const page = createEmptyPage();
    page.cellColorOverrides = { '0,0': '#page_bg' };

    const layer = makeLayer({
      id: 'l1',
      rect: { col: 0, row: 0, width: 1, height: 1 },
      customColors: { bg: '#layer_bg' },
    });
    page.layers[layer.id] = layer;
    page.layerOrder.push(layer.id);

    const result = computeColorOverrides(page);
    expect(result['0,0']!.bg).toBe('#layer_bg');
  });
});
