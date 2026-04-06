import { useEffect, useRef } from 'react';
import type { TextBlockProperties } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import { computeTextFlow } from '@primitives/text-flow/compute.ts';
import styles from './TextEditor.module.css';

/**
 * Transparent textarea overlay positioned over the editing text-block layer.
 * Syncs keystrokes to layer properties in real time.
 * Enter edit mode: double-click a text-block layer, or place a new one.
 * Exit edit mode: press Escape or click outside.
 */
export function TextEditor() {
  const editingLayerId = useUiStore((s) => s.editingLayerId);
  const doc = useDocumentStore((s) => s.document);
  const panX = useViewportStore((s) => s.panX);
  const panY = useViewportStore((s) => s.panY);
  const getConfig = useViewportStore((s) => s.getEffectiveGridConfig);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalHeightRef = useRef<number>(0);

  const activePage = doc.pages.find(p => p.id === doc.activePageId);
  const layer = editingLayerId && activePage ? activePage.layers[editingLayerId] : undefined;

  useEffect(() => {
    if (layer && textareaRef.current) {
      originalHeightRef.current = layer.rect.height;
      textareaRef.current.focus();
    }
  }, [layer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!layer || layer.kind !== 'text-block' || !activePage) return null;

  const props = layer.properties as TextBlockProperties;
  const config = getConfig();

  const palette = doc.palette;
  const styleDef = palette[props.styleKey];

  const left = layer.rect.col * config.cellWidth + panX;
  const top = layer.rect.row * config.cellHeight + panY;
  const width = layer.rect.width * config.cellWidth;
  const height = layer.rect.height * config.cellHeight;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const docStore = useDocumentStore.getState();
    const currentDoc = docStore.document;
    const page = currentDoc.pages.find(p => p.id === currentDoc.activePageId);
    if (!page) return;

    const flowResult = computeTextFlow({
      content: newContent,
      boundingRect: { col: 0, row: 0, width: layer.rect.width, height: 9999 },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      kerning: props.kerning,
      lineSpacing: props.lineSpacing,
      alignment: props.alignment,
    });

    const newHeight = Math.max(originalHeightRef.current, flowResult.totalRows, 1);

    const updatedPage = updateLayer(page, layer.id, {
      properties: { ...props, content: newContent },
      rect: { ...layer.rect, height: newHeight },
    });
    docStore.setDocument({
      ...currentDoc,
      pages: currentDoc.pages.map(p => p.id === page.id ? updatedPage : p),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      useUiStore.getState().setEditingLayerId(null);
    }
    // Stop propagation so keyboard shortcuts don't fire
    e.stopPropagation();
  };

  const stopCanvasEventPropagation = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
  };

  return (
    <textarea
      ref={textareaRef}
      className={styles.textEditor}
      style={{
        left,
        top,
        width,
        height,
        fontSize: config.fontSize + 'px',
        lineHeight: config.lineHeight,
        fontFamily: config.fontFamily,
        color: styleDef?.color,
        backgroundColor: styleDef?.bg,
      }}
      value={props.content}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPointerDown={stopCanvasEventPropagation}
      onPointerMove={stopCanvasEventPropagation}
      onPointerUp={stopCanvasEventPropagation}
      onMouseDown={stopCanvasEventPropagation}
      onMouseUp={stopCanvasEventPropagation}
      onClick={stopCanvasEventPropagation}
      onDoubleClick={stopCanvasEventPropagation}
      onWheel={stopCanvasEventPropagation}
      onBlur={() => useUiStore.getState().setEditingLayerId(null)}
      data-editing-layer={layer.id}
    />
  );
}
