import { useMemo } from 'react';
import type { FigMePage } from '@primitives/document-model/types.ts';
import { useUiStore } from '@stores/uiStore.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';

export function useComposedBuffer(page: FigMePage, gridConfig: GridConfig): StampBuffer {
  const editingLayerId = useUiStore((s) => s.editingLayerId);

  return useMemo(() => composePageBuffer(page, gridConfig, editingLayerId), [page, gridConfig, editingLayerId]);
}
