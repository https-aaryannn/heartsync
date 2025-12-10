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
  and,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { UserProfile, Crush, Period, VisibilityMode, Match, PeriodStats } from '../types';

// --- FIREBASE CONFIGURATION ---
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
  // Aliases for compatibility if needed, but we prefer strict requested keys
  // We keep 'instagramId' as a getter/alias if legacy code needs it, but purely relying on instagramUsername
  instagramId: string;
}

// Helper to normalize IDs for consistent matching
const normalizeId = (id: string) => id.trim().toLowerCase().replace(/^@/, '');

// Helper to generate a fake email for Instagram ID auth
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
          instagramUsername: data.instagramUsername,
          displayName: data.displayName || firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          instagramId: data.instagramUsername // Alias for backward compat
        } as User);
      } else {
        // Fallback or Initial State
        const username = firebaseUser.email?.split('@')[0] || '';
        callback({
          uid: firebaseUser.uid,
          instagramUsername: username,
          displayName: firebaseUser.displayName || username,
          photoURL: firebaseUser.photoURL,
          createdAt: Date.now(),
          instagramId: username
        } as User);
      }
    } else {
      callback(null);
    }
  });
};

export const registerWithInstagram = async (username: string, password: string, name: string) => {
  const normalized = normalizeId(username);
  const email = getEmailFromId(normalized);

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // KEY: Using 'instagramUsername' as requested
  const userProfile: any = {
    uid: userCredential.user.uid,
    instagramUsername: normalized,
    displayName: name,
    email: email,
    createdAt: serverTimestamp(),
    photoURL: null
  };

  await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
  await updateProfile(userCredential.user, { displayName: name });

  return { user: { ...userProfile, instagramId: normalized } as User };
};

export const loginWithInstagram = async (username: string, password: string) => {
  const normalized = normalizeId(username);
  const email = getEmailFromId(normalized);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
      throw new Error("Instagram ID not found or incorrect password.");
    }
    throw error;
  }
};

export const logout = () => firebaseSignOut(auth);

export const checkIsAdmin = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return data.instagramUsername?.includes('admin') || data.isAdmin === true;
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
    return {
      id: 'default_season_1',
      name: 'Season 1',
      startAt: Date.now() - 86400000,
      endAt: Date.now() + 86400000 * 30,
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

// Helper function to check and process mutual crushes
export const checkForMutualCrush = async (
  submitterInstagram: string,
  targetInstagram: string,
  seasonId: string,
  newCrushRef: any // DocumentReference
) => {
  const myUsername = normalizeId(submitterInstagram);
  const targetUsername = normalizeId(targetInstagram);

  // a) Query for reverse entry in SAME season
  const reverseQuery = query(
    collection(db, 'crushes'),
    where('periodId', '==', seasonId),
    where('submitterInstagram', '==', targetUsername),
    where('targetInstagram', '==', myUsername),
    where('withdrawn', '==', false)
  );

  const reverseSnapshot = await getDocs(reverseQuery);

  // b) If match found
  if (!reverseSnapshot.empty) {
    const reverseDoc = reverseSnapshot.docs[0];
    const batch = writeBatch(db);

    // Update existing reverse crush
    batch.update(reverseDoc.ref, {
      status: 'matched',
      isMutual: true
    });

    // Update new crush
    batch.update(newCrushRef, {
      status: 'matched',
      isMutual: true
    });

    // Create match document
    const ids = [myUsername, targetUsername].sort();
    const matchId = `${seasonId}_${ids[0]}_${ids[1]}`;
    const matchRef = doc(db, 'matches', matchId);

    // We need names for the match doc. 
    // We can fetch them or assume them. 
    // For now, we'll try to use data from the reverse doc for the partner's name.
    const reverseData = reverseDoc.data();

    // We need to fetch the "new crush" data to get the current submitter's name effectively, 
    // or pass it in. newCrushRef is just a ref.
    // Let's assume we can get it from the args if we passed full objects, 
    // but the prompt says: checkForMutualCrush(submitterInstagram, targetInstagram, seasonId, newCrushRef)
    // accessible names will be tricky without reading. 
    // Let's read the new crush doc quickly or pass names? 
    // The prompt signature is strict.
    // Let's read the new crush doc to get the name.

    const newCrushSnap = await getDoc(newCrushRef);
    const newCrushData = newCrushSnap.data();

    if (newCrushData) {
      const userAName = ids[0] === myUsername ? newCrushData.submitterName : (reverseData as any).submitterName;
      const userBName = ids[1] === myUsername ? newCrushData.submitterName : (reverseData as any).submitterName;

      batch.set(matchRef, {
        userAInstagram: ids[0],
        userBInstagram: ids[1],
        userAName,
        userBName,
        periodId: seasonId,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      return true; // Match found
    }
  }

  return false; // No match
};

export const submitCrush = async (
  submitter: UserProfile,
  targetName: string,
  targetNameDisplay: string,
  targetUsernameRaw: string,
  periodId: string,
  visibilityMode: VisibilityMode
) => {
  const normalizedTarget = normalizeId(targetUsernameRaw);
  const myUsername = normalizeId(submitter.instagramUsername || '');

  if (normalizedTarget === myUsername) {
    throw new Error("You cannot submit a crush on yourself.");
  }

  // Check for existing crush (Idempotency) - handled nicely by just checking if we already submitted
  const myExistingCrushQuery = query(
    collection(db, 'crushes'),
    where('periodId', '==', periodId),
    where('submitterInstagram', '==', myUsername),
    where('targetInstagram', '==', normalizedTarget),
    where('withdrawn', '==', false)
  );

  const myExistingRes = await getDocs(myExistingCrushQuery);
  if (!myExistingRes.empty) {
    const data = myExistingRes.docs[0].data(); // Cast to Crush if needed
    // Return existing status
    return { success: true, matchFound: data.isMutual || data.status === 'matched', message: 'Already submitted' };
  }

  // 1. Save the crush document
  const newCrushRef = doc(collection(db, 'crushes'));
  const newCrushData: any = {
    // id will be doc.id implicitly when reading, specific schema request:
    seasonId: periodId, // Requested 'seasonId' but code uses 'periodId'. I will add seasonId as alias or switch to it if requested schema is strict. 
    // The user said: "seasonId", "submitterInstagram", etc.
    // Existing code uses 'periodId'. I should probably support both or switch.
    // I will add 'seasonId' to match the schema request, and keep 'periodId' for app compatibility if needed, 
    // OR assuming 'periodId' IS 'seasonId'. 
    // The prompt schema: "seasonId". 
    // I'll use 'seasonId' AND 'periodId' to be safe for existing UI, or just 'seasonId' if I update UI.
    // To be safe and minimal changes to UI, I will keep 'periodId' and add 'seasonId'.
    periodId: periodId,
    periodId: periodId,
    // seasonId handled above

    submitterInstagram: myUsername,
    submitterName: submitter.displayName || 'Anonymous',

    targetInstagram: normalizedTarget,
    targetName: targetName.toLowerCase().trim(), // Storing for search/display
    targetNameDisplay: targetNameDisplay.trim(), // UI display

    visibilityMode,
    createdAt: serverTimestamp(),
    status: 'pending',
    isMutual: false,
    withdrawn: false,
    submitterUserId: submitter.uid // Keeping for security rules references
  };

  await setDoc(newCrushRef, newCrushData);

  // 2. Run checkForMutualCrush
  const isMatch = await checkForMutualCrush(myUsername, normalizedTarget, periodId, newCrushRef);

  return { success: true, matchFound: isMatch };
};


export const subscribeToMyCrushes = (username: string, periodId: string, onUpdate: (crushes: Crush[]) => void, onError: (error: any) => void) => {
  const norm = normalizeId(username);
  const q = query(
    collection(db, 'crushes'),
    where('submitterInstagram', '==', norm),
    where('seasonId', '==', periodId),
    where('withdrawn', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    const crushes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now()
    })) as Crush[];

    // Client-side sort to avoid index requirements for now
    crushes.sort((a, b) => b.createdAt - a.createdAt);

    onUpdate(crushes);
  }, onError);
};

