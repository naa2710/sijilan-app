import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SharedPartnerRoot from './SharedPartnerRoot.jsx'
import './styles.css'

const searchParams = new URLSearchParams(window.location.search);
const isSharedMode = searchParams.get('sharedMode') === 'write';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h2>Runtime Error Captured:</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', fontSize: '12px', color: '#666' }}>
            {this.state.error && this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    {isSharedMode ? <SharedPartnerRoot /> : <App />}
  </ErrorBoundary>,
)
