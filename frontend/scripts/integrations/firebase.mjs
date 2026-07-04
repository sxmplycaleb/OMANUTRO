import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js";
import {
    getAuth,
    GoogleAuthProvider,
    browserLocalPersistence,
    setPersistence
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDxWQLVpp8C7zn98482qsdk8ZUCTD69g4",
    authDomain: "omanutro.firebaseapp.com",
    projectId: "omanutro",
    storageBucket: "omanutro.firebasestorage.app",
    messagingSenderId: "153131409821",
    appId: "1:153131409821:web:ffdff4592216745a818f74",
    measurementId: "G-5JWJFPL62G"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Firebase persistence could not be initialized.", error);
});

const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export {
    auth,
    provider,
    db
};

analyticsIsSupported()
    .then((supported) => {
        if (supported) getAnalytics(app);
    })
    .catch(() => {});
