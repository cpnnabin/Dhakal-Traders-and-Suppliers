import React from 'react';

type State = { hasError: boolean; error?: Error | null };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log to console for now; could integrate Sentry/remote logging
    console.error('Unhandled error caught by ErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#b00020' }}>Something went wrong</h2>
          <p>The application encountered an unexpected error. You can reload the page to try again.</p>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 12px' }}>Reload</button>
          </div>
          <details style={{ marginTop: 12 }}>
            <summary>Details</summary>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{String(this.state.error || '')}</pre>
          </details>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
