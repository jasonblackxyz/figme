import { measureCharBrightness } from '../brightness.ts';

describe('measureCharBrightness', () => {
  it('returns 0 for space character', () => {
    const result = measureCharBrightness(' ');
    expect(result).toBe(0);
  });

  it('returns 1 for full block character', () => {
    const result = measureCharBrightness('█');
    expect(result).toBe(1);
  });

  it('returns higher brightness for @ than for space', () => {
    const space = measureCharBrightness(' ');
    const at = measureCharBrightness('@');
    expect(at).toBeGreaterThan(space);
  });

  it('returns higher brightness for # than for .', () => {
    const dot = measureCharBrightness('.');
    const hash = measureCharBrightness('#');
    expect(hash).toBeGreaterThan(dot);
  });

  it('returns increasing brightness for shade characters', () => {
    const light = measureCharBrightness('░');
    const medium = measureCharBrightness('▒');
    const dark = measureCharBrightness('▓');
    const full = measureCharBrightness('█');

    expect(medium).toBeGreaterThan(light);
    expect(dark).toBeGreaterThan(medium);
    expect(full).toBeGreaterThan(dark);
  });

  it('returns value between 0 and 1 for all common characters', () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789.:-=+*#%@';
    for (const char of chars) {
      const value = measureCharBrightness(char);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('returns 0 for empty string', () => {
    expect(measureCharBrightness('')).toBe(0);
  });

  it('caches results for repeated calls', () => {
    const first = measureCharBrightness('A');
    const second = measureCharBrightness('A');
    expect(first).toBe(second);
  });

  it('returns a default value for unknown characters', () => {
    // Some unusual char that likely is not in the lookup table
    const result = measureCharBrightness('\u2603'); // snowman
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});
