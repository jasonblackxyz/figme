import { useMemo } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Layer, BorderBoxProperties } from '@primitives/document-model/types.ts';
import { createBuffer, mergeBuffers } from '@primitives/stamp-system/buffer.ts';
import {
  stampNodeBox,
  stampModalBox,
  stampSectionFrame,
  stampDivider,
  stampHorizontalDivider,
} from '@primitives/stamp-system/stamps.ts';

/**
 * Stamp a single layer into a buffer based on its kind.
 * Returns null for layer kinds that don't have stamp implementations yet.
 */
function stampLayer(layer: Layer): StampBuffer | null {
  switch (layer.kind) {
    case 'border-box': {
      const props = layer.properties as BorderBoxProperties;
      const bgStyle = props.bgStyleKey ?? 'nodeBg';
      switch (props.borderStyle) {
        case 'rounded':
          return stampNodeBox(layer.rect, layer.styleKey, bgStyle);
        case 'double':
          return stampModalBox(layer.rect, layer.styleKey, bgStyle);
        case 'section':
          return stampSectionFrame(
            layer.rect,
            layer.styleKey,
            bgStyle,
            props.title,
            props.titleStyleKey,
          );
        default:
          return stampNodeBox(layer.rect, layer.styleKey, bgStyle);
      }
    }
    case 'divider': {
      if (layer.rect.width >= 2) {
        return stampHorizontalDivider(layer.rect.width, layer.styleKey);
      }
      return stampDivider(layer.rect.width, layer.styleKey);
    }
    case 'text-block':
    case 'figlet-text':
    case 'image':
    case 'edge-path':
    case 'group':
    case 'component':
      // These layer kinds are not yet implemented
      return null;
    default:
      return null;
  }
}

/**
 * Hook that composes the active page's layers into a single StampBuffer.
 * Stamps each layer in z-order and merges onto a canvas-sized buffer.
 */
export function useComposedBuffer(): StampBuffer {
  const document = useDocumentStore((s) => s.document);

  return useMemo(() => {
    const { gridConfig, pages, activePageId } = document;
    const page = pages.find((p) => p.id === activePageId) ?? pages[0];
    if (!page) {
      return createBuffer(gridConfig.canvasCols, gridConfig.canvasRows);
    }

    let canvas = createBuffer(gridConfig.canvasCols, gridConfig.canvasRows);

    // Stamp each layer in z-order (layerOrder[0] is bottom)
    for (const layerId of page.layerOrder) {
      const layer = page.layers[layerId];
      if (!layer || !layer.visible) continue;

      const layerBuffer = stampLayer(layer);
      if (layerBuffer) {
        canvas = mergeBuffers(canvas, layerBuffer, layer.rect.col, layer.rect.row);
      }
    }

    return canvas;
  }, [document]);
}
