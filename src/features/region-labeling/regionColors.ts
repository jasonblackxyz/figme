import type { RuntimeComponentKind } from '@primitives/document-model/types.ts';

const ROLE_GROUPS: Partial<Record<RuntimeComponentKind, string>> = {
  // Containers — blue
  frame: '#2563eb',
  card: '#2563eb',
  modal: '#2563eb',
  'scroll-panel': '#2563eb',

  // Inputs — purple
  'text-input': '#7c3aed',
  textarea: '#7c3aed',
  toggle: '#7c3aed',
  select: '#7c3aed',
  'radio-group': '#7c3aed',
  checkbox: '#7c3aed',
  slider: '#7c3aed',

  // Actions — orange
  button: '#ea580c',
  link: '#ea580c',
  chip: '#f97316',

  // Text / content — teal
  'text-block': '#0d9488',
  'list-item': '#0d9488',

  // Lists / nav — green
  list: '#16a34a',
  tree: '#16a34a',
  'tab-bar': '#15803d',
  dock: '#15803d',
  breadcrumb: '#65a30d',

  // Status — red
  badge: '#dc2626',
  spinner: '#dc2626',
  toast: '#dc2626',
  'progress-bar': '#dc2626',

  // Decoration / divider — gray
  icon: '#6b7280',
  divider: '#6b7280',
  spacer: '#9ca3af',
  tooltip: '#9ca3af',

  // Media — pink
  avatar: '#db2777',
  image: '#db2777',

  // Tabular — amber
  table: '#b45309',
  accordion: '#b45309',

  // Custom — magenta
  'custom-module': '#a21caf',
};

const FALLBACK_COLOR = '#475569';

export function regionColorForKind(kind: RuntimeComponentKind): string {
  return ROLE_GROUPS[kind] ?? FALLBACK_COLOR;
}
