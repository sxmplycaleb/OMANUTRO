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
  }

  window.CommerceAuth = {
    initials,
    rememberSession,
    clearSession
  };
})();
