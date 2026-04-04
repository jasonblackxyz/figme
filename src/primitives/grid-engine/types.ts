export interface GridConfig {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cellWidth: number;
  cellHeight: number;
  canvasCols: number;
  canvasRows: number;
}

export interface GridPosition {
  col: number;
  row: number;
}

export interface GridRect {
  col: number;
  row: number;
  width: number;
  height: number;
}

export interface ViewportPreset {
  name: string;
  widthPx: number;
  heightPx: number;
  cols: number;
  rows: number;
}
