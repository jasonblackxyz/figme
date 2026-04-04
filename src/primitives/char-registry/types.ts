export type CharCategory =
  | 'box-drawing'
  | 'box-double'
  | 'block-elements'
  | 'braille'
  | 'arrows'
  | 'mathematical'
  | 'geometric'
  | 'dingbats'
  | 'technical'
  | 'punctuation-extended'
  | 'custom';

export interface CharEntry {
  char: string;
  codepoint: number;
  name: string;
  category: CharCategory;
  tags: string[];
  width: 'narrow' | 'wide';
}

export interface CharRegistry {
  entries: CharEntry[];
  favorites: string[];
  recent: string[];
  search(query: string): CharEntry[];
  getByCategory(cat: CharCategory): CharEntry[];
  addCustom(char: string, tags: string[]): void;
}
