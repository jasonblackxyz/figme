import { stampImage } from '../stampImage.ts';
import type { ImageRenderResult } from '@primitives/image-pipeline/types.ts';

describe('stampImage', () => {
  it('creates buffer with correct dimensions', () => {
    const result: ImageRenderResult = {
      chars: [['#', '.'], ['@', ' ']],
      width: 2,
      height: 2,
    };
    const buffer = stampImage(result);
    expect(buffer.width).toBe(2);
    expect(buffer.height).toBe(2);
  });

  it('places characters into buffer correctly', () => {
    const result: ImageRenderResult = {
      chars: [['#', '.', '@'], [' ', '*', '=']],
      width: 3,
      height: 2,
    };
    const buffer = stampImage(result);
    expect(buffer.chars[0]![0]).toBe('#');
    expect(buffer.chars[0]![1]).toBe('.');
    expect(buffer.chars[0]![2]).toBe('@');
    expect(buffer.chars[1]![0]).toBe(' ');
    expect(buffer.chars[1]![1]).toBe('*');
    expect(buffer.chars[1]![2]).toBe('=');
  });

  it('maps characters to correct default style keys', () => {
    const result: ImageRenderResult = {
      chars: [[' ', '.', '=', '#', '@']],
      width: 5,
      height: 1,
    };
    const buffer = stampImage(result);
    expect(buffer.styles[0]![0]).toBe('bg');         // space
    expect(buffer.styles[0]![1]).toBe('imageDeep');   // .
    expect(buffer.styles[0]![2]).toBe('imageMid');    // =
    expect(buffer.styles[0]![3]).toBe('imageLight');  // #
    expect(buffer.styles[0]![4]).toBe('imageEdge');   // @
  });

  it('uses custom style mapping when provided', () => {
    const result: ImageRenderResult = {
      chars: [[' ', '@']],
      width: 2,
      height: 1,
    };
    const buffer = stampImage(result, () => 'accentText');
    expect(buffer.styles[0]![0]).toBe('accentText');
    expect(buffer.styles[0]![1]).toBe('accentText');
  });

  it('handles empty result', () => {
    const result: ImageRenderResult = {
      chars: [],
      width: 0,
      height: 0,
    };
    const buffer = stampImage(result);
    expect(buffer.width).toBe(0);
    expect(buffer.height).toBe(0);
  });

  it('handles shade characters with correct styles', () => {
    const result: ImageRenderResult = {
      chars: [['░', '▒', '▓', '█']],
      width: 4,
      height: 1,
    };
    const buffer = stampImage(result);
    expect(buffer.styles[0]![0]).toBe('imageDeep');
    expect(buffer.styles[0]![1]).toBe('imageMid');
    expect(buffer.styles[0]![2]).toBe('imageLight');
    expect(buffer.styles[0]![3]).toBe('imageEdge');
  });
});
