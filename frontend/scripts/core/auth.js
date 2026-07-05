(function () {
  function initials(user) {
    const source = user?.name || user?.email || "A";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A";
  }

  function rememberSession(token) {
    window.CommerceApi?.setToken(token || "");
  }

  function clearSession() {
    window.CommerceApi?.clearToken();
    localStorage.removeItem("omanutro-auth-user");
    localStorage.removeItem("commerce-auth-token");
    sessionStorage.removeItem("omanutro-account-redirect");
    sessionStorage.removeItem("omanutro-post-login");

    for (const storage of [localStorage, sessionStorage]) {
      Object.keys(storage)
        .filter((key) => /firebase|google|auth|token|permission|profile|user/i.test(key))
        .forEach((key) => storage.removeItem(key));
    }

    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (!name || !/firebase|google|auth|token|session|jwt/i.test(name)) return;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  }

  window.CommerceAuth = {
    initials,
    rememberSession,
    clearSession
  };
})();
