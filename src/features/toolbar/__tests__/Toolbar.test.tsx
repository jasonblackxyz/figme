import { act, render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../Toolbar.tsx';
import { useToolStore } from '@stores/toolStore.ts';

beforeEach(() => {
  useToolStore.setState({ activeTool: 'select' });
});

describe('Toolbar', () => {
  it('renders all tool buttons with labels', () => {
    render(<Toolbar />);
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Hand')).toBeInTheDocument();
    expect(screen.getByText('Box')).toBeInTheDocument();
    expect(screen.getByText('Divider')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('FIGlet')).toBeInTheDocument();
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });

  it('renders visual separators between tool groups', () => {
    render(<Toolbar />);
    expect(screen.queryAllByRole('separator')).toHaveLength(0);
    const toolbar = screen.getByRole('toolbar');
    const separators = toolbar.querySelectorAll('div[aria-hidden="true"]');
    expect(separators).toHaveLength(3);
  });

  it('exposes the intended accessible names for each tool', () => {
    render(<Toolbar />);
    expect(screen.getByRole('button', { name: 'Select (V)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hand (H)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Box (B)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Divider (D)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Text (T)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FIGlet (F)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Draw (P)' })).toBeInTheDocument();
  });

  it('keeps toolbar icons out of the accessibility tree', () => {
    render(<Toolbar />);
    for (const name of ['Select (V)', 'Hand (H)', 'Box (B)', 'Divider (D)', 'Text (T)', 'FIGlet (F)', 'Draw (P)']) {
      const button = screen.getByRole('button', { name });
      const icon = button.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('renders as a toolbar nav element', () => {
    render(<Toolbar />);
    const nav = screen.getByRole('toolbar');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Design tools');
    expect(nav).toHaveAttribute('data-component', 'toolbar');
  });

  it('sets aria-pressed on active tool', () => {
    render(<Toolbar />);
    const selectBtn = screen.getByLabelText('Select (V)');
    expect(selectBtn).toHaveAttribute('aria-pressed', 'true');

    const borderBoxBtn = screen.getByLabelText('Box (B)');
    expect(borderBoxBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets data-tool attribute on each button', () => {
    render(<Toolbar />);
    const selectBtn = screen.getByLabelText('Select (V)');
    expect(selectBtn).toHaveAttribute('data-tool', 'select');

    const borderBoxBtn = screen.getByLabelText('Box (B)');
    expect(borderBoxBtn).toHaveAttribute('data-tool', 'border-box');
  });

  it('changes active tool on click', () => {
    render(<Toolbar />);
    const borderBoxBtn = screen.getByLabelText('Box (B)');
    fireEvent.click(borderBoxBtn);
    expect(useToolStore.getState().activeTool).toBe('border-box');
  });

  it('updates aria-pressed when active tool changes', () => {
    const { rerender } = render(<Toolbar />);
    act(() => {
      useToolStore.setState({ activeTool: 'hand' });
    });
    rerender(<Toolbar />);

    const handBtn = screen.getByLabelText('Hand (H)');
    expect(handBtn).toHaveAttribute('aria-pressed', 'true');

    const selectBtn = screen.getByLabelText('Select (V)');
    expect(selectBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('includes title attributes with shortcut hints', () => {
    render(<Toolbar />);
    const selectBtn = screen.getByLabelText('Select (V)');
    expect(selectBtn).toHaveAttribute('title', 'Select (V)');

    const dividerBtn = screen.getByLabelText('Divider (D)');
    expect(dividerBtn).toHaveAttribute('title', 'Divider (D)');

    const drawBtn = screen.getByLabelText('Draw (P)');
    expect(drawBtn).toHaveAttribute('title', 'Draw (P)');
  });
});
