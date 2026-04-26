import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { FIGMIIDocument } from '@primitives/document-model/types.ts';
import { getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';
import { useUiStore } from '@stores/uiStore.ts';

interface AgentBriefingProps {
  document: FIGMIIDocument;
}

// ---------------------------------------------------------------------------
// Briefing builders
// ---------------------------------------------------------------------------

function getActivePageCanvasInfo(document: FIGMIIDocument) {
  const activePage = document.pages.find((p) => p.id === document.activePageId);
  return activePage ? getPageCanvasSizeInfo(activePage, document.gridConfig) : null;
}

function buildFullBriefing(document: FIGMIIDocument) {
  const activePageCanvas = getActivePageCanvasInfo(document);

  return {
    system: 'FIGMII \u2014 ASCII Grid Design Tool',
    version: '2.0',
    mode: 'full' as const,
    interfaceMode: 'human' as const,
    purpose:
      'Design tool for composing ASCII character grid interfaces. All colours are specified as hex values (e.g. \'#ffffff\'). You have full creative control over the colour palette.',
    gridSystem: {
      description:
        'The canvas is a 2D grid of monospace character cells. Every position is addressed by (col, row). There are no sub-cell positions, and page size is an explicit row/column setting rather than something inferred from painted content.',
      defaults: {
        fontFamily: document.gridConfig.fontFamily,
        fontSize: document.gridConfig.fontSize,
        lineHeight: document.gridConfig.lineHeight,
        cellWidth: document.gridConfig.cellWidth,
        cellHeight: document.gridConfig.cellHeight,
        canvasCols: document.gridConfig.canvasCols,
        canvasRows: document.gridConfig.canvasRows,
      },
    },
    document: {
      name: document.name,
      pageCount: document.pages.length,
      activePageId: document.activePageId,
      componentCount: Object.keys(document.components).length,
    },
    canvasSize: {
      description:
        'The canvas is fundamentally a row/column ASCII surface. The default canvas size for this document is authoritative. paint() creates layers inside that surface and never resizes the page.',
      default: {
        cols: document.gridConfig.canvasCols,
        rows: document.gridConfig.canvasRows,
      },
      activePage: activePageCanvas,
      control:
        "Use FIGMII.getPageCanvasSize(pageId?), FIGMII.setPageCanvasSize({cols, rows, pageId?, allowClip?}), or FIGMII.resetPageCanvasSize(pageId?) to change the design surface intentionally.",
    },
    api: {
      global: 'window.FIGMII',
      briefing: 'window.FIGMII.briefing \u2014 returns this parsed briefing object',
      stores:
        'FIGMII.stores.{document,tool,ui,viewport} \u2014 raw Zustand stores, call .getState() for sync access',
      convenience: [
        'getDocument()',
        'getActivePage()',
        'getLayers()',
        'getLayer(id)',
        "addLayer({kind, col, row, width, height, color?, bg?, ...props}) \u2014 returns layerId",
        'removeLayer(id)',
        'updateLayer(id, updates)',
        'createRuntimeAnnotation(spec) => annotationId',
        'updateRuntimeAnnotation(id, updates)',
        'removeRuntimeAnnotation(id)',
        'addRuntimeToken(id, {color, bg, fontWeight?})',
        'addRuntimeComponent(component)',
        'addBinding({id, path, fallback?, required?})',
        'addInteraction({id, action})',
        "inferRuntimeSemantics({pageIds?, strategy:'aggressive'})",
        'validateRuntimeSemantics()',
        'moveLayer(id, col, row)',
        'findLayer(name)',
        'findLayers({kind?, name?})',
        'addPage(name) => pageId',
        'setActivePage(id)',
        'getPage(id)',
        'getPageRuntime(pageId)',
        'setPageRuntime(pageId, metadata)',
        'setRuntimeManifest(metadata)',
        'getPageCanvasSize(pageId?)',
        "setPageCanvasSize({cols, rows, pageId?, allowClip?})",
        'resetPageCanvasSize(pageId?)',
        "setInterfaceMode('ai' | 'human')",
        "getInterfaceMode() \u2014 returns the visible shell mode ('ai' or 'human')",
        "paint({col, row, lines?, content?, color?, bg?, name?}) \u2014 freeform character painting with per-span colors. Returns layerId",
        "addFiglet({content, col, row, fontName?, alignment?, color?, bg?, name?}) \u2014 convenience helper for FIGlet display text",
        'export.toJson()',
        'export.toMarkdown()',
        'export.toDesignPackage({includeRenderOracle?})',
        'export.toSemantics()',
        'export.toAscii(pageId?)',
        'viewport.setZoom(n)',
        'viewport.resetView()',
        'viewport.fitToPage()',
        "setAgentMode('full' | 'raw') \u2014 compatibility alias for setInterfaceMode()",
        "getAgentMode() \u2014 compatibility alias returning 'full' in Human mode and 'raw' in AI mode",
      ],
      batch: 'FIGMII.batch(() => { ...mutations... }) \u2014 single undo entry. ALWAYS use batch() when adding multiple layers.',
      subscribe: "FIGMII.subscribe('document'|'selection'|'tool', cb) => unsub \u2014 WARNING: never call mutation methods (addLayer etc.) inside the 'document' callback; that creates an infinite loop and crashes the tab.",
      subscribeRecovery: 'If a render error occurs, a FIGMII_RECOVERY console entry appears with exact recovery commands. Short version: FIGMII.stores.document.getState().undo() then click Dismiss.',
      storeExamples: {
        rename: 'FIGMII.stores.document.getState().renameLayer(id, name)',
        undo: 'FIGMII.stores.document.getState().undo()',
        selectTool: "FIGMII.stores.tool.getState().setActiveTool('border-box')",
        setSelection: 'FIGMII.stores.ui.getState().setSelectedLayers([id])',
        zoom: 'FIGMII.viewport.setZoom(1.5)',
        fitToPage: 'FIGMII.viewport.fitToPage()',
        canvasSize: 'FIGMII.setPageCanvasSize({ cols: 300, rows: 80 })',
        setLayerColors: "FIGMII.updateLayer(id, {customColors: {color: '#fff', bg: '#000'}})",
        paintCells:
          "FIGMII.stores.document.getState().setLayerCellOverridesBulk(layerId, [{row,col}], '#hexColor')",
        paintPage:
          "FIGMII.stores.document.getState().setPageCellOverridesBulk([{row,col}], '#hexColor')",
      },
    },
    runtimeSemantics: {
      purpose: 'Runtime annotations label exportable screens, components, bindings, interactions, and responsive behavior for readme-app Design Lab.',
      workflow: [
        "FigMe.inferRuntimeSemantics({strategy:'aggressive'})",
        "FigMe.setPageRuntime(pageId, {screenId, exportAsScreen:true, desktopBehavior:'centered-mobile-canvas'})",
        'FigMe.createRuntimeAnnotation({pageId, semanticId, rect, role, componentKind, componentId, bindingSlots, interactionIds})',
        'FigMe.validateRuntimeSemantics()',
        'FigMe.export.toDesignPackage({includeRenderOracle:true})',
      ],
    },
    layerKinds: {
      'border-box': {
        desc: 'Rectangular border with optional title/fill/padding',
        props: {
          borderStyle: "'rounded' | 'double' | 'section' | 'custom'",
          title: 'string \u2014 text shown inline in the top border (optional)',
          padding: '{ top, right, bottom, left } \u2014 interior padding in cells',
          fillPattern: 'string \u2014 repeating tile pattern for interior fill (optional)',
        },
      },
      'text-block': {
        desc: 'Flowing text with word-wrap and alignment',
        props: {
          content: 'string \u2014 use \\n for explicit line breaks',
          alignment: "'left' | 'center' | 'right'",
          kerning: '0 | 1 | 2 \u2014 character spacing (default: 0, compact)',
          lineSpacing: '0 | 1 \u2014 extra blank line between lines (default: 0)',
          renderMode: "'flow' (word-wrap) | 'literal' (respect \\n only, no wrap)",
          fontFamily: 'string \u2014 inherited from gridConfig, rarely overridden',
        },
      },
      'figlet-text': {
        desc: 'Large ASCII art text rendered with FIGlet fonts',
        props: {
          content: 'string \u2014 the text to render as ASCII art',
          fontName: "string \u2014 'koholint' | 'standard' | 'small' | 'banner' | 'slant' | 'big' | 'kompaktblk' | 'six-fo' | 'ublk'",
          alignment: "'left' | 'center' | 'right'",
        },
      },
      'divider': {
        desc: 'Horizontal or vertical rule line',
        props: {
          _note: 'No properties object \u2014 orientation is implicit from rect shape: width=1 \u2192 vertical, height=1 \u2192 horizontal',
        },
      },
      'image': {
        desc: 'Image converted to ASCII art (experimental)',
        props: {
          src: 'string \u2014 data URL or remote URL',
          renderStyle: "'classic' | 'smooth' | 'braille' | 'contour' | 'hatch'",
          brightness: 'number \u2014 -1 to 1',
          contrast: 'number \u2014 -1 to 1',
          invert: 'boolean',
        },
      },
      'edge-path': {
        desc: 'EXPERIMENTAL \u2014 connector line between two layers. May cause rendering issues. Prefer text-block layers with box-drawing characters.',
        props: {
          sourceLayerId: 'string \u2014 ID of the source layer',
          targetLayerId: 'string \u2014 ID of the target layer',
          routingStyle: "'manhattan' | 'straight'",
          waypoints: 'GridPosition[] \u2014 [{col, row}] intermediate points',
        },
      },
      'group': {
        desc: 'Container for child layers (use children[] on the layer)',
        props: { _note: 'No properties object. Children managed via layer.children[]' },
      },
      'component': {
        desc: 'Reusable component instance',
        props: {
          componentId: 'string \u2014 ID of the component definition in document.components',
        },
      },
      'canvas': {
        desc: 'Freeform character painting \u2014 place any characters with per-cell colors. Spaces are transparent. Use FIGMII.paint() to create.',
        props: {
          content: "string \u2014 multiline ASCII art ('\\n'-separated). Spaces are transparent (lower layers show through).",
          cellColors: "Record<'row,col', {color?, bg?}> \u2014 per-cell hex colors for fg and bg. Auto-generated by paint().",
        },
      },
    },
    colorSystem: {
      description: 'All colours are specified as hex strings. Pass color and bg in addLayer() or use updateLayer() with customColors.',
      addLayer: "FIGMII.addLayer({kind:'border-box', col:2, row:2, width:20, height:8, color:'#ffffff', bg:'#1a1a2e'})",
      updateLayer: "FIGMII.updateLayer(id, {customColors: {color:'#e0e0e0', bg:'#0d1117'}})",
      perCell: "FIGMII.stores.document.getState().setLayerCellOverridesBulk(layerId, [{row:0,col:0},{row:0,col:1}], '#ff6600')",
      pageBackground: "FIGMII.stores.document.getState().setPageCellOverridesBulk([{row:0,col:0}], '#0d1117')",
    },
    recipes: {
      note: 'These are core tool operations. You are encouraged to use these as building blocks and explore the full API for your unique design needs.',
      operations: [
        {
          name: 'Place a bordered region',
          code: "FIGMII.addLayer({kind:'border-box', col:2, row:2, width:40, height:10, color:'#6b6b80', bg:'#1a1a2e'})",
          notes: 'borderStyle options: rounded, double, section, custom. Use title prop for inline header text.',
        },
        {
          name: 'Place text',
          code: "FIGMII.addLayer({kind:'text-block', col:4, row:4, width:36, height:3, color:'#e0e0e0', content:'Your text here'})",
          notes: 'kerning: 0 (compact, default), 1 (spaced), 2 (wide). alignment: left/center/right.',
        },
        {
          name: 'Place decorative text',
          code: "FIGMII.addLayer({kind:'figlet-text', col:2, row:1, width:60, height:8, color:'#2563eb', content:'Title', fontName:'koholint'})",
          notes: "Fonts: 'koholint' (default), 'standard', 'small', 'banner', 'slant', 'big', 'kompaktblk', 'six-fo', 'ublk'.",
        },
        {
          name: 'Set colors on layers and cells',
          code: "FIGMII.updateLayer(id, {customColors: {color:'#fff', bg:'#000'}})",
          notes: "Per-cell: FIGMII.stores.document.getState().setLayerCellOverridesBulk(layerId, [{row,col}], '#hexColor'). Page-level: setPageCellOverridesBulk([{row,col}], '#hexColor').",
        },
        {
          name: 'Freeform painting (monochrome)',
          code: "FIGMII.paint({col:2, row:2, content:'\\u256d\\u2500\\u2500\\u2500\\u2500\\u2500\\u256e\\n\\u2502 Hi  \\u2502\\n\\u2570\\u2500\\u2500\\u2500\\u2500\\u2500\\u256f', color:'#ffffff'})",
          notes: 'Spaces are transparent \u2014 lower layers show through. ASCII export works natively.',
        },
        {
          name: 'Freeform painting (per-span colors)',
          code: "FIGMII.paint({col:2, row:2, lines:[[{text:'\\u2591\\u2591\\u2591', color:'#3d3a34'}, {text:'\\u2588\\u2588\\u2588', color:'#8b3a2a'}]]})",
          notes: 'Each span has its own color. No coordinate math needed \u2014 colors are inline with the text.',
        },
        {
          name: 'Resize the page canvas',
          code: 'FIGMII.setPageCanvasSize({cols:300, rows:80})',
          notes: 'Use this to intentionally change the design surface. paint() and layer bounds never resize the page for you.',
        },
        {
          name: 'Verify the design',
          code: 'FIGMII.export.toAscii()',
          notes: 'Returns rendered ASCII string. Also: FIGMII.getLayers() for layer list, FIGMII.getDocument() for full state.',
        },
        {
          name: 'Batch operations',
          code: 'FIGMII.batch(() => { FIGMII.addLayer(...); FIGMII.addLayer(...); })',
          notes: 'ALWAYS wrap multiple mutations in batch(). Single undo entry, single render, prevents layer loss.',
        },
        {
          name: 'Organize layers',
          code: 'FIGMII.stores.ui.getState().setSelectedLayers([id1, id2]); FIGMII.stores.document.getState().groupSelectedLayers();',
          notes: 'Z-order: bringToFront(), sendToBack(), bringForward(), sendBackward() on document store.',
        },
        {
          name: 'Read state and undo',
          code: 'FIGMII.getDocument(); FIGMII.stores.document.getState().undo();',
          notes: 'getLayers() returns all layers. findLayer(name) finds by name. findLayers({kind}) filters by type.',
        },
      ],
    },
    warnings: [
      'Structured layer creation (border-box, divider, text-block) is a Human-mode capability. AI mode rejects those kinds through addLayer().',
      'edge-path layers are experimental and frequently crash the renderer. Use text-block layers with box-drawing characters (\u2502\u2500\u250c\u2514\u251c\u2524\u25c6\u25cf) for connections instead.',
      "Never call mutation methods (addLayer, updateLayer, etc.) inside FIGMII.subscribe('document') callbacks \u2014 this creates an infinite loop.",
      'Always wrap multiple mutations in FIGMII.batch(). Unbatched rapid mutations can lose layers and create excessive undo entries.',
    ],
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
}

function buildRawBriefing(document: FIGMIIDocument) {
  const activePageCanvas = getActivePageCanvasInfo(document);

  return {
    system: 'FIGMII \u2014 ASCII Grid Design Tool',
    version: '2.0',
    mode: 'raw' as const,
    interfaceMode: 'ai' as const,
    purpose:
      'Freeform ASCII art canvas optimized for agents. Use FIGMII.paint() as the primary creative primitive, FIGMII.addFiglet() when preset FIGlet fonts are helpful, and setPageCanvasSize() when you intentionally need a different surface size. Structured layer creation is intentionally unavailable in AI mode.',
    gridSystem: {
      description:
        'The canvas is a 2D grid of monospace character cells. Every position is addressed by (col, row). There are no sub-cell positions. Spaces are transparent \u2014 lower layers show through. paint() never changes the page dimensions.',
      defaults: {
        fontFamily: document.gridConfig.fontFamily,
        fontSize: document.gridConfig.fontSize,
        lineHeight: document.gridConfig.lineHeight,
        cellWidth: document.gridConfig.cellWidth,
        cellHeight: document.gridConfig.cellHeight,
        canvasCols: document.gridConfig.canvasCols,
        canvasRows: document.gridConfig.canvasRows,
      },
    },
    document: {
      name: document.name,
      pageCount: document.pages.length,
      activePageId: document.activePageId,
    },
    canvasSize: {
      description:
        'The canvas is fundamentally a row/column ASCII surface. The default size is the standard output surface unless you explicitly override it.',
      default: {
        cols: document.gridConfig.canvasCols,
        rows: document.gridConfig.canvasRows,
      },
      activePage: activePageCanvas,
      control:
        "Use FIGMII.setPageCanvasSize({cols, rows, pageId?, allowClip?}) to change the surface. Use FIGMII.resetPageCanvasSize(pageId?) to return to the default size.",
    },
    api: {
      global: 'window.FIGMII',
      briefing: 'window.FIGMII.briefing \u2014 returns this parsed briefing object',
      convenience: [
        'getDocument()',
        'getActivePage()',
        'addPage(name) => pageId',
        'setActivePage(id)',
        'getPage(id)',
        'setPageRuntime(pageId, metadata)',
        'createRuntimeAnnotation(spec) => annotationId',
        'updateRuntimeAnnotation(id, updates)',
        "inferRuntimeSemantics({pageIds?, strategy:'aggressive'})",
        'validateRuntimeSemantics()',
        'getPageCanvasSize(pageId?)',
        "setPageCanvasSize({cols, rows, pageId?, allowClip?})",
        'resetPageCanvasSize(pageId?)',
        'getLayers()',
        'getLayer(id)',
        'removeLayer(id)',
        'moveLayer(id, col, row)',
        'findLayer(name)',
        "addFiglet({content, col, row, fontName?, alignment?, color?, bg?, name?}) \u2014 FIGlet helper for ASCII display text",
        "paint({col, row, lines?, content?, color?, bg?, name?}) \u2014 freeform character painting with per-span colors. Returns layerId",
        'export.toAscii(pageId?) \u2014 rendered ASCII string for verification',
        'export.toJson()',
        'export.toDesignPackage({includeRenderOracle?})',
        'export.toSemantics()',
        "setInterfaceMode('ai' | 'human')",
        "getInterfaceMode() \u2014 returns the visible shell mode ('ai' or 'human')",
        "setAgentMode('full' | 'raw') \u2014 compatibility alias for setInterfaceMode()",
        "getAgentMode() \u2014 compatibility alias returning 'raw' in AI mode and 'full' in Human mode",
      ],
      batch: 'FIGMII.batch(() => { ...mutations... }) \u2014 single undo entry. ALWAYS use batch() when placing multiple paint layers.',
      subscribe: "FIGMII.subscribe('document'|'selection'|'tool', cb) => unsub \u2014 WARNING: never call mutation methods inside the 'document' callback; that creates an infinite loop and crashes the tab.",
      subscribeRecovery: 'If a render error occurs, a FIGMII_RECOVERY console entry appears with exact recovery commands. Short version: FIGMII.stores.document.getState().undo() then click Dismiss.',
      storeExamples: {
        undo: 'FIGMII.stores.document.getState().undo()',
        zoom: 'FIGMII.viewport.setZoom(1.5)',
        fitToPage: 'FIGMII.viewport.fitToPage()',
        canvasSize: 'FIGMII.setPageCanvasSize({ cols: 300, rows: 80 })',
        paintCells:
          "FIGMII.stores.document.getState().setLayerCellOverridesBulk(layerId, [{row,col}], '#hexColor')",
        paintPage:
          "FIGMII.stores.document.getState().setPageCellOverridesBulk([{row,col}], '#hexColor')",
      },
    },
    colorSystem: {
      description: 'All colours are hex strings (e.g. \'#ffffff\', \'#1a1a2e\'). Pass color (foreground) and bg (background) to paint().',
      perCell: "FIGMII.stores.document.getState().setLayerCellOverridesBulk(layerId, [{row:0,col:0},{row:0,col:1}], '#ff6600')",
      pageBackground: "FIGMII.stores.document.getState().setPageCellOverridesBulk([{row:0,col:0}], '#0d1117')",
    },
    recipes: {
      note: 'Use paint() for all design work. You have complete creative freedom over characters, layout, and colours.',
      operations: [
        {
          name: 'Freeform painting (monochrome)',
          code: "FIGMII.paint({col:2, row:2, content:'\u256d\u2500\u2500\u2500\u2500\u2500\u256e\\n\u2502 Hi  \u2502\\n\u2570\u2500\u2500\u2500\u2500\u2500\u256f', color:'#ffffff'})",
          notes: 'Spaces are transparent. Use any Unicode characters \u2014 box-drawing (\u2500\u2502\u256d\u256e\u256f\u2570), blocks (\u2588\u2591\u2592\u2593), symbols, etc.',
        },
        {
          name: 'Freeform painting (per-span colors)',
          code: "FIGMII.paint({col:2, row:2, lines:[[{text:'\u2591\u2591\u2591', color:'#3d3a34'}, {text:'\u2588\u2588\u2588', color:'#8b3a2a'}]]})",
          notes: 'Each span in a line has its own color and bg. No coordinate math needed \u2014 colours are inline with the text.',
        },
        {
          name: 'Add FIGlet text',
          code: "FIGMII.addFiglet({col:2, row:1, content:'Title', fontName:'koholint', color:'#2563eb'})",
          notes: 'Use this when you want stylized ASCII display text without switching to Human mode.',
        },
        {
          name: 'Resize the page canvas',
          code: 'FIGMII.setPageCanvasSize({cols:300, rows:80})',
          notes: 'Use this when you want a non-default ASCII surface. paint() layers stay inside the existing page size unless you change it explicitly.',
        },
        {
          name: 'Verify the design',
          code: 'FIGMII.export.toAscii()',
          notes: 'Returns rendered ASCII string. Also: FIGMII.getLayers() for layer list.',
        },
        {
          name: 'Batch operations',
          code: 'FIGMII.batch(() => { FIGMII.paint(...); FIGMII.paint(...); })',
          notes: 'ALWAYS wrap multiple paint() calls in batch(). Single undo entry, single render.',
        },
        {
          name: 'Read state and undo',
          code: 'FIGMII.getDocument(); FIGMII.stores.document.getState().undo();',
          notes: 'getLayers() returns all layers. findLayer(name) finds by name.',
        },
      ],
    },
    warnings: [
      'FIGMII.addLayer() rejects border-box, divider, and text-block in AI mode. Use paint(), addFiglet(), or switch to Human mode.',
      "Never call mutation methods (paint, removeLayer, etc.) inside FIGMII.subscribe('document') callbacks \u2014 this creates an infinite loop.",
      'Always wrap multiple mutations in FIGMII.batch(). Unbatched rapid mutations can lose layers and create excessive undo entries.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Hidden component that embeds two structured JSON elements for AI agents:
 *
 * 1. #figmii-agent-briefing  — API reference. In 'full' mode: layer kinds, recipes,
 *    DOM selectors. In 'raw' mode: stripped to paint() + grid info only.
 *
 * 2. [data-spec="full-document"] — live document snapshot that re-renders whenever the Zustand
 *    document store changes. Agents can read current design state without any JS calls.
 *
 * Both are referenced via aria-describedby on #app-root so the accessibility tree points to them.
 */
export function AgentBriefing({ document }: AgentBriefingProps): ReactNode {
  const interfaceMode = useUiStore((s) => s.interfaceMode);
  const isFirstRender = useRef(true);
  const mode = interfaceMode === 'ai' ? 'raw' : 'full';

  const briefing = useMemo(
    () => mode === 'raw' ? buildRawBriefing(document) : buildFullBriefing(document),
    [mode, document],
  );

  const briefingJson = useMemo(() => JSON.stringify(briefing), [briefing]);
  const documentJson = useMemo(() => JSON.stringify(document), [document]);

  // Log mode changes to console (skip initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    console.log('FIGMII_STATE', {
      action: 'interface_mode_change',
      timestamp: Date.now(),
      interfaceMode,
      agentBriefingMode: mode,
    });
  }, [interfaceMode, mode]);

  return (
    <>
      <script
        type="application/json"
        id="figmii-agent-briefing"
        dangerouslySetInnerHTML={{ __html: briefingJson }}
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
