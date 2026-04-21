import { act, render, screen } from '@testing-library/react';
import { StatusBar } from '@features/status-bar/StatusBar.tsx';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Status Test'),
    undoStack: [],
    redoStack: [],
  });
  useViewportStore.setState({
    zoom: 1,
    panX: 0,
    panY: 0,
    cursorGridPos: { col: 42, row: 13 },
  });
});

describe('StatusBar', () => {
  it('renders cursor position', () => {
    render(<StatusBar />);
    const cursorEl = screen.getByText('Col 42, Row 13');
    expect(cursorEl).toBeInTheDocument();
    expect(cursorEl).toHaveAttribute('data-status', 'cursor-pos');
  });

  it('renders zoom percentage', () => {
    render(<StatusBar />);
    const zoomEl = screen.getByText('100%');
    expect(zoomEl).toBeInTheDocument();
    expect(zoomEl).toHaveAttribute('data-status', 'zoom');
  });

  it('renders grid size', () => {
    render(<StatusBar />);
    const gridEl = screen.getByText('228x57 default');
    expect(gridEl).toBeInTheDocument();
    expect(gridEl).toHaveAttribute('data-grid-cols', '228');
    expect(gridEl).toHaveAttribute('data-grid-rows', '57');
    expect(gridEl).toHaveAttribute('data-grid-mode', 'default');
  });

  it('renders layer count', () => {
    render(<StatusBar />);
    const layerEl = screen.getByText('1 layers');
    expect(layerEl).toBeInTheDocument();
    expect(layerEl).toHaveAttribute('data-status', 'layer-count');
  });

  it('renders correct data attributes', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByText('Col 42, Row 13')).toHaveAttribute('data-status', 'cursor-pos');
    expect(screen.getByText('100%')).toHaveAttribute('data-status', 'zoom');
    expect(screen.getByText('1 layers')).toHaveAttribute('data-status', 'layer-count');
  });

  it('updates when zoom changes', () => {
    const { rerender } = render(<StatusBar />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    act(() => {
      useViewportStore.setState({ zoom: 1.5 });
    });
    rerender(<StatusBar />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('shows zero position when cursor is null', () => {
    useViewportStore.setState({ cursorGridPos: null });
    render(<StatusBar />);
    expect(screen.getByText('Col 0, Row 0')).toBeInTheDocument();
  });

  it('does not render the old agent mode toggle', () => {
    render(<StatusBar />);
    expect(screen.queryByRole('button', { name: /Agent:/i })).not.toBeInTheDocument();
  });

  it('renders custom grid size when the active page overrides the default canvas', () => {
    const doc = createEmptyDocument('Status Test');
    const page = doc.pages[0]!;
    useDocumentStore.setState({
      document: {
        ...doc,
        pages: [
          {
            ...page,
            canvasColsOverride: 300,
            canvasRowsOverride: 80,
          },
        ],
      },
      undoStack: [],
      redoStack: [],
    });

    render(<StatusBar />);
    const gridEl = screen.getByText('300x80 custom');
    expect(gridEl).toHaveAttribute('data-grid-mode', 'custom');
    expect(gridEl).toHaveAttribute('data-grid-cols', '300');
    expect(gridEl).toHaveAttribute('data-grid-rows', '80');
  });
});
