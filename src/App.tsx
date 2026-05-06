import { useEffect, useRef } from 'react';
import { ArtboardTabs } from '@features/artboard-manager/ArtboardTabs.tsx';
import { CanvasViewport } from '@features/canvas/CanvasViewport.tsx';
import { LayersPanel } from '@features/layers-panel/LayersPanel.tsx';
import { PropertiesPanel } from '@features/properties-panel/PropertiesPanel.tsx';
import { Toolbar } from '@features/toolbar/Toolbar.tsx';
import { StatusBar } from '@features/status-bar/StatusBar.tsx';
import { SpecView } from '@features/spec-view/SpecView.tsx';
import { ExportDialog } from '@features/export/ExportDialog.tsx';
import { ImportDialog } from '@features/import/ImportDialog.tsx';
import { ClearCanvasDialog } from '@features/clear-canvas/ClearCanvasDialog.tsx';
import { LabelPicker } from '@features/region-labeling/LabelPicker.tsx';
import { useAutoSave } from '@features/file-io/autoSave.ts';
import { getTabId } from '@features/file-io/tabSession.ts';
import { cleanupStaleTabs } from '@features/file-io/staleCleanup.ts';
import { useClipboard } from '@features/clipboard/useClipboard.ts';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts.ts';
import { useConsoleLogger } from '@hooks/useConsoleLogger.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { useToolStore, isToolAllowedInInterfaceMode } from '@stores/toolStore.ts';
import { AgentBriefing } from '@renderer/AgentBriefing.tsx';
import { AppErrorBoundary } from '@renderer/AppErrorBoundary.tsx';
import styles from './styles/layout.module.css';

