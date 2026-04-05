import { render, screen } from '@testing-library/react';
import { StatusBar } from '@features/status-bar/StatusBar.tsx';
import { useViewportStore } from '@stores/viewportStore.ts';

beforeEach(() => {
  useViewportStore.setState({
    zoom: 1,
    panX: 0,
    panY: 0,
    cursorGridPos: { col: 42, row: 13 },
    gridOverlayVisible: false,
    rulersVisible: true,
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
    const gridEl = screen.getByText(/\d+x\d+/);
    expect(gridEl).toBeInTheDocument();
  });

  it('renders layer count', () => {
    render(<StatusBar />);
    const layerEl = screen.getByText('0 layers');
    expect(layerEl).toBeInTheDocument();
    expect(layerEl).toHaveAttribute('data-status', 'layer-count');
  });

  it('renders correct data attributes', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByText('Col 42, Row 13')).toHaveAttribute('data-status', 'cursor-pos');
    expect(screen.getByText('100%')).toHaveAttribute('data-status', 'zoom');
    expect(screen.getByText('0 layers')).toHaveAttribute('data-status', 'layer-count');
  });

  it('updates when zoom changes', () => {
    const { rerender } = render(<StatusBar />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    useViewportStore.setState({ zoom: 1.5 });
    rerender(<StatusBar />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('shows zero position when cursor is null', () => {
    useViewportStore.setState({ cursorGridPos: null });
    render(<StatusBar />);
    expect(screen.getByText('Col 0, Row 0')).toBeInTheDocument();
  });
});
