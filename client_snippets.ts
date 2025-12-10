import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';

// --- SUBMIT CRUSH ---
// Logic is now simplified. Cloud Function handles matching.
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

    // Idempotency check: Have I already submitted this?
    const q = query(
        collection(db, 'crushes'),
        where('periodId', '==', periodId),
        where('submitterUserId', '==', submitter.uid), // Query by UID query is secure and index-friendly
        where('targetInstagram', '==', normalizedTarget),
        where('withdrawn', '==', false)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
        return { success: true, message: 'Already submitted' };
    }

    // Create document
    const newCrushData = {
        submitterUserId: submitter.uid,
        submitterInstagram: myUsername,
        submitterName: submitter.displayName || 'Anonymous',
        targetInstagram: normalizedTarget,
        targetName: targetName.toLowerCase().trim(),
        targetNameDisplay: targetNameDisplay.trim(),
        visibilityMode,
        periodId, // Maps to 'seasonId' if needed
        createdAt: serverTimestamp(),
        withdrawn: false,
        isMutual: false,
        status: 'pending' // Initial status
    };

    await addDoc(collection(db, 'crushes'), newCrushData);
    return { success: true };
};

// --- QUERY: MY CRUSHES ---
// "My Crushes" (where submitterUserId == auth.uid)
export const getMyCrushes = async (userId: string, periodId: string) => {
    const q = query(
        collection(db, 'crushes'),
        where('submitterUserId', '==', userId), // Secure and simple
        where('periodId', '==', periodId),
        where('withdrawn', '==', false),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// --- QUERY: WHO LIKES ME ---
// "Who Likes Me" (where targetInstagram == current user's handle)
// Rule: allow read: if isTargetUser(resource.data.targetInstagram)
export const getMyAdmirers = async (myInstagramHandle: string, periodId: string) => {
    const q = query(
        collection(db, 'crushes'),
        where('periodId', '==', periodId),
        where('targetInstagram', '==', myInstagramHandle),
        where('withdrawn', '==', false)
    );
    // This might require a composite index: periodId ASC, targetInstagram ASC, withdrawn ASC
    const snap = await getDocs(q);
    // Important: The client can only read the COUNT usually, or obscured data, 
    // depending on 'visibilityMode'.
    // However, the function returns the raw docs. The UI must hide the name 
    // if !isMutual or visibilityMode is 'ANON_COUNT'.
    return snap.size;
};