export function App() {
  useKeyboardShortcuts();
  useAutoSave();
  useClipboard();
  useConsoleLogger();

  // Recover persisted document on mount. Ref guard prevents double-fire in StrictMode.
  const persistenceInitialized = useRef(false);
  useEffect(() => {
    if (persistenceInitialized.current) return;
    persistenceInitialized.current = true;
    const tabId = getTabId();
    useDocumentStore.getState().initializeFromPersistence(tabId);
    // Clean up stale saves from closed tabs (non-blocking, delayed)
    setTimeout(() => { cleanupStaleTabs().catch(() => {}); }, 5000);
  }, []);

  const document = useDocumentStore((s) => s.document);
  const specViewOpen = useUiStore((s) => s.specViewOpen);
  const toggleSpecView = useUiStore((s) => s.toggleSpecView);
  const exportDialogOpen = useUiStore((s) => s.exportDialogOpen);
  const setExportDialogOpen = useUiStore((s) => s.setExportDialogOpen);
  const importDialogOpen = useUiStore((s) => s.importDialogOpen);
  const setImportDialogOpen = useUiStore((s) => s.setImportDialogOpen);
  const clearCanvasDialogOpen = useUiStore((s) => s.clearCanvasDialogOpen);
  const toggleClearCanvasDialog = useUiStore((s) => s.toggleClearCanvasDialog);
  const interfaceMode = useUiStore((s) => s.interfaceMode);
  const toggleInterfaceMode = useUiStore((s) => s.toggleInterfaceMode);
  const layersPanelOpen = useUiStore((s) => s.layersPanelOpen);
  const propertiesPanelOpen = useUiStore((s) => s.propertiesPanelOpen);
  const toggleLayersPanel = useUiStore((s) => s.toggleLayersPanel);
  const togglePropertiesPanel = useUiStore((s) => s.togglePropertiesPanel);
  const activeTool = useToolStore((s) => s.activeTool);

  const collapsedLayersButtonRef = useRef<HTMLButtonElement>(null);
  const collapsedPropertiesButtonRef = useRef<HTMLButtonElement>(null);
  const previousLayersPanelOpen = useRef(layersPanelOpen);
  const previousPropertiesPanelOpen = useRef(propertiesPanelOpen);

  useEffect(() => {
    if (previousLayersPanelOpen.current && !layersPanelOpen) {
      collapsedLayersButtonRef.current?.focus();
    }
    previousLayersPanelOpen.current = layersPanelOpen;
  }, [layersPanelOpen]);

  useEffect(() => {
    if (previousPropertiesPanelOpen.current && !propertiesPanelOpen) {
      collapsedPropertiesButtonRef.current?.focus();
    }
    previousPropertiesPanelOpen.current = propertiesPanelOpen;
  }, [propertiesPanelOpen]);

  useEffect(() => {
    if (interfaceMode === 'ai' && !isToolAllowedInInterfaceMode(activeTool, interfaceMode)) {
      useToolStore.getState().setActiveTool('select');
    }
  }, [activeTool, interfaceMode]);

  const gridColumns = interfaceMode === 'human'
    ? `${layersPanelOpen ? '240px' : '36px'} 1fr ${propertiesPanelOpen ? '280px' : '36px'}`
    : undefined;
  const shellClassName = `${styles.shell} ${interfaceMode === 'ai' ? styles.shellAi : styles.shellHuman}`;

  return (
    <AppErrorBoundary>
    <div
      id="app-root"
      className={shellClassName}
      style={{ gridTemplateColumns: gridColumns }}
      aria-describedby="figmii-agent-briefing"
    >
      <AgentBriefing document={document} />
      <header className={styles.topBar} data-component="shell-topbar">
        <button
          className={styles.modeSwitch}
          onClick={toggleInterfaceMode}
          title={`Switch to ${interfaceMode === 'ai' ? 'Human' : 'AI'} mode (Ctrl+Shift+M)`}
          data-action="toggle-interface-mode"
        >
          Switch to {interfaceMode === 'ai' ? 'Human' : 'AI'} Mode
        </button>
        <div className={styles.pageTabs}>
          <ArtboardTabs />
        </div>
        <div className={styles.topBarActions}>
          <button
            className={styles.actionButton}
            onClick={() => setImportDialogOpen(true)}
            title="Import (Ctrl+O)"
            data-action="import"
          >
            Import
          </button>
          <button
            className={styles.actionButton}
            onClick={() => setExportDialogOpen(true)}
            title="Export (Ctrl+Shift+E)"
            data-action="export"
          >
            Export
          </button>
          <button
            className={styles.actionButton}
            onClick={() => useViewportStore.getState().setAutoFitEnabled(true)}
            title="Fit to page (Ctrl+1)"
            data-action="fit-to-page"
          >
            Fit
          </button>
          <button
            className={styles.actionButton}
            onClick={() => useViewportStore.getState().resetView()}
            title="Reset view (Ctrl+0)"
            data-action="reset-view"
          >
            Reset View
          </button>
          <button
            className={styles.actionButton}
            onClick={toggleClearCanvasDialog}
            title="Clear all layers on the current page"
            data-action="clear-canvas"
          >
            Clear
          </button>
        </div>
      </header>
      {interfaceMode === 'human' ? (
        <header className={styles.toolbar}>
          <Toolbar />
        </header>
      ) : null}
      {interfaceMode === 'human' ? (
        <aside className={styles.layersPanel}>
          {layersPanelOpen ? (
            <LayersPanel />
          ) : (
            <div className={styles.collapsedStrip} data-component="collapsed-layers">
              <button
                ref={collapsedLayersButtonRef}
                className={styles.expandButton}
                onClick={toggleLayersPanel}
                aria-label="Expand layers panel"
                aria-expanded={false}
                title="Expand layers panel"
              >
                {'\u00BB'}
              </button>
              <span className={styles.rotatedLabel}>Layers</span>
            </div>
          )}
        </aside>
      ) : null}
      <main className={styles.canvas}>
        <CanvasViewport />
      </main>
      {interfaceMode === 'human' ? (
        <aside className={styles.propertiesPanel}>
          {propertiesPanelOpen ? (
            <PropertiesPanel />
          ) : (
            <div className={styles.collapsedStrip} data-component="collapsed-properties">
              <button
                ref={collapsedPropertiesButtonRef}
                className={styles.expandButton}
                onClick={togglePropertiesPanel}
                aria-label="Expand properties panel"
                aria-expanded={false}
                title="Expand properties panel"
              >
                {'\u00AB'}
              </button>
              <span className={styles.rotatedLabel}>Properties</span>
            </div>
          )}
        </aside>
      ) : null}
      {interfaceMode === 'human' ? <StatusBar /> : null}
      <SpecView visible={specViewOpen} onClose={toggleSpecView} />
      <ImportDialog visible={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
      <ExportDialog visible={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />
      <ClearCanvasDialog visible={clearCanvasDialogOpen} onClose={toggleClearCanvasDialog} />
      <LabelPicker />
    </div>
    </AppErrorBoundary>
  );
}
