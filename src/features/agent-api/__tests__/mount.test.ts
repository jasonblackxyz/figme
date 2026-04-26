import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountFigmiiApi } from '../index.ts';

describe('mountFigmiiApi', () => {
  beforeEach(() => {
    for (const key of ['FIGMII', 'FigMe', 'Figmii'] as const) {
      Reflect.deleteProperty(window, key);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts the canonical window.FIGMII global', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mountFigmiiApi();

    expect(window.FIGMII).toBeDefined();
    expect(window.FIGMII?.getDocument()).toBeDefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps deprecated FigMe and Figmii globals as one-warning aliases', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mountFigmiiApi();
    const canonical = window.FIGMII;

    expect(window.FigMe).toBe(canonical);
    expect(window.FigMe).toBe(canonical);
    expect(window.Figmii).toBe(canonical);
    expect(window.Figmii).toBe(canonical);

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenNthCalledWith(1, '[FIGMII] window.FigMe is deprecated; use window.FIGMII instead.');
    expect(warn).toHaveBeenNthCalledWith(2, '[FIGMII] window.Figmii is deprecated; use window.FIGMII instead.');
  });
});
