import type { RuntimeComponentKind, RuntimeRole, SemanticRegion } from '@primitives/document-model/types.ts';

export const DEFAULT_ROLE_BY_KIND: Record<RuntimeComponentKind, RuntimeRole> = {
  frame: 'container',
  card: 'container',
  modal: 'container',
  'scroll-panel': 'container',
  'text-input': 'input',
  textarea: 'input',
  button: 'button',
  link: 'link',
  'text-block': 'content',
  chip: 'button',
  badge: 'status',
  icon: 'decoration',
  divider: 'decoration',
  spacer: 'decoration',
  list: 'container',
  'list-item': 'list-item',
  tree: 'container',
  'tab-bar': 'navigation',
  dock: 'navigation',
  slider: 'input',
  spinner: 'status',
  'custom-module': 'container',
  toggle: 'input',
  select: 'input',
  'radio-group': 'input',
  checkbox: 'input',
  avatar: 'content',
  image: 'content',
  'progress-bar': 'status',
  table: 'content',
  accordion: 'container',
  tooltip: 'content',
  toast: 'status',
  breadcrumb: 'navigation',
};

export function getEffectiveRegionRole(region: Pick<SemanticRegion, 'componentKind' | 'role'>): RuntimeRole {
  return region.role ?? DEFAULT_ROLE_BY_KIND[region.componentKind];
}
