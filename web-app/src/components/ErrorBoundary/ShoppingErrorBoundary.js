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

// Material Design 3 styles for error boundary
const styles = {
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: '16px',
    backgroundColor: 'var(--md-sys-color-surface)'
  },
  errorCard: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: 'var(--md-sys-elevation-level3)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.8,
    filter: 'grayscale(30%)'
  },
  errorTitle: {
    color: 'var(--md-sys-color-on-surface)',
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '12px',
    margin: 0,
    fontFamily: 'var(--md-sys-typescale-headline-small-font-family-name)'
  },
  errorMessage: {
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '16px',
    lineHeight: '1.5',
    marginBottom: '16px',
    textAlign: 'left'
  },
  errorList: {
    color: 'var(--md-sys-color-on-surface-variant)',
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
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  retryButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    minWidth: '120px'
  },
  homeButton: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '120px'
  },
  errorHelp: {
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '12px',
    lineHeight: '1.4',
    fontStyle: 'italic',
    opacity: 0.8
  }
};

export default ShoppingErrorBoundary;