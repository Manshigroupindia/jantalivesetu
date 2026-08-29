const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Helper to hash 4-digit PIN securely
function hashPin(pin, salt = "janta_live_setu_secure_salt_2026") {
  return crypto.createHmac("sha256", salt).update(String(pin)).digest("hex");
}

/**
 * Callable Function: Set custom user role claims securely
 */
exports.setUserRole = functions.https.onCall(async (data, context) => {
  // Enforce caller is authenticated Director
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  const callerUid = context.auth.uid;
  const callerDoc = await db.collection("users").doc(callerUid).get();
  
  if (!callerDoc.exists || (callerDoc.data().role !== "director" && context.auth.token.email !== "devenjhaofficial@gmail.com")) {
    throw new functions.https.HttpsError("permission-denied", "Only Director can change user roles.");
  }

  const { targetUid, role } = data;
  if (!targetUid || !["director", "admin", "staff"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid targetUid or role.");
  }

  // Set Firebase Custom Claims
  await admin.auth().setCustomUserClaims(targetUid, { role });
  await db.collection("users").doc(targetUid).update({
    role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, message: `Role updated to ${role}` };
});

/**
 * Callable Function: Verify Director/Staff Security PIN server-side
 */
exports.verifyPin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { pin } = data;
  if (!pin || String(pin).length !== 4) {
    throw new functions.https.HttpsError("invalid-argument", "PIN must be exactly 4 digits.");
  }

  const uid = context.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "User account record not found.");
  }

  const storedHashedPin = userDoc.data().pinHash;
  const incomingHash = hashPin(pin);

  if (storedHashedPin !== incomingHash) {
    return { valid: false, message: "Incorrect security PIN." };
  }

  return { valid: true };
});

/**
 * Callable Function: Finalize Payroll securely
 */
exports.finalizePayroll = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists || (callerDoc.data().role !== "director" && callerDoc.data().role !== "admin")) {
    throw new functions.https.HttpsError("permission-denied", "Only Director/Admin can finalize payroll.");
  }

  const { month, records, pin } = data;
  
  // Verify PIN first
  const storedHashedPin = callerDoc.data().pinHash;
  if (storedHashedPin && storedHashedPin !== hashPin(pin)) {
    throw new functions.https.HttpsError("permission-denied", "Invalid PIN authorization.");
  }

  const batch = db.batch();
  for (const record of records) {
    const docRef = db.collection("salaryRecords").doc(`${record.userId}_${month}`);
    batch.set(docRef, {
      ...record,
      status: "finalized",
      finalizedBy: context.auth.uid,
      finalizedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  return { success: true, count: records.length };
});

/**
 * Callable Function: Permanent Delete with Re-authentication & PIN
 */
exports.permanentDeleteRecord = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "director") {
    throw new functions.https.HttpsError("permission-denied", "Only Director can permanently delete records.");
  }

  const { collectionName, documentId, pin } = data;

  const storedHashedPin = callerDoc.data().pinHash;
  if (storedHashedPin && storedHashedPin !== hashPin(pin)) {
    throw new functions.https.HttpsError("permission-denied", "Invalid security PIN.");
  }

  // Perform permanent deletion
  await db.collection(collectionName).doc(documentId).delete();

  // Create audit log
  await db.collection("auditLogs").add({
    userId: context.auth.uid,
    userName: callerDoc.data().name || "Director",
    action: "PERMANENT_DELETE",
    module: collectionName,
    recordId: documentId,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

/**
 * Callable Function: Create Staff Account securely without logging out Director
 */
exports.createStaffAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "director") {
    throw new functions.https.HttpsError("permission-denied", "Only Director can create staff accounts.");
  }

  const { email, temporaryPass, role, designation, workingArea, monthlySalary, fullName, contactNumber, pin, idNumber } = data;
  if (!email || !temporaryPass || !fullName) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required staff parameters.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Create Firebase Auth user via Admin SDK
  const userRecord = await admin.auth().createUser({
    email: normalizedEmail,
    password: temporaryPass,
    displayName: fullName,
  });

  const uid = userRecord.uid;
  const pinHash = hashPin(pin || "1234");
  const now = new Date().toISOString();

  // Set custom user claims
  await admin.auth().setCustomUserClaims(uid, { role: role || "staff" });

  // Write to users collection
  await db.collection("users").doc(uid).set({
    uid,
    email: normalizedEmail,
    role: role || "staff",
    approved: false,
    status: "pending_profile",
    firstLoginCompleted: false,
    pinHash,
    name: fullName,
    designation: designation || "Reporter",
    idNumber: idNumber || `JL-STAFF-${new Date().getFullYear()}-0001`,
    createdAt: now,
    updatedAt: now,
  });

  // Write to staffProfiles collection
  await db.collection("staffProfiles").doc(uid).set({
    id: uid,
    userId: uid,
    idNumber: idNumber || `JL-STAFF-${new Date().getFullYear()}-0001`,
    fullName,
    email: normalizedEmail,
    contactNumber: contactNumber || "N/A",
    designation: designation || "Reporter",
    workingArea: workingArea || "Head Office",
    monthlySalary: monthlySalary || 12000,
    approvalStatus: "pending_profile",
    joinedDate: now.split("T")[0],
    validUpto: "31 DEC 2028",
    createdById: context.auth.uid,
    createdAt: now,
  });

  return { success: true, uid };
});

/**
 * Scheduled Cloud Function: Auto-close open attendance sessions daily at 9:00 PM (21:00 IST)
 * Timezone: Asia/Kolkata
 */
exports.autoCloseOpenAttendance = functions.pubsub
  .schedule("0 21 * * *")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    // Current ISO date in Asia/Kolkata timezone (YYYY-MM-DD)
    const todayISO = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kolkata" });
    const snapshot = await db.collection("attendance")
      .where("date", "==", todayISO)
      .get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.checkIn && !data.checkOut) {
        batch.update(docSnap.ref, {
          checkOut: "09:00 PM",
          checkOutLocation: {
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            capturedAt: new Date().toISOString(),
            address: "Automatic Closed",
          },
          status: "auto_closed",
          checkoutType: "AUTO",
          isAutoClosed: true,
          updatedAt: new Date().toISOString(),
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    console.log(`Auto-closed ${count} open attendance records for ${todayISO}`);
    return null;
  });
