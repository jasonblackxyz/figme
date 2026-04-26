import { useMemo } from 'react';
import type { FIGMIIPage } from '@primitives/document-model/types.ts';
import { useUiStore } from '@stores/uiStore.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { computeColorOverrides } from '@primitives/document-model/colorOverrides.ts';
import type { ColorOverrideMap } from '@primitives/document-model/colorOverrides.ts';

export type { ColorOverrideMap };

export interface ComposedBufferResult {
  buffer: StampBuffer;
  colorOverrides: ColorOverrideMap;
}

export function useComposedBuffer(page: FIGMIIPage, gridConfig: GridConfig): ComposedBufferResult {
  const editingLayerId = useUiStore((s) => s.editingLayerId);

  return useMemo(() => {
    const buffer = composePageBuffer(page, gridConfig, editingLayerId);
    const colorOverrides = computeColorOverrides(page);
    return { buffer, colorOverrides };
  }, [page, gridConfig, editingLayerId]);
}
