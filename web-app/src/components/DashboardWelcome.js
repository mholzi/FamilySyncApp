import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

function DashboardWelcome({ userData, onAddChild, onInviteAuPair, onSkip }) {
  const handleSkip = async () => {
    try {
      // Mark that user has seen welcome screen
      await updateDoc(doc(db, 'users', userData.id), {
        hasSeenWelcomeScreen: true,
        updatedAt: Timestamp.now()
      });
      onSkip();
    } catch (error) {
      console.error('Error updating welcome screen status:', error);
      onSkip(); // Continue anyway
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.welcomeHeader}>
          <h1 style={styles.title}>🎉 Welcome to your family dashboard, {userData?.name}!</h1>
          <p style={styles.subtitle}>
            Let's add your children so FamilySync can help you seamlessly organize their 
            schedules, share important care details with your au pair, and simplify daily routines.
          </p>
        </div>

        <div style={styles.cards}>
          <div style={styles.card} onClick={onAddChild}>
            <div style={styles.cardIcon}>👶</div>
            <h3 style={styles.cardTitle}>Add Your First Child</h3>
            <p style={styles.cardDescription}>
              Start managing your family's daily care
            </p>
            <button style={styles.cardButton}>Add Child +</button>
          </div>

          <div style={styles.card} onClick={onInviteAuPair}>
            <div style={styles.cardIcon}>👥</div>
            <h3 style={styles.cardTitle}>Invite Au Pair</h3>
            <p style={styles.cardDescription}>
              Ready to invite your au pair? Generate an invite code.
            </p>
            <button style={styles.cardButton}>Create Invite Code</button>
          </div>
        </div>

        <button onClick={handleSkip} style={styles.skipButton}>
          I'll do this later
        </button>
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
    backgroundColor: '#F2F2F7',
    minHeight: 'calc(100vh - 140px)' // Account for header and bottom nav
  },
  content: {
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  },
  welcomeHeader: {
    marginBottom: '40px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 20px 0',
    lineHeight: '1.3'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.5',
    margin: 0
  },
  cards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '30px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    border: 'none'
  },
  cardIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  cardDescription: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 20px 0',
    lineHeight: '1.4'
  },
  cardButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%'
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

export default DashboardWelcome;