import { render, fireEvent } from '@testing-library/react';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FigMeDocument } from '@primitives/document-model/types.ts';

function KeyboardShortcutsHarness() {
  useKeyboardShortcuts();
  return <button type="button">Keyboard host</button>;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    const base = createEmptyDocument('Shortcut Test');
    const page = base.pages[0]!;
    const doc: FigMeDocument = {
      ...base,
      pages: [{
        ...page,
        layers: {
          layer1: {
            id: 'layer1',
            kind: 'divider',
            name: 'Divider',
            rect: { col: 0, row: 0, width: 4, height: 1 },
            visible: true,
            locked: false,
            opacity: 1,
            styleKey: 'border',
            properties: {},
          },
        },
        layerOrder: ['layer1'],
      }],
      activePageId: page.id,
    };

    useDocumentStore.setState({
      document: doc,
      undoStack: [],
      redoStack: [],
    });
    useToolStore.setState({ activeTool: 'select' });
    useUiStore.setState({
      selectedLayerIds: ['layer1'],
      exportDialogOpen: false,
      specViewOpen: false,
    });
  });

  it('switches to the draw tool on P', () => {
    render(<KeyboardShortcutsHarness />);

    fireEvent.keyDown(window, { key: 'p' });

    expect(useToolStore.getState().activeTool).toBe('draw');
  });

  it('suppresses editor shortcuts while the export dialog is open', () => {
    useUiStore.setState({ exportDialogOpen: true });
    const { getByText } = render(<KeyboardShortcutsHarness />);
    getByText('Keyboard host').focus();

    fireEvent.keyDown(window, { key: 'b' });
    fireEvent.keyDown(window, { key: 'Delete' });

    expect(useToolStore.getState().activeTool).toBe('select');
    expect(useDocumentStore.getState().document.pages[0]!.layers.layer1).toBeDefined();
  });

  it('still lets Ctrl+Shift+E close the export dialog', () => {
    useUiStore.setState({ exportDialogOpen: true });
    render(<KeyboardShortcutsHarness />);

    fireEvent.keyDown(window, { key: 'E', ctrlKey: true, shiftKey: true });

    expect(useUiStore.getState().exportDialogOpen).toBe(false);
  });
});
