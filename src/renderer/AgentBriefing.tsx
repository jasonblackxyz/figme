import { useMemo, type ReactNode } from 'react';
import type { FigMeDocument } from '@primitives/document-model/types.ts';
import { STYLE_KEYS } from '@primitives/style-system/palette.ts';

interface AgentBriefingProps {
  document: FigMeDocument;
}

/**
 * Hidden component that embeds two structured JSON elements for AI agents:
 *
 * 1. #figme-agent-briefing  — static API reference (call signature, style keys, layer kinds with
 *    full props schemas, DOM selectors). Accessible as window.FigMe.briefing or by ID.
 *
 * 2. [data-spec="full-document"] — live document snapshot that re-renders whenever the Zustand
 *    document store changes. Agents can read current design state without any JS calls.
 *
 * Both are referenced via aria-describedby on #app-root so the accessibility tree points to them.
 */
export function AgentBriefing({ document }: AgentBriefingProps): ReactNode {
  // Memoize JSON serialisation — the briefing is static (no document data), the live
  // snapshot changes on every document update. Both can be expensive for large docs.
  const documentJson = useMemo(() => JSON.stringify(document), [document]);

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
      briefing: 'window.FigMe.briefing — returns this parsed briefing object',
      stores:
        'FigMe.stores.{document,tool,ui,viewport} — raw Zustand stores, call .getState() for sync access',
      convenience: [
        'getDocument()',
        'getActivePage()',
        'getLayers()',
        'getLayer(id)',
        // addLayer accepts positional args OR a flat object spec:
        //   addLayer(kind, name, {col,row,width,height}, styleKey, props?)
        //   addLayer({kind, name?, col, row, width, height, styleKey?, ...props})
        'addLayer(kind, name, rect, styleKey, props?) | addLayer({kind, col, row, width, height, ...})',
        'removeLayer(id)',
        'updateLayer(id, updates)',
        'moveLayer(id, col, row)',
        'findLayer(name)',
        'findLayers({kind?, name?, styleKey?})',
        'addPage(name) => pageId',
        'setActivePage(id)',
        'getPage(id)',
        'export.toJson()',
        'export.toMarkdown()',
        'export.toAscii(pageId?)',
        'viewport.setZoom(n)',
        'viewport.resetView()',
        'viewport.fitToPage()',
      ],
      batch: 'FigMe.batch(() => { ...mutations... }) — single undo entry. ALWAYS use batch() when adding multiple layers.',
      subscribe: "FigMe.subscribe('document'|'selection'|'tool', cb) => unsub — WARNING: never call mutation methods (addLayer etc.) inside the 'document' callback; that creates an infinite loop and crashes the tab.",
      subscribeRecovery: "If a render error occurs, a FIGME_RECOVERY console entry appears with exact recovery commands. Short version: FigMe.stores.document.getState().undo() then click Dismiss.",
      storeExamples: {
        rename: 'FigMe.stores.document.getState().renameLayer(id, name)',
        undo: 'FigMe.stores.document.getState().undo()',
        selectTool: "FigMe.stores.tool.getState().setActiveTool('border-box')",
        setSelection: 'FigMe.stores.ui.getState().setSelectedLayers([id])',
        zoom: 'FigMe.viewport.setZoom(1.5)',
        fitToPage: 'FigMe.viewport.fitToPage()',
        paintCells:
          'FigMe.stores.document.getState().setLayerCellOverridesBulk(layerId, [{row,col}], hexColor)',
      },
    },
    layerKinds: {
      'border-box': {
        desc: 'Rectangular border with optional title/fill/padding',
        default: 'border',
        props: {
          borderStyle: "'rounded' | 'double' | 'section' | 'custom'",
          title: 'string — text shown inline in the top border (optional)',
          titleStyleKey: 'StyleKey — colour of the title text (optional)',
          bgStyleKey: 'StyleKey — fills the interior background (optional)',
          padding: '{ top, right, bottom, left } — interior padding in cells',
          fillPattern: 'string — repeating tile pattern for interior fill (optional)',
        },
      },
      'text-block': {
        desc: 'Flowing text with word-wrap and alignment',
        default: 'text',
        props: {
          content: 'string — use \\n for explicit line breaks',
          alignment: "'left' | 'center' | 'right'",
          styleKey: 'StyleKey — text foreground colour',
          kerning: '0 | 1 | 2 — extra character spacing (default: 1)',
          lineSpacing: '0 | 1 — extra blank line between lines (default: 0)',
          renderMode: "'flow' (word-wrap) | 'literal' (respect \\n only, no wrap)",
          fontFamily: 'string — inherited from gridConfig, rarely overridden',
        },
      },
      'figlet-text': {
        desc: 'Large ASCII art text rendered with FIGlet fonts',
        default: 'accentText',
        props: {
          content: 'string — the text to render as ASCII art',
          fontName: "string — FIGlet font name, e.g. 'standard' | 'big' | 'slant'",
          alignment: "'left' | 'center' | 'right'",
          styleKey: 'StyleKey — colour of the ASCII art characters',
        },
      },
      'divider': {
        desc: 'Horizontal or vertical rule line',
        default: 'border',
        props: {
          _note: 'No properties object — orientation is implicit from rect shape: width=1 → vertical, height=1 → horizontal',
        },
      },
      'image': {
        desc: 'Image converted to ASCII art (experimental)',
        default: 'imageMid',
        props: {
          src: 'string — data URL or remote URL',
          renderStyle: "'classic' | 'smooth' | 'braille' | 'contour' | 'hatch'",
          brightness: 'number — -1 to 1',
          contrast: 'number — -1 to 1',
          invert: 'boolean',
        },
      },
      'edge-path': {
        desc: 'Connector line between two layers (experimental)',
        default: 'edge',
        props: {
          sourceLayerId: 'string — ID of the source layer',
          targetLayerId: 'string — ID of the target layer',
          routingStyle: "'manhattan' | 'straight'",
          waypoints: 'GridPosition[] — [{col, row}] intermediate points',
          styleKey: 'StyleKey — line colour',
        },
      },
      'group': {
        desc: 'Container for child layers (use children[] on the layer)',
        default: 'bg',
        props: { _note: 'No properties object. Children managed via layer.children[]' },
      },
      'component': {
        desc: 'Reusable component instance',
        default: 'bg',
        props: {
          componentId: 'string — ID of the component definition in document.components',
        },
      },
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
      // Always-present live document snapshot — updated on every document change
      specViewJson: "[data-spec='full-document']",
      statusBar: "[data-status='{field}']",
      // Valid status field values: cursor-pos, zoom, grid-size, layer-count
    },
  };

  return (
    <>
      <script
        type="application/json"
        id="figme-agent-briefing"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(briefing) }}
      />
      {/* Live document snapshot — always present, updates on every document change */}
      <script
        type="application/json"
        data-spec="full-document"
        dangerouslySetInnerHTML={{ __html: documentJson }}
      />
    </>
  );
}
