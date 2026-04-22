import type { FigMePage } from './types.ts';

export const DEFAULT_PAGE_BACKGROUND_COLOR = '#ffffff';

export function getResolvedPageBackgroundColor(
  page: Pick<FigMePage, 'backgroundColor'>,
): string {
  return page.backgroundColor ?? DEFAULT_PAGE_BACKGROUND_COLOR;
}
