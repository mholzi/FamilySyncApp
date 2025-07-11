import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check if email matches super admin email
    const superAdminEmail = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'mholzi@gmail.com';
    
    if (email !== superAdminEmail) {
      setError('Access denied. Invalid credentials.');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The useSuperAdminAuth hook will handle the rest
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('Invalid credentials.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Invalid credentials.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md3-flex md3-flex-center" style={{ minHeight: '100vh', padding: '20px' }}>
      <div className="md3-card md3-elevation-1 animate-fade-in" style={{ maxWidth: '480px', width: '100%' }}>
        <div className="md3-p-24">
          <div className="md3-flex md3-flex-column md3-flex-center md3-mb-24">
            <div className="md3-fab md3-mb-16" style={{ 
              background: 'linear-gradient(135deg, var(--md-sys-color-error) 0%, var(--md-sys-color-error-container) 100%)' 
            }}>
              <span className="material-icons" style={{ color: 'var(--md-sys-color-on-error)' }}>
                admin_panel_settings
              </span>
            </div>
            <h1 className="md3-display-small md3-error-color md3-mb-8">Super Admin</h1>
            <p className="md3-body-large md3-on-surface-variant-color text-center">
              FamilySync Platform Administration
            </p>
          </div>

          <form onSubmit={handleSubmit} className="md3-flex md3-flex-column md3-gap-16">
            <div className="md3-textfield">
              <input
                type="email"
                id="admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                disabled={loading}
                className="md3-textfield-input"
              />
              <label htmlFor="admin-email" className="md3-textfield-label">
                Admin Email
              </label>
            </div>

            <div className="md3-textfield">
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                disabled={loading}
                className="md3-textfield-input"
              />
              <label htmlFor="admin-password" className="md3-textfield-label">
                Password
              </label>
            </div>

            {error && (
              <div className="md3-p-12 md3-error-color-bg md3-rounded-8" style={{ 
                backgroundColor: 'var(--md-sys-color-error-container)',
                color: 'var(--md-sys-color-on-error-container)'
              }}>
                <div className="md3-flex md3-gap-8 md3-flex-center">
                  <span className="material-icons" style={{ fontSize: '20px' }}>error</span>
                  <span className="md3-body-medium">{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="md3-button md3-button-filled md3-error-bg"
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <div className="md3-flex md3-flex-center md3-gap-8">
                  <div className="md3-progress-circular" style={{ width: '20px', height: '20px' }}>
                    <svg viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="50.27" strokeDashoffset="12.57" />
                    </svg>
                  </div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Login to Admin Panel'
              )}
            </button>

            <div className="md3-mt-16 md3-text-center">
              <a 
                href="/" 
                className="md3-body-medium md3-on-surface-variant-color"
                style={{ textDecoration: 'none' }}
              >
                ← Back to FamilySync
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminLogin;