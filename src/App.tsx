import { CanvasViewport } from '@features/canvas/CanvasViewport.tsx';
import { LayersPanel } from '@features/layers-panel/LayersPanel.tsx';
import { PropertiesPanel } from '@features/properties-panel/PropertiesPanel.tsx';
import { Toolbar } from '@features/toolbar/Toolbar.tsx';
import { StatusBar } from '@features/status-bar/StatusBar.tsx';
import { SpecView } from '@features/spec-view/SpecView.tsx';
import { ExportDialog } from '@features/export/ExportDialog.tsx';
import { useAutoSave } from '@features/file-io/autoSave.ts';
import { useClipboard } from '@features/clipboard/useClipboard.ts';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts.ts';
import { useConsoleLogger } from '@hooks/useConsoleLogger.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { AgentBriefing } from '@renderer/AgentBriefing.tsx';
import styles from './styles/layout.module.css';

export function App() {
  useKeyboardShortcuts();
  useAutoSave();
  useClipboard();
  useConsoleLogger();

  const document = useDocumentStore((s) => s.document);
  const specViewOpen = useUiStore((s) => s.specViewOpen);
  const toggleSpecView = useUiStore((s) => s.toggleSpecView);
  const exportDialogOpen = useUiStore((s) => s.exportDialogOpen);
  const toggleExportDialog = useUiStore((s) => s.toggleExportDialog);
  const layersPanelOpen = useUiStore((s) => s.layersPanelOpen);
  const propertiesPanelOpen = useUiStore((s) => s.propertiesPanelOpen);
  const toggleLayersPanel = useUiStore((s) => s.toggleLayersPanel);
  const togglePropertiesPanel = useUiStore((s) => s.togglePropertiesPanel);

  const gridColumns = `${layersPanelOpen ? '240px' : '36px'} 1fr ${propertiesPanelOpen ? '280px' : '36px'}`;

  return (
    <div
      id="app-root"
      className={styles.shell}
      style={{ gridTemplateColumns: gridColumns }}
      aria-describedby="figme-agent-briefing"
    >
      <AgentBriefing document={document} />
      <header className={styles.toolbar}>
        <Toolbar />
        <div className={styles.toolbarActions}>
          <button
            className={styles.exportButton}
            onClick={toggleExportDialog}
            title="Export (Ctrl+Shift+E)"
          >
            Export
          </button>
        </div>
      </header>
      <aside className={styles.layersPanel}>
        {layersPanelOpen ? (
          <LayersPanel />
        ) : (
          <div className={styles.collapsedStrip} data-component="collapsed-layers">
            <button
              className={styles.expandButton}
              onClick={toggleLayersPanel}
              aria-label="Expand layers panel"
              aria-expanded={false}
              title="Expand layers panel (Ctrl+\)"
            >
              {'\u00BB'}
            </button>
            <span className={styles.rotatedLabel}>Layers</span>
          </div>
        )}
      </aside>
      <main className={styles.canvas}>
        <CanvasViewport />
      </main>
      <aside className={styles.propertiesPanel}>
        {propertiesPanelOpen ? (
          <PropertiesPanel />
        ) : (
          <div className={styles.collapsedStrip} data-component="collapsed-properties">
            <button
              className={styles.expandButton}
              onClick={togglePropertiesPanel}
              aria-label="Expand properties panel"
              aria-expanded={false}
              title="Expand properties panel (Ctrl+Shift+\)"
            >
              {'\u00AB'}
            </button>
            <span className={styles.rotatedLabel}>Properties</span>
          </div>
        )}
      </aside>
      <StatusBar />
      <SpecView visible={specViewOpen} onClose={toggleSpecView} />
      <ExportDialog visible={exportDialogOpen} onClose={toggleExportDialog} />
    </div>
  );
}
