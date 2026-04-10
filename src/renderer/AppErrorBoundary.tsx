import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary that catches render errors and shows a recovery UI
 * instead of unmounting the entire application. Particularly important for
 * agent-driven workflows where a bad addLayer call can cause a React crash.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[FigMe] Render error — use FigMe.stores.document.getState().undo() to recover:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            color: '#faf6ef',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            gap: 16,
            padding: 32,
          }}
          data-error-boundary="true"
        >
          <div style={{ color: '#ef4444', fontSize: 16, fontWeight: 700 }}>
            [FigMe] Render Error
          </div>
          <div
            style={{
              background: '#2a2a2a',
              border: '1px solid #ef4444',
              borderRadius: 4,
              padding: '12px 16px',
              maxWidth: 640,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#fca5a5',
            }}
          >
            {this.state.error?.message ?? 'Unknown error'}
          </div>
          <div style={{ color: '#999', fontSize: 12 }}>
            To recover: call{' '}
            <code style={{ color: '#60a5fa' }}>
              FigMe.stores.document.getState().undo()
            </code>{' '}
            in the console, then click Dismiss.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 24px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
