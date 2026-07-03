import { auth, provider } from "./firebase.js";

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Google Sign In
async function signInGoogle() {
    const button = document.getElementById("googleLogin");
    const originalText = button?.textContent;

    try {
        if (button) {
            button.disabled = true;
            button.classList.add("is-loading");
            button.setAttribute("aria-busy", "true");
            button.querySelector("span:last-child").textContent = "Connecting...";
        }

        const result = await signInWithPopup(auth, provider);

        const user = result.user;

        const token = await user.getIdToken();

        // Store token using your existing API helper
        window.CommerceApi.setToken(token);
        window.dispatchEvent(new CustomEvent("commerce-auth-changed"));

        console.log("Logged in:", user);
        window.dispatchEvent(new CustomEvent("commerce-auth-feedback", { detail: { type: "success", message: "Signed in with Google." } }));

    } catch (err) {

        console.error(err);
        window.dispatchEvent(new CustomEvent("commerce-auth-feedback", { detail: { type: "error", message: err.message || "Google sign-in failed." } }));

    } finally {
        if (button) {
            button.disabled = false;
            button.classList.remove("is-loading");
            button.removeAttribute("aria-busy");
            button.querySelector("span:last-child").textContent = originalText || "Continue with Google";
        }
    }

}

// Logout
async function logoutGoogle(options = {}) {

    await signOut(auth);

    window.CommerceApi.clearToken();
    if (!options.silent) window.dispatchEvent(new CustomEvent("commerce-auth-changed"));

}

// Check login on every page load
onAuthStateChanged(auth, async (user) => {

    if (user) {

        const token = await user.getIdToken();

        window.CommerceApi.setToken(token);
        window.dispatchEvent(new CustomEvent("commerce-auth-changed"));

        console.log("Welcome", user.displayName);

    } else {

        window.CommerceApi.clearToken();
        window.dispatchEvent(new CustomEvent("commerce-auth-changed"));

    }

});

// Make functions available globally
window.FirebaseAuth = {
    signInGoogle,
    logoutGoogle
};
