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
