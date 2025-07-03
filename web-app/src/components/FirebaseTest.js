import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';

function FirebaseTest() {
  const [user, setUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Checking connection...');
  const [testData, setTestData] = useState([]);

  useEffect(() => {
    // Test auth connection
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setConnectionStatus('Connected to Firebase (Authenticated)');
      } else {
        setUser(null);
        setConnectionStatus('Connected to Firebase (Not authenticated)');
      }
    });

    // Test Firestore connection
    let unsubscribeFirestore;
    
    try {
      // Try to read from a test collection
      unsubscribeFirestore = onSnapshot(
        collection(db, 'test-connection'),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTestData(data);
        },
        (error) => {
          console.error('Firestore connection error:', error);
          setConnectionStatus('Firestore connection error');
        }
      );
    } catch (error) {
      console.error('Firebase connection error:', error);
      setConnectionStatus('Failed to connect to Firebase');
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  const addTestDocument = async () => {
    try {
      const docRef = await addDoc(collection(db, 'test-connection'), {
        message: 'Hello from FamilySync!',
        timestamp: new Date().toISOString()
      });
      console.log('Document written with ID: ', docRef.id);
    } catch (error) {
      console.error('Error adding document: ', error);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', margin: '20px' }}>
      <h2>Firebase Connection Test</h2>
      <p><strong>Status:</strong> {connectionStatus}</p>
      <p><strong>User:</strong> {user ? user.email || 'Anonymous' : 'Not logged in'}</p>
      
      <button 
        onClick={addTestDocument}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#4285f4', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Firestore Write
      </button>

      <div style={{ marginTop: '20px' }}>
        <h3>Test Documents:</h3>
        {testData.length === 0 ? (
          <p>No test documents yet. Click the button above to create one.</p>
        ) : (
          <ul>
            {testData.map(doc => (
              <li key={doc.id}>
                {doc.message} - {doc.timestamp}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default FirebaseTest;