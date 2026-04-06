import type { ReactNode } from 'react';
import type { FigMeDocument } from '@primitives/document-model/types.ts';
import { STYLE_KEYS } from '@primitives/style-system/palette.ts';

interface AgentBriefingProps {
  document: FigMeDocument;
}

/**
 * Hidden component that embeds a structured JSON briefing for AI agents.
 * The briefing is referenced via aria-describedby on the app root so that
 * Claude in Chrome can discover design context through the accessibility tree.
 */
export function AgentBriefing({ document }: AgentBriefingProps): ReactNode {
  const briefing = {
    system: 'FigMe \u2014 ASCII Grid Design Tool',
    version: '2.0',
    purpose:
      'Design tool for composing ASCII character grid interfaces. Designs target the readme-app rendering engine.',
    gridSystem: {
      description:
        'The canvas is a 2D grid of monospace character cells. Every position is addressed by (col, row). There are no sub-cell positions.',
      defaults: {
        fontFamily: document.gridConfig.fontFamily,
        fontSize: document.gridConfig.fontSize,
        lineHeight: document.gridConfig.lineHeight,
        cellWidth: document.gridConfig.cellWidth,
        cellHeight: document.gridConfig.cellHeight,
      },
    },
    document: {
      name: document.name,
      pageCount: document.pages.length,
      activePageId: document.activePageId,
      componentCount: Object.keys(document.components).length,
    },
    api: {
      global: 'window.FigMe',
      stores:
        'FigMe.stores.{document,tool,ui,viewport} — raw Zustand stores, call .getState() for sync access',
      convenience: [
        'getDocument()',
        'getActivePage()',
        'getLayers()',
        'getLayer(id)',
        'addLayer(kind, name, rect, styleKey, props?)',
        'removeLayer(id)',
        'updateLayer(id, updates)',
        'moveLayer(id, col, row)',
      ],
      batch: 'FigMe.batch(() => { ...mutations... }) — single undo entry',
      subscribe: "FigMe.subscribe('document'|'selection'|'tool', cb) => unsub",
      storeExamples: {
        rename: 'FigMe.stores.document.getState().renameLayer(id, name)',
        undo: 'FigMe.stores.document.getState().undo()',
        selectTool: "FigMe.stores.tool.getState().setActiveTool('border-box')",
        setSelection: 'FigMe.stores.ui.getState().setSelectedLayers([id])',
        zoom: 'FigMe.stores.viewport.getState().setZoom(1.5)',
        paintCells:
          'FigMe.stores.document.getState().setLayerCellOverridesBulk(layerId, [{row,col}], hexColor)',
      },
    },
    layerKinds: {
      'border-box': { desc: 'Rectangular border with optional title/fill/padding', default: 'border' },
      'text-block': { desc: 'Flowing text with word-wrap and alignment', default: 'text' },
      'figlet-text': { desc: 'Large ASCII art text using FIGlet fonts', default: 'accentText' },
      'divider': { desc: 'Horizontal or vertical line', default: 'border' },
      'image': { desc: 'Image to ASCII conversion (experimental)', default: 'imageMid' },
      'edge-path': { desc: 'Connector between layers (experimental)', default: 'edge' },
      'group': { desc: 'Container for child layers', default: 'bg' },
      'component': { desc: 'Reusable component instance', default: 'bg' },
    },
    styleKeys: STYLE_KEYS,
    domSelectors: {
      toolbar: "[data-component='toolbar']",
      toolButton: "[data-tool='{type}']",
      layersPanel: "[data-component='layers-panel']",
      layerRow: "[data-layer-id='{id}']",
      propertiesPanel: "[data-component='properties-panel']",
      propertyInput: "[data-property='{name}']",
      actionButton: "[data-action='{name}']",
      pageTab: "[data-page-id='{id}']",
      specViewJson: "[data-spec='full-document']",
      statusBar: "[data-status='{field}']",
      textEditor: "[data-editing-layer='{id}']",
    },
  };

  return (
    <script
      type="application/json"
      id="figme-agent-briefing"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(briefing) }}
    />
  );
}
