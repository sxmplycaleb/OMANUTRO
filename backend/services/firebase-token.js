const FIREBASE_CERTS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const DEFAULT_FIREBASE_PROJECT_ID = "omanutro";

let remoteJwks = null;

function firebaseProjectId() {
  return process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
}

async function verifyFirebaseIdToken(idToken) {
  const projectId = firebaseProjectId();
  const { createRemoteJWKSet, jwtVerify } = await import("jose");

  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(new URL(FIREBASE_CERTS_URL));
  }

  const { payload } = await jwtVerify(idToken, remoteJwks, {
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`
  });

  return {
    uid: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
    firebase: payload.firebase
  };
}

module.exports = {
  verifyFirebaseIdToken
};
