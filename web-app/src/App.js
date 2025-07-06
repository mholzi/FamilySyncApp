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

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

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
      <div className="App flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', margin: '0 20px' }}>
          <div className="card-body flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <h1 className="text-2xl font-bold text-primary">Loading FamilySync...</h1>
            <div className="progress w-full">
              <div className="progress-bar" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
        <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '20px' }}>
          <div className="card animate-fade-in" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="card-body">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full mb-4" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)' }}>
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                    F
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-primary mb-2">FamilySync</h1>
                <p className="text-secondary text-center">
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
  );
}

export default App;
