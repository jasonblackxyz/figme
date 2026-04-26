import type { HSV, RGB } from './types.ts';
import type { FIGMIIPage } from '@primitives/document-model/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';
import { flattenLayerOrder } from '@primitives/document-model/hierarchy.ts';

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(rgb: RGB): string {
  const r = Math.round(Math.max(0, Math.min(255, rgb.r)));
  const g = Math.round(Math.max(0, Math.min(255, rgb.g)));
  const b = Math.round(Math.max(0, Math.min(255, rgb.b)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }

  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb(hsv: HSV): RGB {
  const { h, s, v } = hsv;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function hexToHsv(hex: string): HSV {
  return rgbToHsv(hexToRgb(hex));
}

export function hsvToHex(hsv: HSV): string {
  return rgbToHex(hsvToRgb(hsv));
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * Extract all unique colors currently in use on a page.
 * Scans layer styleKey palette lookups, customColors, and cellColorOverrides.
 */
export function extractDocumentColors(page: FIGMIIPage, palette: Palette): string[] {
  const colors = new Set<string>();

  // Page-level cell overrides
  if (page.cellColorOverrides) {
    for (const hex of Object.values(page.cellColorOverrides)) {
      colors.add(hex.toLowerCase());
    }
  }

  for (const layerId of flattenLayerOrder(page)) {
    const layer = page.layers[layerId];
    if (!layer) continue;

    const styleDef = palette[layer.styleKey];
    if (styleDef) {
      colors.add(styleDef.color.toLowerCase());
      colors.add(styleDef.bg.toLowerCase());
    }

    if (layer.customColors?.color) {
      colors.add(layer.customColors.color.toLowerCase());
    }
    if (layer.customColors?.bg) {
      colors.add(layer.customColors.bg.toLowerCase());
    }

    if (layer.cellColorOverrides) {
      for (const hex of Object.values(layer.cellColorOverrides)) {
        colors.add(hex.toLowerCase());
      }
    }
  }

  return [...colors];
}
