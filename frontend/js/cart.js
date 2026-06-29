(function () {
  const CART_KEY = "commerce-cart";

  function load() {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  }

  function save(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function total(cart, products) {
    return cart.reduce((sum, item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  function availableOnly(cart, products) {
    const productIds = new Set(products.map((product) => product.id));
    return cart.filter((item) => productIds.has(item.productId) && Number(item.quantity) > 0);
  }

  window.CommerceCart = {
    load,
    save,
    total,
    availableOnly
  };
})();
