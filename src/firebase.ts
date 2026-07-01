import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { User } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;

export async function loginWithEmail(email: string, password: string): Promise<User> {
  if (!auth || !firestore) throw new Error('firebase/not-configured');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const snapshot = await getDoc(doc(firestore, 'users', credential.user.uid));
  if (!snapshot.exists()) throw new Error('profile/not-found');
  return { ...(snapshot.data() as User), id: credential.user.uid };
}

export async function registerWithEmail(
  email: string,
  password: string,
  profile: Omit<User, 'id' | 'password'>,
): Promise<User> {
  if (!auth || !firestore) throw new Error('firebase/not-configured');
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user: User = { ...profile, id: credential.user.uid, email };
  await setDoc(doc(firestore, 'users', credential.user.uid), {
    ...user,
    createdAt: serverTimestamp(),
  });
  return user;
}

export async function requestPasswordReset(email: string) {
  if (!auth) throw new Error('firebase/not-configured');
  await sendPasswordResetEmail(auth, email);
}

export async function logoutFirebase() {
  if (auth) await signOut(auth);
}
