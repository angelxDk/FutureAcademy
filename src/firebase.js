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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  terminate
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

let db = null;
const forceDisableFirestore = import.meta.env.VITE_DISABLE_FIRESTORE === 'true' || localStorage.getItem('DISABLE_FIRESTORE') === 'true';

if (!forceDisableFirestore) {
  try {
    // API moderna (SDK v9+) — substitui o deprecado enableIndexedDbPersistence
    // persistentLocalCache: serve dados do IndexedDB instantaneamente (offline-first)
    // persistentMultipleTabManager: sincroniza corretamente entre abas
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    console.warn('[Future Academy] Firestore não disponível:', e.message);
  }
} else {
  console.info('[Future Academy] Firestore explicitamente desativado pelo ambiente.');
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

  // Race entre Firestore e timeout de 5s
  // Se a rede demorar mais que isso, o SWR do LS já garantiu uma UI funcional
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('firestore_timeout')), 5000)
  );

  try {
    const snap = await Promise.race([
      getDoc(STATE_DOC(uid)),
      timeout
    ]);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    if (err.message === 'firestore_timeout') {
      console.warn('[Future Academy] Firestore timeout (>5s) — continuando com cache local.');
      return null; // SWR do localStorage já está exibindo os dados
    }
    console.warn('[Future Academy] Não foi possível carregar dados do Firestore:', err.message);
    try { await terminate(db); db = null; } catch (e) { }
    return null;
  }
}

async function saveUserData(uid, data) {
  if (!db) return;
  try {
    await setDoc(STATE_DOC(uid), data);
  } catch (err) {
    console.warn('[Future Academy] Não foi possível salvar dados no Firestore:', err.message);
    try { await terminate(db); db = null; } catch (e) { }
  }
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
