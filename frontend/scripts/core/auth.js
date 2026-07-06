(function () {
  const USER_KEY = "omanutro-auth-user";
  const TOKEN_KEY = "commerce-auth-token";
  const AUTH_EVENT = "omanutro:auth";

  const ROLE_PATHS = {
    admin: "/dashboard/admin",
    customer: "/dashboard/customer",
    vendor: "/dashboard/vendor",
    staff: "/dashboard/staff",
    rider: "/dashboard/rider",
    inventory: "/dashboard/inventory",
    support: "/dashboard/support",
    hr: "/dashboard/hr",
    operations: "/dashboard/operations",
    finance: "/dashboard/finance",
    marketing: "/dashboard/marketing",
    super_admin: "/dashboard/super-admin"
  };

  const ROLE_ALIASES = {
    admin: "admin",
    superadmin: "super_admin",
    "super-admin": "super_admin",
    super_admin: "super_admin",
    customer: "customer",
    vendor: "vendor",
    store_manager: "vendor",
    store: "vendor",
    staff: "staff",
    fulfillment: "rider",
    delivery: "rider",
    delivery_rider: "rider",
    "delivery-rider": "rider",
    rider: "rider",
    inventory: "inventory",
    inventory_manager: "inventory",
    "inventory-manager": "inventory",
    customer_support: "support",
    support_agent: "support",
    "support-agent": "support",
    support: "support",
    hr: "hr",
    human_resources: "hr",
    "human-resources": "hr",
    operations: "operations",
    operation: "operations",
    finance: "finance",
    marketing: "marketing"
  };

  const ROLE_PRIORITY = ["admin", "super_admin", "hr", "operations", "finance", "inventory", "support", "marketing", "rider", "vendor", "staff", "customer"];

  function initials(user) {
    const source = user?.name || user?.email || "A";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A";
  }

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  }

  function rememberUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }

  function normalizeRole(role) {
    const key = String(role || "").trim().toLowerCase().replace(/\s+/g, "_");
    return ROLE_ALIASES[key] || key || "customer";
  }

  function roleForUser(user = readUser()) {
    const candidates = [user?.role, ...(user?.roles || [])].map(normalizeRole);
    return ROLE_PRIORITY.find((role) => candidates.includes(role)) || candidates[0] || "customer";
  }

  function dashboardPathForRole(role) {
    return ROLE_PATHS[normalizeRole(role)] || ROLE_PATHS.customer;
  }

  function dashboardPathForUser(user = readUser()) {
    return dashboardPathForRole(roleForUser(user));
  }

  function dashboardRoleFromPath(pathname = location.pathname) {
    const match = pathname.match(/^\/dashboard\/([^/?#]+)/);
    return match ? normalizeRole(decodeURIComponent(match[1])) : "";
  }

  function canAccessDashboard(user = readUser(), pathname = location.pathname) {
    const requested = dashboardRoleFromPath(pathname);
    if (!requested) return true;
    const role = roleForUser(user);
    return role === "super_admin" || role === requested;
  }

  function rememberSession(token) {
    window.CommerceApi?.setToken(token || "");
  }

  function emitAuthChange(user, token, source = "local") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, {
      detail: { user, token: token || window.CommerceApi?.getToken?.() || "", source }
    }));
  }

  function setSession({ user, token } = {}, options = {}) {
    rememberSession(token || "");
    rememberUser(user || null);
    emitAuthChange(user || null, token || "", options.source || "local");
  }

  function clearSession() {
    window.CommerceApi?.clearToken();
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("omanutro-account-redirect");
    sessionStorage.removeItem("omanutro-post-login");

    for (const storage of [localStorage, sessionStorage]) {
      Object.keys(storage)
        .filter((key) => /firebase|google|auth|token|permission|profile|user/i.test(key))
        .forEach((key) => {
          if (![USER_KEY, TOKEN_KEY].includes(key)) storage.removeItem(key);
        });
    }

    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (!name || !/firebase|google|auth|token|session|jwt/i.test(name)) return;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  }

  async function refreshUser() {
    if (!window.CommerceApi?.getToken?.()) {
      rememberUser(null);
      emitAuthChange(null, "", "refresh");
      return null;
    }

    try {
      const data = await window.CommerceApi.request("/api/auth/me");
      rememberUser(data.user);
      emitAuthChange(data.user, window.CommerceApi.getToken(), "refresh");
      return data.user;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        emitAuthChange(null, "", "refresh");
      }
      throw error;
    }
  }

  async function logout(options = {}) {
    await window.CommerceApi?.request?.("/api/auth/logout", { method: "POST" }).catch(() => {});
    if (window.FirebaseAuth?.logoutGoogle) {
      await window.FirebaseAuth.logoutGoogle({ silent: true }).catch(() => {});
    }
    clearSession();
    emitAuthChange(null, "", "logout");
    if (options.redirect !== false) location.href = options.redirectTo || "/";
  }

  function redirectToDashboard(user = readUser(), options = {}) {
    if (!user) return false;
    const destination = dashboardPathForUser(user);
    if (location.pathname === destination) return false;
    if (options.replace) location.replace(destination);
    else location.href = destination;
    return true;
  }

  function protectDashboardRoute() {
    if (!location.pathname.startsWith("/dashboard/")) return true;
    const user = readUser();
    const token = window.CommerceApi?.getToken?.() || localStorage.getItem(TOKEN_KEY);
    if (!user || !token) {
      sessionStorage.setItem("omanutro-post-login", location.pathname + location.search + location.hash);
      location.replace("/?signin=1");
      return false;
    }
    if (!canAccessDashboard(user)) {
      document.documentElement.dataset.authz = "forbidden";
      return false;
    }
    return true;
  }

  window.addEventListener("storage", (event) => {
    if (![USER_KEY, TOKEN_KEY].includes(event.key)) return;
    emitAuthChange(readUser(), window.CommerceApi?.getToken?.() || "", "storage");
  });

  window.CommerceAuth = {
    initials,
    readUser,
    rememberUser,
    normalizeRole,
    roleForUser,
    dashboardPathForRole,
    dashboardPathForUser,
    dashboardRoleFromPath,
    canAccessDashboard,
    rememberSession,
    setSession,
    clearSession,
    refreshUser,
    logout,
    redirectToDashboard,
    protectDashboardRoute,
    eventName: AUTH_EVENT
  };
})();
