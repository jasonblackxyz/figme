import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { createBuffer } from '@primitives/stamp-system/buffer.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { renderBufferToCanvas } from '../renderToCanvas.ts';

describe('renderBufferToCanvas', () => {
  const gridConfig: GridConfig = {
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 1,
    cellWidth: 8,
    cellHeight: 16,
    canvasCols: 4,
    canvasRows: 4,
  };

  const palette = createEmptyDocument('Export Test').palette;
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');

  beforeEach(() => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalFonts) {
      Object.defineProperty(document, 'fonts', originalFonts);
    } else {
      Reflect.deleteProperty(document, 'fonts');
    }
  });

  it('sizes the canvas to the rendered grid without any ruler gutter', async () => {
    const buffer = createBuffer(3, 2);
    const fillRectStyles: string[] = [];

    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(() => {
        fillRectStyles.push(ctx.fillStyle);
      }),
      fillText: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );

    const canvas = await renderBufferToCanvas(buffer, palette, gridConfig);

    expect(canvas.width).toBe(24);
    expect(canvas.height).toBe(32);
    expect(fillRectStyles[0]).toBe('#ffffff');
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 24, 32);
  });

  it('uses integer-only fillRect arguments with fractional cell dimensions to prevent gray-bar artifacts', async () => {
    // Default IBM Plex Mono grid produces cellWidth=8.4, cellHeight=18.9.
    // Without edge-aligned rounding, canvas antialiases sub-pixel rect edges,
    // creating a visible gray grid in the exported PNG.
    const fractionalConfig: GridConfig = {
      fontFamily: 'monospace',
      fontSize: 14,
      lineHeight: 1.35,
      cellWidth: 8.4,
      cellHeight: 18.9,
      canvasCols: 10,
      canvasRows: 5,
    };

    const buffer = createBuffer(3, 2);
    buffer.chars[0]![0] = 'A';
    buffer.chars[0]![1] = 'B';
    buffer.chars[1]![0] = 'C';
    buffer.styles[0]![0] = 'nodeBg';
    buffer.styles[0]![1] = 'nodeBg';
    buffer.styles[1]![0] = 'nodeBg';

    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );

    const canvas = await renderBufferToCanvas(buffer, palette, fractionalConfig);

    // Every fillRect call (background fill + all cell rects) must use integer arguments.
    for (const call of ctx.fillRect.mock.calls) {
      for (const arg of call) {
        expect(Number.isInteger(arg)).toBe(true);
      }
    }

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    expect(ctx.fillRect.mock.calls).toHaveLength(4);
  });

  it('renders cell backgrounds and text at raw grid coordinates', async () => {
    const buffer = createBuffer(2, 2);
    buffer.chars[1]![1] = 'X';
    buffer.styles[1]![1] = 'nodeBg';

    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );

    await renderBufferToCanvas(buffer, palette, gridConfig);

    expect(ctx.fillRect).toHaveBeenCalledWith(8, 16, 8, 16);
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).toHaveBeenCalledWith('X', 8, 24);
  });

  it('fills explicit empty-cell background overrides on top of the white page', async () => {
    const buffer = createBuffer(2, 1);
    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );

    await renderBufferToCanvas(buffer, palette, gridConfig, {
      '0,1': { bg: '#ff00ff' },
    });

    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 16, 16);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(2, 8, 0, 8, 16);
  });

  it('uses an explicit page background color when provided', async () => {
    const buffer = createBuffer(1, 1);
    const fillRectStyles: string[] = [];
    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(() => {
        fillRectStyles.push(ctx.fillStyle);
      }),
      fillText: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );

    await renderBufferToCanvas(buffer, palette, gridConfig, undefined, '#0d1117');

    expect(fillRectStyles[0]).toBe('#0d1117');
  });
});
