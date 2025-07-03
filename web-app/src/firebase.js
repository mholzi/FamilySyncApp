import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDUYD_V2Vdu6NyXD4D7L1H41I1W1foGhBQ",
  authDomain: "familysyncapp-4ef26.firebaseapp.com",
  projectId: "familysyncapp-4ef26",
  storageBucket: "familysyncapp-4ef26.firebasestorage.app",
  messagingSenderId: "1053679917708",
  appId: "1:1053679917708:web:c006e4a2764f8283a1f9a9",
  measurementId: "G-GXZ7ZBGHT2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;