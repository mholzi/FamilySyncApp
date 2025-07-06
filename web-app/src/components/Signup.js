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
    <div>
      <h2 className="text-2xl font-bold text-primary text-center mb-6">Create Your Account</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="form-input"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input"
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="form-input"
        />
        
        <div className="flex gap-6 justify-center mt-2 mb-2">
          <label className="flex items-center gap-2 text-primary text-sm cursor-pointer">
            <input
              type="radio"
              value="parent"
              checked={role === 'parent'}
              onChange={(e) => setRole(e.target.value)}
              className="cursor-pointer"
              style={{ accentColor: 'var(--primary-purple)' }}
            />
            I'm a Parent
          </label>
          <label className="flex items-center gap-2 text-primary text-sm cursor-pointer">
            <input
              type="radio"
              value="aupair"
              checked={role === 'aupair'}
              onChange={(e) => setRole(e.target.value)}
              className="cursor-pointer"
              style={{ accentColor: 'var(--primary-purple)' }}
            />
            I'm an Au Pair
          </label>
        </div>

        {role === 'aupair' && (
          <div className="card" style={{ backgroundColor: 'var(--gray-50)', padding: 'var(--space-3)' }}>
            <p className="text-xs text-secondary text-center">
              As an au pair, you'll need a family invite code after signing up.
            </p>
          </div>
        )}

        {error && <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>}
        
        <button 
          type="submit" 
          disabled={loading}
          className={`btn btn-primary btn-full mt-2 ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      
      <p className="text-center mt-6 text-secondary text-sm">
        Already have an account?{' '}
        <button 
          onClick={onSwitchToLogin}
          className="text-sm font-medium"
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--primary-purple)', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Log in
        </button>
      </p>
    </div>
  );
}


export default Signup;