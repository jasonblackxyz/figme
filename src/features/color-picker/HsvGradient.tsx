import { useRef, useEffect, useCallback } from 'react';
import type { HSV } from '@primitives/color-utils/types.ts';
import { hsvToRgb, rgbToHex } from '@primitives/color-utils/conversions.ts';

interface Props {
  hsv: HSV;
  onChange: (s: number, v: number) => void;
}

const WIDTH = 240;
const HEIGHT = 150;

function drawGradient(ctx: CanvasRenderingContext2D, hue: number) {
  const baseRgb = hsvToRgb({ h: hue, s: 1, v: 1 });
  const baseHex = rgbToHex(baseRgb);

  // Base hue fill
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // White → transparent (left to right)
  const whiteGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
  whiteGrad.addColorStop(0, '#ffffff');
  whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = whiteGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Transparent → black (top to bottom)
  const blackGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
  blackGrad.addColorStop(1, '#000000');
  ctx.fillStyle = blackGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawCursor(ctx: CanvasRenderingContext2D, s: number, v: number) {
  const x = s * WIDTH;
  const y = (1 - v) * HEIGHT;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function HsvGradient({ hsv, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawGradient(ctx, hsv.h);
    drawCursor(ctx, hsv.s, hsv.v);
  }, [hsv.h, hsv.s, hsv.v]);

  const handlePointer = useCallback(
    (e: React.PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      onChange(s, v);
    },
    [onChange],
  );

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      style={{ width: '100%', height: HEIGHT, cursor: 'crosshair', borderRadius: 3 }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handlePointer(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) handlePointer(e);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
    />
  );
}
