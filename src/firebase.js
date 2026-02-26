import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let db;
try {
  db = getFirestore(app);
} catch (e) {
  console.warn('[Future Academy] Firestore não disponível — habilite o banco no Firebase Console:', e.message);
  db = null;
}

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

function normalizeFirebaseUser(firebaseUser) {
  if (!firebaseUser) return null;
  const providerData = firebaseUser.providerData?.[0];
  let provider = 'email';
  if (providerData?.providerId === 'google.com') provider = 'google';
  else if (providerData?.providerId === 'facebook.com') provider = 'facebook';

  return {
    name: firebaseUser.displayName || providerData?.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
    email: firebaseUser.email || providerData?.email || '',
    photo: firebaseUser.photoURL || providerData?.photoURL || `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}&backgroundColor=b6e3f4`,
    provider
  };
}

// ─── Firestore helpers ────────────────────────────────────────────
const STATE_DOC = (uid) => doc(db, 'users', uid, 'data', 'state');

async function loadUserData(uid) {
  if (!db) return null;
  const snap = await getDoc(STATE_DOC(uid));
  return snap.exists() ? snap.data() : null;
}

async function saveUserData(uid, data) {
  if (!db) return;
  await setDoc(STATE_DOC(uid), data);
}

export {
  auth,
  db,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  normalizeFirebaseUser,
  loadUserData,
  saveUserData
};
