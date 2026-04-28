import { render, fireEvent } from '@testing-library/react';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FIGMIIDocument } from '@primitives/document-model/types.ts';

function KeyboardShortcutsHarness() {
  useKeyboardShortcuts();
  return <button type="button">Keyboard host</button>;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    const base = createEmptyDocument('Shortcut Test');
    const page = base.pages[0]!;
    const doc: FIGMIIDocument = {
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
      interfaceMode: 'ai',
      selectedLayerIds: ['layer1'],
      importDialogOpen: false,
      exportDialogOpen: false,
      specViewOpen: false,
      editingLayerId: null,
    });
  });

  it('keeps AI-mode-only blocked shortcuts on select', () => {
    render(<KeyboardShortcutsHarness />);

    fireEvent.keyDown(window, { key: 'p' });

    expect(useToolStore.getState().activeTool).toBe('select');
  });

  it('allows the draw shortcut after switching to Human mode', () => {
    useUiStore.setState({ interfaceMode: 'human' });
    render(<KeyboardShortcutsHarness />);

    fireEvent.keyDown(window, { key: 'p' });

    expect(useToolStore.getState().activeTool).toBe('draw');
  });

  it('toggles interface mode with Ctrl+Shift+M', () => {
    render(<KeyboardShortcutsHarness />);

    fireEvent.keyDown(window, { key: 'M', ctrlKey: true, shiftKey: true });

    expect(useUiStore.getState().interfaceMode).toBe('human');
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

  it('toggles the import dialog with Ctrl+O and lets Ctrl+O close it again', () => {
    render(<KeyboardShortcutsHarness />);

    fireEvent.keyDown(window, { key: 'o', ctrlKey: true });
    expect(useUiStore.getState().importDialogOpen).toBe(true);

    fireEvent.keyDown(window, { key: 'o', ctrlKey: true });
    expect(useUiStore.getState().importDialogOpen).toBe(false);
  });
});
