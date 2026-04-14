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

    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );

    const canvas = await renderBufferToCanvas(buffer, palette, gridConfig);

    expect(canvas.width).toBe(24);
    expect(canvas.height).toBe(32);
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

    const cellCalls = ctx.fillRect.mock.calls.slice(1);
    const maxRight = Math.max(...cellCalls.map(([x, , w]) => x + w));
    const maxBottom = Math.max(...cellCalls.map(([, y, , h]) => y + h));

    expect(maxRight).toBe(canvas.width);
    expect(maxBottom).toBe(canvas.height);
  });

  it('renders cell backgrounds and text at raw grid coordinates', async () => {
    const buffer = createBuffer(2, 2);
    buffer.chars[1]![1] = 'X';
    buffer.styles[1]![1] = 'text';

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
});
