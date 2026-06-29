(function () {
  const tokenKey = "commerce-auth-token";
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  async function api(path, options = {}) {
    const token = localStorage.getItem(tokenKey) || "";
    const response = await fetch(path, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  function initTheme() {
    const saved = localStorage.getItem("commerce-theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) themeToggle.textContent = saved === "dark" ? "☾" : "☀";
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("commerce-theme", next);
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) themeToggle.textContent = next === "dark" ? "☾" : "☀";
  }

  async function handleLogin(event) {
    event.preventDefault();
    const error = document.getElementById("loginError");
    if (error) error.textContent = "";
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: {
          email: document.getElementById("email").value,
          password: document.getElementById("password").value
        }
      });
      if (data.user?.role !== "admin") throw new Error("Admin access required.");
      localStorage.setItem(tokenKey, data.token);
      window.location.href = "/admin/index.html";
    } catch (err) {
      if (error) error.textContent = err.message;
    }
  }

  async function loadDashboard() {
    try {
      const me = await api("/api/admin/auth/me");
      document.getElementById("welcomeHeader").innerHTML = `Welcome, <strong>${escapeHtml(me.user.name)}</strong>`;
      const data = await api("/api/admin/dashboard");

      document.getElementById("statsGrid").innerHTML = `
        <article class="stat-card"><span>Total Products</span><strong>${data.kpis.totalProducts}</strong></article>
        <article class="stat-card"><span>Orders Today</span><strong>${data.kpis.ordersToday}</strong></article>
        <article class="stat-card"><span>Revenue</span><strong>${money.format(data.kpis.revenue)}</strong></article>
      `;

      document.getElementById("recentActivity").innerHTML = data.recentActivity.length
        ? data.recentActivity.map((item) => `<div class="split"><span>${escapeHtml(item.label)}</span><small>${new Date(item.at).toLocaleDateString()}</small></div>`).join("")
        : '<p class="empty">No recent activity.</p>';

      document.getElementById("lowStock").innerHTML = data.lowStock.length
        ? data.lowStock.map((product) => `<div class="split"><span>${escapeHtml(product.name)}</span><strong>${product.stock}</strong></div>`).join("")
        : '<p class="empty">No low-stock alerts.</p>';

      document.getElementById("recentOrders").innerHTML = data.recentOrders.length
        ? data.recentOrders.map((order) => `<tr><td>${escapeHtml(order.id)}</td><td>${escapeHtml(order.customer?.email || order.customer?.name || "")}</td><td>${money.format(order.total)}</td><td>${escapeHtml(order.status)}</td></tr>`).join("")
        : '<tr><td colspan="4" class="empty">No orders yet.</td></tr>';
    } catch (err) {
      localStorage.removeItem(tokenKey);
      window.location.href = "/admin/login.html";
    }
  }

  function initDashboardChrome() {
    document.getElementById("sidebarToggle")?.addEventListener("click", () => {
      document.querySelector(".app-shell")?.classList.toggle("sidebar-collapsed");
    });
    document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
    document.getElementById("accountToggle")?.addEventListener("click", () => {
      document.getElementById("accountMenu")?.classList.toggle("open");
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#accountMenu")) document.getElementById("accountMenu")?.classList.remove("open");
    });
    document.getElementById("logoutButton")?.addEventListener("click", () => {
      localStorage.removeItem(tokenKey);
      window.location.href = "/admin/login.html";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
    if (document.body.dataset.page === "dashboard") {
      initDashboardChrome();
      loadDashboard();
    }
  });
})();
