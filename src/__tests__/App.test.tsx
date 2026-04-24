import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { App } from '../App.tsx';

vi.mock('@features/canvas/CanvasViewport.tsx', () => ({
  CanvasViewport: () => <div>Canvas</div>,
}));

vi.mock('@features/layers-panel/LayersPanel.tsx', async () => {
  const { useUiStore: store } = await import('@stores/uiStore.ts');
  return {
    LayersPanel: () => {
      const toggleLayersPanel = store((s) => s.toggleLayersPanel);
      return (
        <button onClick={toggleLayersPanel} aria-label="Collapse layers panel">
          Collapse layers
        </button>
      );
    },
  };
});

vi.mock('@features/properties-panel/PropertiesPanel.tsx', async () => {
  const { useUiStore: store } = await import('@stores/uiStore.ts');
  return {
    PropertiesPanel: () => {
      const togglePropertiesPanel = store((s) => s.togglePropertiesPanel);
      return (
        <button onClick={togglePropertiesPanel} aria-label="Collapse properties panel">
          Collapse properties
        </button>
      );
    },
  };
});

vi.mock('@features/toolbar/Toolbar.tsx', () => ({
  Toolbar: () => <div>Toolbar</div>,
}));

vi.mock('@features/status-bar/StatusBar.tsx', () => ({
  StatusBar: () => <div>Status</div>,
}));

vi.mock('@features/spec-view/SpecView.tsx', () => ({
  SpecView: () => null,
}));

vi.mock('@features/import/ImportDialog.tsx', () => ({
  ImportDialog: ({ visible }: { visible: boolean }) => (visible ? <div>Import Dialog</div> : null),
}));

vi.mock('@features/export/ExportDialog.tsx', () => ({
  ExportDialog: ({ visible }: { visible: boolean }) => (visible ? <div>Export Dialog</div> : null),
}));

vi.mock('@features/file-io/autoSave.ts', () => ({
  useAutoSave: () => undefined,
}));

vi.mock('@features/file-io/tabSession.ts', () => ({
  getTabId: () => 'test-tab',
}));

vi.mock('@features/file-io/staleCleanup.ts', () => ({
  cleanupStaleTabs: () => Promise.resolve(),
  isLegacyMigrated: () => true,
  cleanupLegacySaves: () => Promise.resolve(),
}));

vi.mock('@features/clipboard/useClipboard.ts', () => ({
  useClipboard: () => undefined,
}));

vi.mock('@hooks/useConsoleLogger.ts', () => ({
  useConsoleLogger: () => undefined,
}));

vi.mock('@renderer/AgentBriefing.tsx', () => ({
  AgentBriefing: () => null,
}));

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Test Document'),
    undoStack: [],
    redoStack: [],
  });

  useUiStore.setState({
    interfaceMode: 'ai',
    selectedLayerIds: [],
    hoveredLayerId: null,
    layersPanelOpen: true,
    propertiesPanelOpen: true,
    specViewOpen: false,
    exportDialogOpen: false,
    importDialogOpen: false,
    clearCanvasDialogOpen: false,
    isDragging: false,
    dragStartPos: null,
    marqueeRect: null,
    drawingPreview: null,
    editingLayerId: null,
    smartGuidesEnabled: true,
  });
});

describe('App', () => {
  it('starts in AI mode with the lean shell', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Switch to Human Mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByText('Canvas')).toBeInTheDocument();
    expect(screen.queryByText('Toolbar')).not.toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Collapse layers panel')).not.toBeInTheDocument();
  });

  it('renders a visible export button and opens the dialog from it', () => {
    render(<App />);

    const exportButton = screen.getByRole('button', { name: 'Export' });
    expect(exportButton).toBeInTheDocument();

    fireEvent.click(exportButton);
    expect(screen.getByText('Export Dialog')).toBeInTheDocument();
  });

  it('renders a visible import button and opens the dialog from it', () => {
    render(<App />);

    const importButton = screen.getByRole('button', { name: 'Import' });
    expect(importButton).toBeInTheDocument();

    fireEvent.click(importButton);
    expect(screen.getByText('Import Dialog')).toBeInTheDocument();
  });

  it('switches to Human mode and restores the full shell', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Human Mode' }));

    expect(screen.getByRole('button', { name: 'Switch to AI Mode' })).toBeInTheDocument();
    expect(screen.getByText('Toolbar')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse layers panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse properties panel')).toBeInTheDocument();
  });

  it('does not toggle the properties panel via keyboard shortcut', () => {
    useUiStore.setState({ interfaceMode: 'human' });
    render(<App />);

    // Ctrl+Shift+\ was removed to prevent accidental panel hiding
    fireEvent.keyDown(window, {
      ctrlKey: true,
      shiftKey: true,
      key: '|',
      code: 'Backslash',
    });

    // panel should still be open (shortcut is a no-op now)
    expect(screen.queryByLabelText('Expand properties panel')).not.toBeInTheDocument();
  });

  it('moves focus to the layers expand button after collapsing the panel', async () => {
    useUiStore.setState({ interfaceMode: 'human' });
    render(<App />);

    const collapseButton = screen.getByLabelText('Collapse layers panel');
    collapseButton.focus();

    fireEvent.click(collapseButton);

    const expandButton = screen.getByLabelText('Expand layers panel');
    await waitFor(() => expect(expandButton).toHaveFocus());
  });
});
