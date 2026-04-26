import {
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hexToHsv,
  hsvToHex,
  isValidHex,
  extractDocumentColors,
} from '../conversions.ts';
import type { FIGMIIPage } from '@primitives/document-model/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';

describe('hexToRgb', () => {
  it('converts black', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('converts white', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('converts a color', () => {
    expect(hexToRgb('#ff8040')).toEqual({ r: 255, g: 128, b: 64 });
  });
});

describe('rgbToHex', () => {
  it('converts to lowercase hex', () => {
    expect(rgbToHex({ r: 255, g: 128, b: 64 })).toBe('#ff8040');
  });
  it('clamps values', () => {
    expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
  });
});

describe('rgbToHsv / hsvToRgb round-trip', () => {
  const cases: Array<{ r: number; g: number; b: number }> = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 128, g: 128, b: 128 },
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
    { r: 200, g: 100, b: 50 },
  ];

  for (const rgb of cases) {
    it(`round-trips rgb(${rgb.r},${rgb.g},${rgb.b})`, () => {
      const hsv = rgbToHsv(rgb);
      const result = hsvToRgb(hsv);
      expect(result.r).toBeCloseTo(rgb.r, 0);
      expect(result.g).toBeCloseTo(rgb.g, 0);
      expect(result.b).toBeCloseTo(rgb.b, 0);
    });
  }
});

describe('hexToHsv / hsvToHex round-trip', () => {
  const hexCases = ['#ff0000', '#00ff00', '#0000ff', '#808080', '#c86432'];

  for (const hex of hexCases) {
    it(`round-trips ${hex}`, () => {
      const hsv = hexToHsv(hex);
      const result = hsvToHex(hsv);
      expect(result).toBe(hex);
    });
  }
});

describe('isValidHex', () => {
  it('accepts valid hex', () => {
    expect(isValidHex('#aabbcc')).toBe(true);
    expect(isValidHex('#AABBCC')).toBe(true);
    expect(isValidHex('#000000')).toBe(true);
  });
  it('rejects invalid values', () => {
    expect(isValidHex('aabbcc')).toBe(false);
    expect(isValidHex('#abc')).toBe(false);
    expect(isValidHex('#gggggg')).toBe(false);
    expect(isValidHex('')).toBe(false);
  });
});

describe('extractDocumentColors', () => {
  const mockPalette = {
    bg: { color: '#ffffff', bg: '#1a1a2e' },
    text: { color: '#e0e0e0', bg: '#16213e' },
    border: { color: '#444444', bg: '#1a1a2e' },
  } as unknown as Palette;

  it('extracts palette colors from layers', () => {
    const page: FIGMIIPage = {
      id: 'p1',
      name: 'Page 1',
      layers: {
        l1: {
          id: 'l1', kind: 'border-box', name: 'Box', rect: { col: 0, row: 0, width: 10, height: 5 },
          visible: true, locked: false, opacity: 1, styleKey: 'text',
          properties: {} as never,
        },
      },
      layerOrder: ['l1'],
      canvasX: 0, canvasY: 0,
    };
    const colors = extractDocumentColors(page, mockPalette);
    expect(colors).toContain('#e0e0e0');
    expect(colors).toContain('#16213e');
  });

  it('includes customColors overrides', () => {
    const page: FIGMIIPage = {
      id: 'p1',
      name: 'Page 1',
      layers: {
        l1: {
          id: 'l1', kind: 'border-box', name: 'Box', rect: { col: 0, row: 0, width: 10, height: 5 },
          visible: true, locked: false, opacity: 1, styleKey: 'bg',
          properties: {} as never,
          customColors: { color: '#ff0000', bg: '#00ff00' },
        },
      },
      layerOrder: ['l1'],
      canvasX: 0, canvasY: 0,
    };
    const colors = extractDocumentColors(page, mockPalette);
    expect(colors).toContain('#ff0000');
    expect(colors).toContain('#00ff00');
  });

  it('includes cellColorOverrides', () => {
    const page: FIGMIIPage = {
      id: 'p1',
      name: 'Page 1',
      layers: {
        l1: {
          id: 'l1', kind: 'text-block', name: 'Text', rect: { col: 0, row: 0, width: 10, height: 5 },
          visible: true, locked: false, opacity: 1, styleKey: 'bg',
          properties: {} as never,
          cellColorOverrides: { '0,0': '#abcdef', '1,2': '#123456' },
        },
      },
      layerOrder: ['l1'],
      canvasX: 0, canvasY: 0,
    };
    const colors = extractDocumentColors(page, mockPalette);
    expect(colors).toContain('#abcdef');
    expect(colors).toContain('#123456');
  });

  it('deduplicates colors', () => {
    const page: FIGMIIPage = {
      id: 'p1',
      name: 'Page 1',
      layers: {
        l1: {
          id: 'l1', kind: 'border-box', name: 'A', rect: { col: 0, row: 0, width: 5, height: 5 },
          visible: true, locked: false, opacity: 1, styleKey: 'bg',
          properties: {} as never,
        },
        l2: {
          id: 'l2', kind: 'border-box', name: 'B', rect: { col: 5, row: 0, width: 5, height: 5 },
          visible: true, locked: false, opacity: 1, styleKey: 'bg',
          properties: {} as never,
        },
      },
      layerOrder: ['l1', 'l2'],
      canvasX: 0, canvasY: 0,
    };
    const colors = extractDocumentColors(page, mockPalette);
    const unique = new Set(colors);
    expect(colors.length).toBe(unique.size);
  });
});
