import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import '../styles/DesignSystem.css';

const AuPairInviteFlow = ({ user, onComplete }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      // Search for family with this invite code
      const familiesQuery = query(
        collection(db, 'families'),
        where('inviteCode', '==', inviteCode.toUpperCase())
      );
      
      const querySnapshot = await getDocs(familiesQuery);
      
      if (querySnapshot.empty) {
        setError('Invalid invitation code. Please check and try again.');
        setIsVerifying(false);
        return;
      }

      // Get the family document
      const familyDoc = querySnapshot.docs[0];
      const familyId = familyDoc.id;

      // Update user's profile with familyId
      await updateDoc(doc(db, 'users', user.uid), {
        familyId: familyId,
        joinedFamilyAt: new Date(),
        inviteCodeUsed: inviteCode.toUpperCase()
      });

      // Add au pair to family's memberUids
      await updateDoc(doc(db, 'families', familyId), {
        memberUids: arrayUnion(user.uid),
        auPairUid: user.uid,
        inviteCodeUsedAt: new Date(),
        inviteCodeUsedBy: user.uid
      });

      // Success - call onComplete to refresh the app
      onComplete(familyId);

    } catch (error) {
      console.error('Error joining family:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <span style={styles.icon}>🏠</span>
          </div>
          <h1 style={styles.title}>Join Your Host Family</h1>
          <p style={styles.subtitle}>
            Enter the invitation code provided by your host family
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Invitation Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              style={styles.input}
              maxLength={6}
              pattern="[A-Z0-9]{6}"
              required
              disabled={isVerifying}
            />
            <p style={styles.hint}>
              The 6-character code should be provided by your host family
            </p>
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button 
              type="submit" 
              style={styles.submitButton}
              disabled={isVerifying || inviteCode.length !== 6}
            >
              {isVerifying ? 'Verifying...' : 'Join Family'}
            </button>
            
            <button 
              type="button" 
              style={styles.backButton}
              onClick={handleSignOut}
              disabled={isVerifying}
            >
              Back to Login
            </button>
          </div>
        </form>

        <div style={styles.helpSection}>
          <h3 style={styles.helpTitle}>Don't have a code?</h3>
          <p style={styles.helpText}>
            Ask your host family to:
          </p>
          <ol style={styles.helpList}>
            <li>Open their FamilySync app</li>
            <li>Go to their dashboard</li>
            <li>Click "Create Invite" button</li>
            <li>Share the generated code with you</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: 'var(--background)'
  },
  card: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    width: '100%',
    maxWidth: '500px',
    overflow: 'hidden'
  },
  header: {
    textAlign: 'center',
    padding: '40px 24px 32px',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    margin: '0 auto 24px',
    borderRadius: '50%',
    backgroundColor: 'var(--white)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-md)'
  },
  icon: {
    fontSize: '40px'
  },
  title: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-relaxed)'
  },
  form: {
    padding: '32px 24px'
  },
  inputGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '16px',
    fontSize: '24px',
    fontWeight: 'var(--font-weight-bold)',
    textAlign: 'center',
    letterSpacing: '0.2em',
    border: '2px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'monospace',
    transition: 'var(--transition-fast)',
    backgroundColor: '#f9fafb'
  },
  hint: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    marginTop: '8px',
    textAlign: 'center'
  },
  error: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    marginBottom: '16px'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  backButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  helpSection: {
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid var(--border-light)'
  },
  helpTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: '8px'
  },
  helpText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: '12px'
  },
  helpList: {
    paddingLeft: '20px',
    margin: 0,
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-relaxed)'
  }
};

export default AuPairInviteFlow;