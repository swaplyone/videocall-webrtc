import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#FAF6EE', color: '#2A2723', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
          <div style={{ background: '#FFF', border: '2.5px solid #2A2723', borderRadius: '18px', padding: '2rem', maxWidth: '500px', boxShadow: '6px 6px 0px 0px #2A2723' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#D45B3E' }}>
              ✦ Experience Workspace Notice
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#6B655C', fontSize: '0.9rem' }}>
              The interactive workspace encountered a transient state update. Click below to refresh the paper stage.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{ padding: '0.75rem 1.75rem', borderRadius: '50px', background: '#D45B3E', border: '2.5px solid #2A2723', color: '#FFF', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
            >
              Refresh Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
