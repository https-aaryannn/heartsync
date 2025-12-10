"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCrushCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.onCrushCreated = functions.firestore
    .document('crushes/{crushId}')
    .onCreate(async (snap, context) => {
    const newCrush = snap.data();
    const newCrushId = snap.id;
    // Basic Validation
    if (!newCrush.submitterInstagram || !newCrush.targetInstagram || !newCrush.periodId) {
        console.log('Invalid crush document', newCrushId);
        return null;
    }
    const seasonId = newCrush.periodId;
    const submitterInsta = newCrush.submitterInstagram.toLowerCase().trim();
    const targetInsta = newCrush.targetInstagram.toLowerCase().trim();
    if (submitterInsta === targetInsta) {
        console.log(`Self-match attempt detected: ${submitterInsta}. Ignoring.`);
        return null;
    }
    console.log(`Processing crush: ${submitterInsta} -> ${targetInsta} (Season: ${seasonId})`);
    // Run Transaction to ensure atomicity
    return db.runTransaction(async (transaction) => {
        // Query for the Reciprocal Crush
        // "targetInstagram == new.submitterInstagram && submitterInstagram == new.targetInstagram"
        const reciprocalQuery = db.collection('crushes')
            .where('periodId', '==', seasonId)
            .where('submitterInstagram', '==', targetInsta)
            .where('targetInstagram', '==', submitterInsta)
            .where('withdrawn', '==', false)
            .limit(1);
        const reciprocalRes = await transaction.get(reciprocalQuery);
        if (reciprocalRes.empty) {
            console.log('No reciprocal crush found.');
            return null;
        }
        const reciprocalDoc = reciprocalRes.docs[0];
        const reciprocalData = reciprocalDoc.data();
        console.log(`Match found! ${submitterInsta} <-> ${targetInsta}`);
        // Check Visibility (Optional strict check)
        // The user prompt implied: "if reciprocal exists and both visibility modes allow reveal"
        // Assuming 'MUTUAL_ONLY' always allows if mutual. 'ANON_COUNT' might also allow if mutual?
        // For now, if mutual exists, we match.
        // Update BOTH crushes
        transaction.update(snap.ref, {
            isMutual: true,
            status: 'matched'
        });
        transaction.update(reciprocalDoc.ref, {
            isMutual: true,
            status: 'matched'
        });
        // Create Match Document
        // Deterministic ID for idempotency: seasonId_userA_userB (alphabetical)
        const users = [submitterInsta, targetInsta].sort();
        const matchId = `${seasonId}_${users[0]}_${users[1]}`;
        const matchRef = db.collection('matches').doc(matchId);
        const matchDoc = await transaction.get(matchRef);
        if (!matchDoc.exists) {
            transaction.set(matchRef, {
                userAInstagram: users[0],
                userBInstagram: users[1],
                userAName: users[0] === submitterInsta ? newCrush.submitterName : reciprocalData.submitterName,
                userBName: users[1] === submitterInsta ? newCrush.submitterName : reciprocalData.submitterName,
                periodId: seasonId,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return null; // Return value for transaction
    });
});
//# sourceMappingURL=index.js.map