import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import './App.css';
import './styles/DesignSystem.css';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import AuPairInviteFlow from './components/AuPairInviteFlow';
import ThemeProvider from './components/ThemeProvider';
import SuperAdminPage from './pages/SuperAdminPage';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  
  // Check if we're on the super admin route
  const isSuperAdminRoute = window.location.pathname === '/superadmin';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch user data to check onboarding status
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Reset auth state on Firestore error to prevent corruption
          if (error.code === 'firestore/internal') {
            setUser(null);
            setUserData(null);
          }
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOnboardingComplete = () => {
    setUserData(prev => ({
      ...prev,
      hasCompletedOnboarding: true
    }));
  };

  const handleAuPairJoinFamily = (familyId) => {
    setUserData(prev => ({
      ...prev,
      familyId: familyId
    }));
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="App md3-flex md3-flex-center" style={{ minHeight: '100vh' }}>
          <div className="md3-card md3-elevation-1 animate-fade-in" style={{ maxWidth: '400px', width: '100%', margin: '0 20px' }}>
            <div className="md3-p-24 md3-flex md3-flex-column md3-flex-center md3-gap-16">
              <div className="md3-fab" style={{ background: 'linear-gradient(135deg, var(--md-sys-color-primary) 0%, var(--md-sys-color-primary-container) 100%)' }}>
                <span className="md3-title-large" style={{ color: 'var(--md-sys-color-on-primary)' }}>F</span>
              </div>
              <h1 className="md3-headline-small md3-primary-color">Loading FamilySync...</h1>
              <div className="md3-progress w-full">
                <div className="md3-progress-bar" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Show Super Admin page if on /superadmin route
  if (isSuperAdminRoute) {
    return (
      <ThemeProvider>
        <SuperAdminPage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        {user ? (
          // Check if user needs onboarding or invite flow
          userData?.role === 'parent' && !userData?.hasCompletedOnboarding ? (
            <Onboarding 
              user={user} 
              onComplete={handleOnboardingComplete}
            />
          ) : userData?.role === 'aupair' && !userData?.familyId ? (
            <AuPairInviteFlow 
              user={user} 
              onComplete={handleAuPairJoinFamily}
            />
          ) : (
            <Dashboard user={user} />
          )
        ) : (
          <div className="md3-flex md3-flex-center" style={{ minHeight: '100vh', padding: '20px' }}>
            <div className="md3-card md3-elevation-1 animate-fade-in" style={{ maxWidth: '480px', width: '100%' }}>
              <div className="md3-p-24">
                <div className="md3-flex md3-flex-column md3-flex-center md3-mb-24">
                  <div className="md3-fab md3-mb-16" style={{ background: 'linear-gradient(135deg, var(--md-sys-color-primary) 0%, var(--md-sys-color-primary-container) 100%)' }}>
                    <span className="md3-title-large" style={{ color: 'var(--md-sys-color-on-primary)' }}>
                      F
                    </span>
                  </div>
                  <h1 className="md3-display-small md3-primary-color md3-mb-8">FamilySync</h1>
                  <p className="md3-body-large md3-on-surface-variant-color text-center">
                    Your Family Organization Hub
                  </p>
                </div>
                
                {authMode === 'login' ? (
                  <Login onSwitchToSignup={() => setAuthMode('signup')} />
                ) : (
                  <Signup onSwitchToLogin={() => setAuthMode('login')} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
