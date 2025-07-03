import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { createFamily } from '../utils/familyUtils';

function Signup({ onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('parent'); // 'parent' or 'aupair'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let familyId = null;

      // If parent, create a new family first
      if (role === 'parent') {
        familyId = await createFamily(user.uid, name);
      }

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: name,
        email: email,
        role: role,
        familyId: familyId,
        profilePictureUrl: null,
        language: 'en',
        timezone: 'Europe/Berlin',
        hasCompletedOnboarding: role === 'aupair', // Au pairs skip onboarding for now
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
        notifications: {
          tasks: true,
          calendar: true,
          notes: true,
          shopping: false
        },
        consentGiven: true,
        consentDate: Timestamp.now()
      });

      // User will be automatically logged in and App.js will update
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Create Your Account</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={styles.input}
        />
        
        <div style={styles.roleContainer}>
          <label style={styles.roleLabel}>
            <input
              type="radio"
              value="parent"
              checked={role === 'parent'}
              onChange={(e) => setRole(e.target.value)}
              style={styles.radio}
            />
            I'm a Parent
          </label>
          <label style={styles.roleLabel}>
            <input
              type="radio"
              value="aupair"
              checked={role === 'aupair'}
              onChange={(e) => setRole(e.target.value)}
              style={styles.radio}
            />
            I'm an Au Pair
          </label>
        </div>

        {role === 'aupair' && (
          <p style={styles.note}>
            As an au pair, you'll need a family invite code after signing up.
          </p>
        )}

        {error && <p style={styles.error}>{error}</p>}
        
        <button 
          type="submit" 
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      
      <p style={styles.switchText}>
        Already have an account?{' '}
        <button 
          onClick={onSwitchToLogin}
          style={styles.switchButton}
        >
          Log in
        </button>
      </p>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
    margin: '20px auto'
  },
  title: {
    color: '#333',
    textAlign: 'center',
    marginBottom: '30px',
    fontSize: '24px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  roleContainer: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    margin: '10px 0'
  },
  roleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#333',
    cursor: 'pointer',
    fontSize: '14px'
  },
  radio: {
    cursor: 'pointer'
  },
  note: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center',
    margin: '5px 0'
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    marginTop: '10px'
  },
  error: {
    color: '#dc3545',
    fontSize: '14px',
    margin: '5px 0'
  },
  switchText: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
    fontSize: '14px'
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#4285f4',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '14px'
  }
};

export default Signup;