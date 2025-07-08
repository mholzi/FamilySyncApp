import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's a Firestore error and handle it specifically
    if (error.message && error.message.includes('FIRESTORE')) {
      console.warn('Firestore error detected, attempting to recover...');
      // Clear any potential bad state
      if (typeof this.props.onFirestoreError === 'function') {
        this.props.onFirestoreError(error);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorContent}>
            <h3 style={styles.errorTitle}>Something went wrong</h3>
            <p style={styles.errorMessage}>
              We encountered an issue loading this section. Please refresh the page.
            </p>
            <button 
              style={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '20px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    margin: '10px 0'
  },
  errorContent: {
    textAlign: 'center',
    maxWidth: '400px'
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '10px'
  },
  errorMessage: {
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  retryButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default ErrorBoundary;