import { useFamily } from '../hooks/useFamily';
import SmartCalendarView from '../components/Calendar/SmartCalendarView';

function SmartCalendarPage({ user }) {
  const { userData, familyData, children, loading } = useFamily(user.uid);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading smart calendar...</div>
      </div>
    );
  }

  if (!userData || !familyData) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h2>Family Setup Required</h2>
          <p>Please complete your family setup to use the smart calendar.</p>
        </div>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📅</div>
          <h2>No Children Added</h2>
          <p>Add children to your family to start using the intelligent scheduling system.</p>
          <button style={styles.addChildButton}>
            Add Your First Child
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Smart Family Calendar</h1>
        <p style={styles.subtitle}>
          AI-powered scheduling with conflict detection and smart suggestions
        </p>
      </div>

      <SmartCalendarView
        children={children}
        familyData={familyData}
        userData={userData}
      />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F2F2F7',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  header: {
    textAlign: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '30px 20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 10px 0'
  },

  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
    lineHeight: '1.4'
  },

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#F2F2F7'
  },

  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E5EA',
    borderTop: '4px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },

  loadingText: {
    fontSize: '16px',
    color: '#666'
  },

  emptyState: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '60px 40px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    margin: '0 auto'
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },

  addChildButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px'
  }
};

// Add CSS animation for loading spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-calendar-page-spinner]')) {
    style.setAttribute('data-calendar-page-spinner', 'true');
    document.head.appendChild(style);
  }
}

export default SmartCalendarPage;