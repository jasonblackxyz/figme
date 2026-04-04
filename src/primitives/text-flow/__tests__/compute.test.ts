import { describe, it, expect } from 'vitest';
import { computeTextFlow } from '../compute.ts';
import type { TextFlowConfig } from '../types.ts';

function makeConfig(overrides: Partial<TextFlowConfig> = {}): TextFlowConfig {
  return {
    content: 'hello world',
    boundingRect: { col: 0, row: 0, width: 20, height: 10 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    kerning: 0,
    lineSpacing: 0,
    alignment: 'left',
    ...overrides,
  };
}

describe('computeTextFlow', () => {
  it('returns empty result for empty content', () => {
    const result = computeTextFlow(makeConfig({ content: '' }));
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.segments).toHaveLength(0);
    expect(result.totalRows).toBe(1);
    expect(result.overflow).toBe(false);
  });

  it('places a short string on one line', () => {
    const result = computeTextFlow(makeConfig({ content: 'hello' }));
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.segments).toHaveLength(1);
    expect(result.lines[0]!.segments[0]!.text).toBe('hello');
    expect(result.lines[0]!.segments[0]!.col).toBe(0);
    expect(result.lines[0]!.segments[0]!.styleKey).toBe('text');
    expect(result.overflow).toBe(false);
  });

  it('wraps long text to multiple lines', () => {
    const result = computeTextFlow(makeConfig({
      content: 'one two three four five six seven',
      boundingRect: { col: 0, row: 0, width: 10, height: 10 },
    }));
    expect(result.lines.length).toBeGreaterThan(1);
    // First line should fit within 10 cols
    const firstLineText = result.lines[0]!.segments[0]!.text;
    expect(firstLineText.length).toBeLessThanOrEqual(10);
    expect(result.overflow).toBe(false);
  });

  it('applies padding', () => {
    const result = computeTextFlow(makeConfig({
      content: 'test',
      boundingRect: { col: 5, row: 3, width: 20, height: 10 },
      padding: { top: 2, right: 1, bottom: 1, left: 3 },
    }));
    expect(result.lines[0]!.row).toBe(5); // row 3 + padding.top 2
    expect(result.lines[0]!.segments[0]!.col).toBe(8); // col 5 + padding.left 3
  });

  it('centers text', () => {
    const result = computeTextFlow(makeConfig({
      content: 'hi',
      boundingRect: { col: 0, row: 0, width: 10, height: 5 },
      alignment: 'center',
    }));
    // 'hi' is 2 chars, available width 10, center offset = floor((10 - 2) / 2) = 4
    expect(result.lines[0]!.segments[0]!.col).toBe(4);
  });

  it('right-aligns text', () => {
    const result = computeTextFlow(makeConfig({
      content: 'hi',
      boundingRect: { col: 0, row: 0, width: 10, height: 5 },
      alignment: 'right',
    }));
    // 'hi' is 2 chars, available width 10, right offset = 10 - 2 = 8
    expect(result.lines[0]!.segments[0]!.col).toBe(8);
  });

  it('detects overflow when content exceeds available height', () => {
    const result = computeTextFlow(makeConfig({
      content: 'a b c d e f g h i j k l m n o p q r s t',
      boundingRect: { col: 0, row: 0, width: 5, height: 3 },
    }));
    expect(result.overflow).toBe(true);
    expect(result.overflowLineCount).toBeGreaterThan(0);
    expect(result.lines).toHaveLength(3); // Only 3 visible lines
  });

  it('applies kerning (extra spaces between characters)', () => {
    const result = computeTextFlow(makeConfig({
      content: 'ab',
      kerning: 1,
    }));
    expect(result.lines[0]!.segments[0]!.text).toBe('a b');
  });

  it('applies kerning=2', () => {
    const result = computeTextFlow(makeConfig({
      content: 'ab',
      kerning: 2,
    }));
    expect(result.lines[0]!.segments[0]!.text).toBe('a  b');
  });

  it('applies line spacing', () => {
    const result = computeTextFlow(makeConfig({
      content: 'line1\nline2\nline3',
      boundingRect: { col: 0, row: 0, width: 20, height: 20 },
      lineSpacing: 1,
    }));
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0]!.row).toBe(0);
    expect(result.lines[1]!.row).toBe(2); // 1 line + 1 spacing
    expect(result.lines[2]!.row).toBe(4);
  });

  it('handles line spacing with overflow', () => {
    const result = computeTextFlow(makeConfig({
      content: 'a\nb\nc\nd\ne',
      boundingRect: { col: 0, row: 0, width: 20, height: 5 },
      lineSpacing: 1,
    }));
    // With lineSpacing=1, each line takes 2 rows. 5 rows / 2 = 2 visible lines (3rd would start at row 4 which fits)
    expect(result.overflow).toBe(true);
    expect(result.lines.length).toBeLessThan(5);
  });

  it('returns zero-size result for zero-width bounding box', () => {
    const result = computeTextFlow(makeConfig({
      content: 'hello',
      boundingRect: { col: 0, row: 0, width: 0, height: 10 },
    }));
    expect(result.lines).toHaveLength(0);
    expect(result.totalRows).toBe(0);
  });

  it('handles newlines in content', () => {
    const result = computeTextFlow(makeConfig({
      content: 'line one\nline two',
    }));
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]!.segments[0]!.text).toBe('line one');
    expect(result.lines[1]!.segments[0]!.text).toBe('line two');
  });
});
