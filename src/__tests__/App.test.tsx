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

vi.mock('@features/export/ExportDialog.tsx', () => ({
  ExportDialog: ({ visible }: { visible: boolean }) => (visible ? <div>Export Dialog</div> : null),
}));

vi.mock('@features/file-io/autoSave.ts', () => ({
  useAutoSave: () => undefined,
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
    selectedLayerIds: [],
    hoveredLayerId: null,
    layersPanelOpen: true,
    propertiesPanelOpen: true,
    specViewOpen: false,
    exportDialogOpen: false,
    isDragging: false,
    dragStartPos: null,
    marqueeRect: null,
    drawingPreview: null,
    editingLayerId: null,
    smartGuidesEnabled: true,
  });
});

describe('App', () => {
  it('renders a visible export button and opens the dialog from it', () => {
    render(<App />);

    const exportButton = screen.getByRole('button', { name: 'Export' });
    expect(exportButton).toBeInTheDocument();

    fireEvent.click(exportButton);
    expect(screen.getByText('Export Dialog')).toBeInTheDocument();
  });

  it('toggles the properties panel with Ctrl+Shift+Backslash', () => {
    render(<App />);

    fireEvent.keyDown(window, {
      ctrlKey: true,
      shiftKey: true,
      key: '|',
      code: 'Backslash',
    });

    expect(screen.getByLabelText('Expand properties panel')).toBeInTheDocument();
  });

  it('moves focus to the layers expand button after collapsing the panel', async () => {
    render(<App />);

    const collapseButton = screen.getByLabelText('Collapse layers panel');
    collapseButton.focus();

    fireEvent.click(collapseButton);

    const expandButton = screen.getByLabelText('Expand layers panel');
    await waitFor(() => expect(expandButton).toHaveFocus());
  });
});
