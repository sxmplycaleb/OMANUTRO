(function () {
  const TOKEN_KEY = "commerce-auth-token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function request(path, options = {}) {
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = getToken();

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, {
      credentials: "include",
      ...options,
      headers,
      body
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Request failed");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  window.CommerceApi = {
    request,
    getToken,
    setToken,
    clearToken: () => setToken("")
  };
})();
