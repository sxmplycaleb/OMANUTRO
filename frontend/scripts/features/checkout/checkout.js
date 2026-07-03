(function () {
  const CHECKOUT_ATTEMPT_KEY = "omanutro-checkout-attempt";

  function checkoutAttemptId() {
    let value = sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY);
    if (!value) {
      value = `checkout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, value);
    }
    return value;
  }

  function clearCheckoutAttempt() {
    sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
  }

  function buildOrderPayload({ cart, paymentMethod, mpesaPhone, user, shippingAddress }) {
    if (!user) return { error: "Sign in before checkout." };
    if (!paymentMethod) return { error: "Select a payment method." };
    if (paymentMethod !== "m-pesa") {
      return { error: "Card and PayPal need real provider setup before orders can be accepted." };
    }
    if (!mpesaPhone && !user?.phone) {
      return { error: "Enter the M-Pesa phone number." };
    }

    return {
      body: {
        items: cart,
        paymentMethod,
        mpesaPhone,
        checkoutAttemptId: checkoutAttemptId(),
        shippingAddress
      }
    };
  }

  window.CommerceCheckout = {
    buildOrderPayload,
    clearCheckoutAttempt
  };
})();
