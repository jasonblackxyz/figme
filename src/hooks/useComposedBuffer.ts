import { useMemo } from 'react';
import type { FigMePage } from '@primitives/document-model/types.ts';
import type {
  BorderBoxProperties,
  TextBlockProperties,
  FigletTextProperties,
  EdgePathProperties,
} from '@primitives/document-model/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import { createBuffer, mergeBuffers } from '@primitives/stamp-system/buffer.ts';
import {
  stampNodeBox,
  stampModalBox,
  stampSectionFrame,
  stampDivider,
  stampHorizontalDivider,
} from '@primitives/stamp-system/stamps.ts';
import { stampTextBlock } from '@primitives/stamp-system/stampText.ts';
import { stampFigletText } from '@primitives/stamp-system/stampFiglet.ts';
import { stampEdge } from '@primitives/stamp-system/stampEdge.ts';
import { getFigletFont } from '@primitives/figlet-engine/fonts/index.ts';

export function useComposedBuffer(page: FigMePage, gridConfig: GridConfig): StampBuffer {
  return useMemo(() => {
    let buffer = createBuffer(gridConfig.canvasCols, gridConfig.canvasRows);

    for (const layerId of page.layerOrder) {
      const layer = page.layers[layerId];
      if (!layer || !layer.visible) continue;

      let layerBuffer: StampBuffer | null = null;

      switch (layer.kind) {
        case 'border-box': {
          const props = layer.properties as BorderBoxProperties;
          const borderStyle = layer.styleKey;
          const bgStyle = props.bgStyleKey ?? 'nodeBg';
          switch (props.borderStyle) {
            case 'rounded':
              layerBuffer = stampNodeBox(layer.rect, borderStyle, bgStyle);
              break;
            case 'double':
              layerBuffer = stampModalBox(layer.rect, borderStyle, bgStyle);
              break;
            case 'section':
              layerBuffer = stampSectionFrame(layer.rect, borderStyle, bgStyle, props.title, props.titleStyleKey);
              break;
            default:
              layerBuffer = stampNodeBox(layer.rect, borderStyle, bgStyle);
          }
          break;
        }
        case 'divider':
          if (layer.rect.width >= 2) {
            layerBuffer = stampHorizontalDivider(layer.rect.width, layer.styleKey);
          } else {
            layerBuffer = stampDivider(layer.rect.width, layer.styleKey);
          }
          break;
        case 'text-block': {
          const props = layer.properties as TextBlockProperties;
          layerBuffer = stampTextBlock(props, layer.rect);
          break;
        }
        case 'figlet-text': {
          const props = layer.properties as FigletTextProperties;
          const font = getFigletFont(props.fontName);
          if (font) {
            layerBuffer = stampFigletText(props, layer.rect, font);
          }
          break;
        }
        case 'edge-path': {
          const props = layer.properties as EdgePathProperties;
          const sourceLyr = page.layers[props.sourceLayerId];
          const targetLyr = page.layers[props.targetLayerId];
          if (sourceLyr && targetLyr) {
            layerBuffer = stampEdge(
              sourceLyr.rect,
              targetLyr.rect,
              props.styleKey,
              gridConfig.canvasCols,
              gridConfig.canvasRows,
            );
          }
          break;
        }
        case 'image':
          // Image rendering is async — handled separately via cached results
          break;
      }

      if (layerBuffer) {
        // For edge-path, the buffer is already canvas-sized with absolute positions
        if (layer.kind === 'edge-path') {
          buffer = mergeBuffers(buffer, layerBuffer, 0, 0);
        } else {
          buffer = mergeBuffers(buffer, layerBuffer, layer.rect.col, layer.rect.row);
        }
      }
    }

    return buffer;
  }, [page, gridConfig]);
}
