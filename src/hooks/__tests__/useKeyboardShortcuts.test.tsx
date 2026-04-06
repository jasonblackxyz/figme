import { render, fireEvent } from '@testing-library/react';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts.ts';
import { useToolStore } from '@stores/toolStore.ts';

function KeyboardShortcutsHarness() {
  useKeyboardShortcuts();
  return null;
}

beforeEach(() => {
  useToolStore.setState({ activeTool: 'select' });
});

describe('useKeyboardShortcuts', () => {
  it('switches to the draw tool on P', () => {
    render(<KeyboardShortcutsHarness />);

    fireEvent.keyDown(window, { key: 'p' });

    expect(useToolStore.getState().activeTool).toBe('draw');
  });
});
