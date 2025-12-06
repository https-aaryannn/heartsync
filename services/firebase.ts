import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
  or,
  and
} from 'firebase/firestore';
import { UserProfile, Crush, Period, VisibilityMode, Match, PeriodStats } from '../types';

// --- FIREBASE CONFIGURATION ---
// In a real production app, these values come from your Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- TYPE ADAPTERS ---

export interface User extends UserProfile {
  // Extending the type to match what the UI expects
}

// Helper to normalize IDs for consistent matching
const normalizeId = (id: string) => id.trim().toLowerCase().replace('@', '');

// Helper to generate a fake email for Instagram ID auth
// Firebase Auth requires email, so we map @username -> username@heartsync.app
const getEmailFromId = (id: string) => `${normalizeId(id)}@heartsync.app`;

// --- AUTH SERVICES ---

export const onAuthStateChanged = (
  authInstance: any,
  callback: (user: User | null) => void
) => {
  return firebaseOnAuthStateChanged(authInstance, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      // Fetch additional profile data from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        callback({
          uid: firebaseUser.uid,
          instagramId: data.instagramId,
          displayName: data.displayName || firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          createdAt: data.createdAt?.toMillis() || Date.now()
        } as User);
      } else {
        // Fallback if doc doesn't exist yet (rare race condition on signup)
        callback({
          uid: firebaseUser.uid,
          instagramId: firebaseUser.email?.split('@')[0] || null,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          createdAt: Date.now()
        } as User);
      }
    } else {
      callback(null);
    }
  });
};

export const registerWithInstagram = async (instagramId: string, password: string, name: string) => {
  const normalizedId = normalizeId(instagramId);
  const email = getEmailFromId(normalizedId);
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Create User Profile in Firestore
  const userProfile: any = {
    uid: userCredential.user.uid,
    instagramId: normalizedId,
    displayName: name,
    email: email,
    createdAt: serverTimestamp(),
    photoURL: null
  };

  await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
  await updateProfile(userCredential.user, { displayName: name });

  return { user: userProfile as User };
};

export const loginWithInstagram = async (instagramId: string, password: string) => {
  const normalizedId = normalizeId(instagramId);
  const email = getEmailFromId(normalizedId);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // User data will be emitted by onAuthStateChanged
    return { user: userCredential.user };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      throw new Error("Instagram ID not found or incorrect password.");
    }
    throw error;
  }
};

export const logout = () => firebaseSignOut(auth);

export const checkIsAdmin = async (userId: string) => {
  // In a real app, use Custom Claims. For MVP, check Firestore or ID pattern.
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return data.instagramId?.includes('admin') || data.isAdmin === true;
  }
  return false;
};

// --- DATA SERVICES ---

export const getActivePeriod = async (): Promise<Period | null> => {
  const q = query(
    collection(db, 'periods'),
    where('active', '==', true),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Return a default period so users can submit crushes immediately
    return {
      id: 'default_season_1',
      name: 'Season 1',
      startAt: Date.now() - 86400000, // Started yesterday
      endAt: Date.now() + 86400000 * 30, // Ends in 30 days
      defaultVisibility: VisibilityMode.MUTUAL_ONLY,
      mutualRevealEnabled: true,
      active: true
    } as Period;
  }

  const docData = snapshot.docs[0].data();
  return {
    id: snapshot.docs[0].id,
    ...docData,
    startAt: docData.startAt?.toMillis ? docData.startAt.toMillis() : Date.now(),
    endAt: docData.endAt?.toMillis ? docData.endAt.toMillis() : Date.now(),
  } as Period;
};

export const createPeriod = async (period: Omit<Period, 'id'>) => {
  const docRef = await addDoc(collection(db, 'periods'), {
    ...period,
    startAt: Timestamp.fromMillis(period.startAt),
    endAt: Timestamp.fromMillis(period.endAt)
  });
  return { ...period, id: docRef.id };
};

