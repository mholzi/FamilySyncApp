import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

function Login({ onSwitchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User will be automatically logged in and App.js will update
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary text-center mb-6">Welcome Back</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="form-input"
        />
        {error && <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>}
        <button 
          type="submit" 
          disabled={loading}
          className={`btn btn-primary btn-full mt-2 ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <p className="text-center mt-6 text-secondary text-sm">
        Don't have an account?{' '}
        <button 
          onClick={onSwitchToSignup}
          className="text-sm font-medium"
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--primary-purple)', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Sign up
        </button>
      </p>
    </div>
  );
}


export default Login;