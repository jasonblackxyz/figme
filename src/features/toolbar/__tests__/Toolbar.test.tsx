import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../Toolbar.tsx';
import { useToolStore } from '@stores/toolStore.ts';

beforeEach(() => {
  useToolStore.setState({ activeTool: 'select' });
});

describe('Toolbar', () => {
  it('renders all tool buttons', () => {
    render(<Toolbar />);
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
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

    const borderBoxBtn = screen.getByLabelText('Border Box (B)');
    expect(borderBoxBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets data-tool attribute on each button', () => {
    render(<Toolbar />);
    const selectBtn = screen.getByLabelText('Select (V)');
    expect(selectBtn).toHaveAttribute('data-tool', 'select');

    const borderBoxBtn = screen.getByLabelText('Border Box (B)');
    expect(borderBoxBtn).toHaveAttribute('data-tool', 'border-box');
  });

  it('changes active tool on click', () => {
    render(<Toolbar />);
    const borderBoxBtn = screen.getByLabelText('Border Box (B)');
    fireEvent.click(borderBoxBtn);
    expect(useToolStore.getState().activeTool).toBe('border-box');
  });

  it('updates aria-pressed when active tool changes', () => {
    const { rerender } = render(<Toolbar />);
    useToolStore.setState({ activeTool: 'hand' });
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
  });
});
