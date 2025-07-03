import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import './App.css';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';

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

  if (loading) {
    return (
      <div className="App">
        <div className="App-header">
          <h1>Loading FamilySync...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        // Check if user needs onboarding
        userData?.role === 'parent' && !userData?.hasCompletedOnboarding ? (
          <Onboarding 
            user={user} 
            onComplete={handleOnboardingComplete}
          />
        ) : (
          <Dashboard user={user} />
        )
      ) : (
        <div className="App-header">
          <h1 style={{ color: '#333', marginBottom: '10px' }}>FamilySync</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Your Family Organization Hub
          </p>
          
          {authMode === 'login' ? (
            <Login onSwitchToSignup={() => setAuthMode('signup')} />
          ) : (
            <Signup onSwitchToLogin={() => setAuthMode('login')} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
