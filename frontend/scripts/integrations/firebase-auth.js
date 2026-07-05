import { auth, provider } from "./firebase.js";

import {
    getRedirectResult,
    GoogleAuthProvider,
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

let googleFlowInProgress = false;
let redirectResultInProgress = true;
let lastGoogleAccessToken = "";

async function revokeGoogleAccessToken(accessToken) {
    if (!accessToken) return;
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
        method: "POST",
        mode: "no-cors",
        credentials: "omit"
    }).catch(() => {});
}

async function resetFirebaseProviderState() {
    await signOut(auth).catch(() => {});
}

async function establishGoogleSession(user) {
    if (!user) return null;
    const idToken = await user.getIdToken(true);
    const session = await window.CommerceApi?.request?.("/api/auth/google", {
        method: "POST",
        body: { idToken }
    });
    if (!session?.user || !session?.token) {
        window.CommerceApi?.clearToken?.();
        throw new Error("Google sign-in reached Google, but OMANUTRO could not create your site session.");
    }
    window.CommerceApi?.setToken(session.token);
    window.dispatchEvent(new CustomEvent("commerce-auth-changed", {
        detail: {
            provider: "google",
            user: session.user,
            token: session.token
        }
    }));
    return session.user;
}

function dispatchFeedback(type, message) {
    window.dispatchEvent(new CustomEvent("commerce-auth-feedback", { detail: { type, message } }));
}

// Google Sign In
async function signInGoogle() {
    try {
        googleFlowInProgress = true;
        setGoogleButtonLoading(true, "Connecting...");
        window.CommerceAuth?.clearSession?.();
        await resetFirebaseProviderState();
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        lastGoogleAccessToken = credential?.accessToken || "";
        await establishGoogleSession(result.user);
        await revokeGoogleAccessToken(lastGoogleAccessToken);
        await resetFirebaseProviderState();
        dispatchFeedback("success", "Signed in with Google.");

    } catch (err) {
        console.error(err);
        window.CommerceApi?.clearToken?.();
        if (err?.code === "auth/popup-blocked" || err?.code === "auth/cancelled-popup-request") {
            dispatchFeedback("info", friendlyAuthErrors[err.code]);
            await signInWithRedirect(auth, provider);
            return;
        }
        dispatchFeedback("error", err?.code ? authMessage(err) : err.message || "Google sign-in could not be completed. Please try again.");
    } finally {
        googleFlowInProgress = false;
        setGoogleButtonLoading(false);
    }

}

// Logout
async function logoutGoogle(options = {}) {

    await revokeGoogleAccessToken(lastGoogleAccessToken);
    lastGoogleAccessToken = "";
    await resetFirebaseProviderState();

    window.CommerceAuth?.clearSession?.();
    if (!options.silent) window.dispatchEvent(new CustomEvent("commerce-auth-changed"));

}

getRedirectResult(auth)
    .then(async (result) => {
        if (!result?.user) return;
        googleFlowInProgress = true;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        lastGoogleAccessToken = credential?.accessToken || "";
        await establishGoogleSession(result.user);
        await revokeGoogleAccessToken(lastGoogleAccessToken);
        await resetFirebaseProviderState();
        dispatchFeedback("success", "Signed in with Google.");
    })
    .catch((error) => {
        window.CommerceApi?.clearToken?.();
        dispatchFeedback("error", error?.code ? authMessage(error) : error.message || "Google sign-in could not be completed. Please try again.");
    })
    .finally(() => {
        googleFlowInProgress = false;
        redirectResultInProgress = false;
        setGoogleButtonLoading(false);
    });

// Check login on every page load
onAuthStateChanged(auth, async (user) => {

    if (user) {
        if (!googleFlowInProgress && !redirectResultInProgress) {
            await resetFirebaseProviderState();
        }

    } else {
        setGoogleButtonLoading(false);

    }

});

// Make functions available globally
window.FirebaseAuth = {
    signInGoogle,
    logoutGoogle
};
