export type ImageRenderStyle =
  | 'classic'
  | 'smooth'
  | 'braille'
  | 'contour'
  | 'hatch';

export interface ImageRenderConfig {
  src: string;
  style: ImageRenderStyle;
  targetCols: number;
  targetRows: number;
  brightness: number;
  contrast: number;
  invert: boolean;
}

export interface ImageRenderResult {
  chars: string[][];
  width: number;
  height: number;
}
