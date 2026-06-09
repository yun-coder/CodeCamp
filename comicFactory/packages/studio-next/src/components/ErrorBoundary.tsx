import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ComicFactory] React render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'grid', placeItems: 'center', height: '100vh',
          background: 'var(--bg, #0f141c)', color: 'var(--text, #f5f7fb)',
          fontFamily: 'var(--font-sans, system-ui)', padding: '2rem',
        }}>
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, marginBottom: 10, color: 'var(--accent, #e94560)' }}>
              页面出错
            </h2>
            <pre style={{
              background: 'var(--bg-subtle, #1e2530)', padding: '1rem',
              borderRadius: 8, fontSize: 12, textAlign: 'left',
              overflow: 'auto', maxHeight: 200, color: 'var(--text-muted, #8a94a6)',
            }}>
              {this.state.error.message}
            </pre>
            <button
              style={{
                marginTop: 16, padding: '8px 20px', background: 'var(--accent, #e94560)',
                color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
              onClick={() => this.setState({ error: null })}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
