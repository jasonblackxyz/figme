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
import { useUiStore } from '@stores/uiStore.ts';
import styles from './styles/layout.module.css';

export function App() {
  useKeyboardShortcuts();
  useAutoSave();
  useClipboard();
  useConsoleLogger();

  const specViewOpen = useUiStore((s) => s.specViewOpen);
  const toggleSpecView = useUiStore((s) => s.toggleSpecView);
  const exportDialogOpen = useUiStore((s) => s.exportDialogOpen);
  const toggleExportDialog = useUiStore((s) => s.toggleExportDialog);

  return (
    <div className={styles.shell}>
      <header className={styles.toolbar}>
        <Toolbar />
      </header>
      <aside className={styles.layersPanel}>
        <LayersPanel />
      </aside>
      <main className={styles.canvas}>
        <CanvasViewport />
      </main>
      <aside className={styles.propertiesPanel}>
        <PropertiesPanel />
      </aside>
      <StatusBar />
      <SpecView visible={specViewOpen} onClose={toggleSpecView} />
      <ExportDialog visible={exportDialogOpen} onClose={toggleExportDialog} />
    </div>
  );
}
