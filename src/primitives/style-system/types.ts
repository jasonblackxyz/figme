export type StyleKey =
  | 'bg'
  | 'dot'
  | 'border'
  | 'dim'
  | 'text'
  | 'badge'
  | 'edge'
  | 'accentBorder'
  | 'accentText'
  | 'nodeBg'
  | 'modalBorder'
  | 'modalBg'
  | 'modalTitle'
  | 'modalText'
  | 'modalClose'
  | 'modalTab'
  | 'modalTabActive'
  | 'modalHint'
  | 'modalTitleBold'
  | 'modalHeading'
  | 'queryBorder'
  | 'queryBg'
  | 'queryText'
  | 'queryCursor'
  | 'queryHint'
  | 'queryButton'
  | 'queryButtonActive'
  | 'queryError'
  | 'queryPill'
  | 'queryPillBlink'
  | 'queryDivider'
  | 'queryCitation'
  | 'queryMatch'
  | 'textBold'
  | 'dimOnCard'
  | 'imageDeep'
  | 'imageMid'
  | 'imageLight'
  | 'imageEdge'
  | 'success';

export interface StyleDef {
  color: string;
  bg: string;
  fontWeight?: number;
}

export type Palette = Record<StyleKey, StyleDef>;

export interface Theme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    card: string;
    cardForeground: string;
    error: string;
    success: string;
  };
}
