export interface FigletFont {
  name: string;
  height: number;
  baseline: number;
  maxLength: number;
  hardBlank: string;
  commentLines: string[];
  characters: Record<number, string[][]>;
  smushRules: number;
}

export interface FigletRenderResult {
  lines: string[];
  width: number;
  height: number;
}