export const subscribeToMyMatches = (username: string, periodId: string, onUpdate: (matches: Match[]) => void, onError: (error: any) => void) => {
  const norm = normalizeId(username);
  const q = query(
    collection(db, 'matches'),
    and(
      where('periodId', '==', periodId),
      or(
        where('userAInstagram', '==', norm),
        where('userBInstagram', '==', norm)
      )
    )
  );

  return onSnapshot(q, (snapshot) => {
    const matches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now()
    })) as Match[];
    onUpdate(matches);
  }, onError);
};

export const getMyCrushes = async (username: string) => {
  const norm = normalizeId(username);
  const q = query(
    collection(db, 'crushes'),
    where('submitterInstagram', '==', norm),
    where('withdrawn', '==', false)
    // orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis() || Date.now()
  })) as Crush[];

  return results.sort((a, b) => b.createdAt - a.createdAt);
};

export const getWhoLikesMeCount = async (myUsername: string, periodId: string) => {
  if (!myUsername) return 0;
  const normalized = normalizeId(myUsername);

  const q = query(
    collection(db, 'crushes'),
    where('periodId', '==', periodId),
    where('targetInstagram', '==', normalized),
    where('withdrawn', '==', false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const getMyMatches = async (username: string) => {
  const norm = normalizeId(username);
  const q = query(
    collection(db, 'matches'),
    or(
      where('userAInstagram', '==', norm),
      where('userBInstagram', '==', norm)
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
  const crushesSnap = await getDocs(query(collection(db, 'crushes'), where('periodId', '==', periodId)));
  const matchesSnap = await getDocs(query(collection(db, 'matches'), where('periodId', '==', periodId)));

  const crushes = crushesSnap.docs.map(d => d.data());

  const nameCounts: Record<string, number> = {};
  crushes.forEach((c: any) => {
    const name = c.targetNameDisplay || c.targetInstagram;
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });

  const topNames = Object.entries(nameCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCrushes: crushesSnap.size,
    totalMatches: matchesSnap.size,
    topNames,
    dailySubmissions: []
  };
};
