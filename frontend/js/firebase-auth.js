import { auth, provider } from "./firebase.js";

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Google Sign In
async function signInGoogle() {

    try {

        const result = await signInWithPopup(auth, googleProvider);

        const user = result.user;

        const token = await user.getIdToken();

        // Store token using your existing API helper
        window.CommerceApi.setToken(token);

        console.log("Logged in:", user);

    } catch (err) {

        console.error(err);

    }

}

// Logout
async function logoutGoogle() {

    await signOut(auth);

    window.CommerceApi.clearToken();

}

// Check login on every page load
onAuthStateChanged(auth, async (user) => {

    if (user) {

        const token = await user.getIdToken();

        window.CommerceApi.setToken(token);

        console.log("Welcome", user.displayName);

    } else {

        window.CommerceApi.clearToken();

    }

});

// Make functions available globally
window.FirebaseAuth = {
    signInGoogle,
    logoutGoogle
};