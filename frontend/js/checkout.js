(function () {
  function buildOrderPayload({ cart, paymentMethod, mpesaPhone, user, shippingAddress }) {
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
        shippingAddress
      }
    };
  }

  window.CommerceCheckout = {
    buildOrderPayload
  };
})();
