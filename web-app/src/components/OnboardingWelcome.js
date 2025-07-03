import { useFamily } from '../hooks/useFamily';

function OnboardingWelcome({ user, onNext, onSkip }) {
  const { userData } = useFamily(user.uid);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎉 Welcome to FamilySync!</h1>
        </div>

        <div style={styles.body}>
          <p style={styles.greeting}>Hi {userData?.name || 'there'},</p>
          <p style={styles.subtitle}>
            Let's set up your family<br />
            profile in 30 seconds:
          </p>

          <div style={styles.checklist}>
            <div style={styles.checklistItem}>
              <span style={styles.checkbox}>☐</span>
              <span style={styles.checklistText}>Create your family</span>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button 
            onClick={onNext}
            style={styles.primaryButton}
          >
            Let's Go! ✨
          </button>
          
          <button 
            onClick={onSkip}
            style={styles.skipButton}
          >
            I'll set up later
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: 'white'
  },
  content: {
    maxWidth: '350px',
    width: '100%',
    textAlign: 'center'
  },
  header: {
    marginBottom: '40px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#000',
    margin: 0,
    lineHeight: '1.3'
  },
  body: {
    marginBottom: '50px'
  },
  greeting: {
    fontSize: '18px',
    color: '#333',
    margin: '0 0 10px 0',
    fontWeight: '500'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 40px 0',
    lineHeight: '1.4'
  },
  checklist: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    margin: '0 auto',
    width: 'fit-content'
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '8px 0'
  },
  checkbox: {
    fontSize: '18px',
    color: '#C7C7CC'
  },
  checklistText: {
    fontSize: '16px',
    color: '#333'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)'
  },
  skipButton: {
    backgroundColor: 'transparent',
    color: '#8E8E93',
    border: 'none',
    padding: '12px',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};

export default OnboardingWelcome;