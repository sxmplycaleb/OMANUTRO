const { applicationDefault, cert, getApp, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function serviceAccountFromEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  }

  return null;
}

function initializeFirebaseAdmin() {
  const app = getApps().length
    ? getApp()
    : initializeApp({
      credential: serviceAccountFromEnv()
        ? cert(serviceAccountFromEnv())
        : applicationDefault()
    });

  return {
    app,
    auth: () => getAuth(app)
  };
}

module.exports = initializeFirebaseAdmin();
