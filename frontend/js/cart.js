(function () {
  const LEGACY_CART_KEY = "commerce-cart";
  const GUEST_CART_KEY = "omanutro-cart:guest";
  let saveTimer = null;

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          if (value[key] !== undefined && value[key] !== null && value[key] !== "") {
            acc[key] = stableValue(value[key]);
          }
          return acc;
        }, {});
    }
    return value;
  }

  function variantKey(item) {
    return JSON.stringify(stableValue(item.options || item.variant || {}));
  }

  function normalize(cart) {
    const merged = new Map();

    for (const item of Array.isArray(cart) ? cart : []) {
      const productId = String(item.productId || "").trim();
      if (!productId) continue;

      const options = stableValue(item.options || item.variant || {});
      const key = `${productId}:${JSON.stringify(options)}`;
      const existing = merged.get(key);
      const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));

      if (existing) existing.quantity += quantity;
      else merged.set(key, { id: item.id, productId, quantity, options });
    }

    return Array.from(merged.values());
  }

  function loadGuest() {
    return normalize(JSON.parse(localStorage.getItem(GUEST_CART_KEY) || localStorage.getItem(LEGACY_CART_KEY) || "[]"));
  }

  function hasGuestCart() {
    return loadGuest().length > 0;
  }

  function saveGuest(cart) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(normalize(cart)));
  }

  function clearGuest() {
    localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem(LEGACY_CART_KEY);
  }

  async function request(path, options = {}) {
    if (!window.CommerceApi) return { cart: [] };
    return window.CommerceApi.request(path, options);
  }

  async function loadRemote() {
    const data = await request("/api/cart");
    return normalize(data.cart || []);
  }

  async function saveRemote(cart) {
    const data = await request("/api/cart", { method: "POST", body: { items: normalize(cart) } });
    return normalize(data.cart || []);
  }

  function debounceSaveRemote(cart, onSaved, onError) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const savedCart = await saveRemote(cart);
        onSaved?.(savedCart);
      } catch (error) {
        onError?.(error);
      }
    }, 250);
  }

  async function mergeGuestIntoRemote() {
    const guestCart = loadGuest();
    const data = await request("/api/cart/merge", { method: "POST", body: { items: guestCart } });
    clearGuest();
    return normalize(data.cart || []);
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
    loadGuest,
    hasGuestCart,
    saveGuest,
    clearGuest,
    loadRemote,
    saveRemote,
    debounceSaveRemote,
    mergeGuestIntoRemote,
    normalize,
    variantKey,
    total,
    availableOnly
  };
})();

