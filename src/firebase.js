// ─────────────────────────────────────────────────────────
//  STEP 1: Paste your Firebase config here
//  Go to: Firebase Console → Project Settings → Your apps → Config
// ─────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDDjiNxKUFWWC6Bm8Z27LOGfsfJDDFmmh4",
  authDomain: "iwan-mom.firebaseapp.com",
  projectId: "iwan-mom",
  storageBucket: "iwan-mom.firebasestorage.app",
  messagingSenderId: "523696908946",
  appId: "1:523696908946:web:f8c1e9068831599b9e944b"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
