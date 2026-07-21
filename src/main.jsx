import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { HelmetProvider } from 'react-helmet-async'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', fontFamily: 'sans-serif', color: '#D32F2F', background: '#FFF5F5', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>⚠️ حدث خطأ في تشغيل الواجهة (Erreur d'affichage React)</h1>
          <p style={{ fontWeight: 'bold', marginBottom: '12px' }}>{this.state.error?.toString()}</p>
          <pre style={{ background: '#FFE0E0', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.85rem', color: '#8B0000', lineHeight: '1.5' }}>
            {this.state.errorInfo?.componentStack || this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
)
