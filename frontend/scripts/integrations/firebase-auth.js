import { auth, provider } from "./firebase.js";

import {
    getRedirectResult,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const friendlyAuthErrors = {
    "auth/account-exists-with-different-credential": "An account already exists with this email. Sign in with your original method, then connect Google from your account.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled before it finished.",
    "auth/network-request-failed": "We could not reach Google. Check your connection and try again.",
    "auth/popup-closed-by-user": "Google sign-in was closed before it finished.",
    "auth/popup-blocked": "Your browser blocked the Google window. Redirecting to Google instead.",
    "auth/unauthorized-domain": "This domain is not authorized for Google sign-in. Add it in Firebase Authentication settings.",
    "auth/user-disabled": "This account is disabled. Contact support for help."
};

function authMessage(error) {
    return friendlyAuthErrors[error?.code] || "Google sign-in could not be completed. Please try again.";
}

function setGoogleButtonLoading(isLoading, label = "Continue with Google") {
    const button = document.getElementById("googleLogin");
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
    button.setAttribute("aria-busy", String(isLoading));
    const text = button.querySelector("span:last-child");
    if (text) text.textContent = isLoading ? label : "Continue with Google";
}

async function establishGoogleSession(user) {
    if (!user) return null;
    const token = await user.getIdToken();
    window.CommerceApi?.setToken(token);
    const session = await window.CommerceApi?.request?.("/api/auth/me").catch(() => null);
    window.dispatchEvent(new CustomEvent("commerce-auth-changed"));
    return session?.user || user;
}

function dispatchFeedback(type, message) {
    window.dispatchEvent(new CustomEvent("commerce-auth-feedback", { detail: { type, message } }));
}

// Google Sign In
async function signInGoogle() {
    try {
        setGoogleButtonLoading(true, "Connecting...");
        const result = await signInWithPopup(auth, provider);
        await establishGoogleSession(result.user);
        dispatchFeedback("success", "Signed in with Google.");

    } catch (err) {
        console.error(err);
        if (err?.code === "auth/popup-blocked" || err?.code === "auth/cancelled-popup-request") {
            dispatchFeedback("info", friendlyAuthErrors[err.code]);
            await signInWithRedirect(auth, provider);
            return;
        }
        dispatchFeedback("error", authMessage(err));
    } finally {
        setGoogleButtonLoading(false);
    }

}

// Logout
async function logoutGoogle(options = {}) {

    await signOut(auth);

    window.CommerceApi.clearToken();
    if (!options.silent) window.dispatchEvent(new CustomEvent("commerce-auth-changed"));

}

getRedirectResult(auth)
    .then(async (result) => {
        if (!result?.user) return;
        await establishGoogleSession(result.user);
        dispatchFeedback("success", "Signed in with Google.");
    })
    .catch((error) => dispatchFeedback("error", authMessage(error)))
    .finally(() => setGoogleButtonLoading(false));

// Check login on every page load
onAuthStateChanged(auth, async (user) => {

    if (user) {
        await establishGoogleSession(user).catch((error) => {
            console.error(error);
            dispatchFeedback("error", "Your Google session could not be refreshed. Please sign in again.");
        });

    } else {
        setGoogleButtonLoading(false);

    }

});

// Make functions available globally
window.FirebaseAuth = {
    signInGoogle,
    logoutGoogle
};
