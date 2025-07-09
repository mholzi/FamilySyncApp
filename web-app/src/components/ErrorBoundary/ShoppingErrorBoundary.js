import React from 'react';
import ErrorBoundary from './ErrorBoundary';

const ShoppingErrorBoundary = ({ children }) => {
  const shoppingFallback = (
    <div style={styles.errorContainer}>
      <div style={styles.errorCard}>
        <div style={styles.errorIcon}>🛒</div>
        <h3 style={styles.errorTitle}>Shopping System Error</h3>
        <p style={styles.errorMessage}>
          We're having trouble loading your shopping lists. This could be due to:
        </p>
        <ul style={styles.errorList}>
          <li>Network connection issues</li>
          <li>Temporary server problems</li>
          <li>Data synchronization conflicts</li>
        </ul>
        <div style={styles.errorActions}>
          <button 
            style={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
          <button 
            style={styles.homeButton}
            onClick={() => window.location.href = '/'}
          >
            Go to Dashboard
          </button>
        </div>
        <p style={styles.errorHelp}>
          If the problem persists, please check your internet connection or try again later.
        </p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={shoppingFallback}>
      {children}
    </ErrorBoundary>
  );
};

const styles = {
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: '20px',
    backgroundColor: '#f8fafc'
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    opacity: 0.7
  },
  errorTitle: {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '16px',
    margin: 0
  },
  errorMessage: {
    color: '#6b7280',
    fontSize: '16px',
    lineHeight: '1.5',
    marginBottom: '20px',
    textAlign: 'left'
  },
  errorList: {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '24px',
    textAlign: 'left',
    paddingLeft: '20px'
  },
  errorActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#2563eb'
    }
  },
  homeButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#4b5563'
    }
  },
  errorHelp: {
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: '1.4',
    fontStyle: 'italic'
  }
};

export default ShoppingErrorBoundary;