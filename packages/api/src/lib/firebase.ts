import admin from 'firebase-admin';

let initialized = false;

function initFirebase() {
  if (initialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    console.log('Firebase Admin initialized');
  } else {
    console.warn('Firebase Admin credentials not configured — dashboard auth disabled');
  }

  initialized = true;
}

export async function verifyIdToken(token: string): Promise<{ uid: string; email?: string; name?: string; picture?: string }> {
  initFirebase();
  return admin.auth().verifyIdToken(token);
}