export const submitCrush = async (
  submitter: UserProfile,
  targetName: string,
  targetNameDisplay: string,
  targetInstagramId: string,
  periodId: string,
  visibilityMode: VisibilityMode
) => {
  const normalizedTargetId = normalizeId(targetInstagramId);
  const myInstagramId = normalizeId(submitter.instagramId || '');

  // We use a Transaction to ensure atomic matching
  return await runTransaction(db, async (transaction) => {
    // 1. Check if the Target has already submitted a crush on Me
    const q = query(
      collection(db, 'crushes'),
      where('periodId', '==', periodId),
      where('submitterInstagramId', '==', normalizedTargetId),
      where('targetInstagramId', '==', myInstagramId),
      where('withdrawn', '==', false)
    );

    const potentialMatchSnapshot = await getDocs(q);
    const isMutual = !potentialMatchSnapshot.empty;

    // 2. Create the new Crush Document
    const newCrushRef = doc(collection(db, 'crushes'));
    const newCrushData = {
      submitterUserId: submitter.uid,
      submitterName: submitter.displayName || 'Anonymous',
      submitterInstagramId: myInstagramId,
      targetName: targetName.toLowerCase().trim(),
      targetNameDisplay: targetNameDisplay.trim(),
      targetInstagramId: normalizedTargetId,
      visibilityMode,
      periodId,
      createdAt: serverTimestamp(),
      withdrawn: false,
      isMutual: isMutual, // Set initial status
    };
    transaction.set(newCrushRef, newCrushData);

    // 3. If Mutual, update the OTHER crush and create a Match record
    if (isMutual) {
      const otherCrushDoc = potentialMatchSnapshot.docs[0];
      transaction.update(otherCrushDoc.ref, { isMutual: true });

      const newMatchRef = doc(collection(db, 'matches'));
      transaction.set(newMatchRef, {
        userAId: submitter.uid,
        userBId: otherCrushDoc.data().submitterUserId,
        userAName: submitter.displayName || 'Unknown',
        userBName: otherCrushDoc.data().submitterName,
        periodId,
        createdAt: serverTimestamp()
      });
    }

    return { success: true, matchFound: isMutual };
  });
};

export const getMyCrushes = async (userId: string) => {
  const q = query(
    collection(db, 'crushes'),
    where('submitterUserId', '==', userId),
    where('withdrawn', '==', false),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis() || Date.now()
  })) as Crush[];
};

export const getWhoLikesMeCount = async (queryStr: string, periodId: string) => {
  if (!queryStr) return 0;
  const normalized = normalizeId(queryStr);

  // Firestore doesn't support logical OR in a single field easily without advanced indexes sometimes,
  // but we can query by targetInstagramId which is the robust way.
  // Fallback to name if needed, but for MVP we prioritize ID.

  const q = query(
    collection(db, 'crushes'),
    where('periodId', '==', periodId),
    where('targetInstagramId', '==', normalized),
    where('withdrawn', '==', false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const getMyMatches = async (userId: string) => {
  // Simple OR query support in newer Firestore SDKs
  const q = query(
    collection(db, 'matches'),
    or(
      where('userAId', '==', userId),
      where('userBId', '==', userId)
    )
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis() || Date.now()
  })) as Match[];
};

export const getAdminStats = async (periodId: string): Promise<PeriodStats> => {
  // Aggregation in client-side code (Not ideal for millions of records but fine for MVP)
  const crushesSnap = await getDocs(query(collection(db, 'crushes'), where('periodId', '==', periodId)));
  const matchesSnap = await getDocs(query(collection(db, 'matches'), where('periodId', '==', periodId)));

  const crushes = crushesSnap.docs.map(d => d.data());

  const nameCounts: Record<string, number> = {};
  crushes.forEach((c: any) => {
    nameCounts[c.targetNameDisplay] = (nameCounts[c.targetNameDisplay] || 0) + 1;
  });

  const topNames = Object.entries(nameCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCrushes: crushesSnap.size,
    totalMatches: matchesSnap.size,
    topNames,
    dailySubmissions: [] // omitted for brevity in MVP
  };
};
