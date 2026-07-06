(function () {
  const state = {
    user: window.CommerceAuth?.readUser?.(),
    account: null,
    role: window.CommerceAuth?.dashboardRoleFromPath?.() || "customer",
    active: "overview",
    sidebarCollapsed: localStorage.getItem("omanutro-dashboard-sidebar") === "collapsed",
    forbidden: document.documentElement.dataset.authz === "forbidden"
  };

  const roleMeta = {
    admin: { label: "Admin", title: "Admin Dashboard", focus: "Operations, teams, orders, catalog health, and assigned business workflows." },
    customer: { label: "Customer", title: "Customer Dashboard", focus: "Orders, wishlist, addresses, and account activity." },
    vendor: { label: "Vendor", title: "Vendor Dashboard", focus: "Products, orders, storefront health, and customer demand." },
    staff: { label: "Staff", title: "Staff Dashboard", focus: "Operational queues, tasks, customers, and store updates." },
    rider: { label: "Delivery Rider", title: "Delivery Rider Dashboard", focus: "Delivery queue, route progress, payouts, and handoffs." },
    inventory: { label: "Inventory Manager", title: "Inventory Dashboard", focus: "Stock levels, replenishment, warehouse actions, and alerts." },
    support: { label: "Support Agent", title: "Support Dashboard", focus: "Tickets, customers, refunds, and service quality." },
    hr: { label: "HR", title: "HR Dashboard", focus: "Applications, candidates, hiring stages, and staff coordination." },
    operations: { label: "Operations", title: "Operations Dashboard", focus: "Applications, fulfillment, inventory, handoffs, and operational queues." },
    finance: { label: "Finance", title: "Finance Dashboard", focus: "Revenue, payouts, refunds, taxes, and reconciliation." },
    marketing: { label: "Marketing", title: "Marketing Dashboard", focus: "Campaigns, audiences, content, and conversion." },
    super_admin: { label: "Super Admin", title: "Super Admin Dashboard", focus: "People, permissions, systems, reports, and every role preview." }
  };

  const icons = {
    overview: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 12 5l8 7.5V20H5v-7.5Z"/><path d="M9.5 20v-5h5v5"/></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4Z"/><path d="M9.5 9h5M9.5 13h5"/></svg>',
    products: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1-5H5L4 9Z"/><path d="M6 9v11h12V9"/><path d="M9 20v-6h6v6"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 20a6 6 0 0 0-12 0M10.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 19a4.5 4.5 0 0 0-3.2-4.3"/></svg>',
    finance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M7 16V8m5 8V5m5 11v-6"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V5M5 19h15"/><path d="M9 16v-5M13 16V8M17 16v-7"/></svg>',
    inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14v12H5V7Z"/><path d="M8 7V5h8v2M8 11h8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.2 7.2 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.2 7.2 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.2 7.2 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.2 7.2 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19 6v5.2c0 4.3-2.8 7.5-7 9.3-4.2-1.8-7-5-7-9.3V6l7-2.5Z"/><path d="m9 12 2 2 4-4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 1 0-12 0c0 7-2.5 7-2.5 9h17c0-2-2.5-2-2.5-9Z"/></svg>'
  };

  const navByRole = {
    admin: ["overview", "users", "orders", "products", "customers", "reports", "settings"],
    customer: ["overview", "orders", "wishlist", "profile", "settings"],
    vendor: ["overview", "products", "orders", "customers", "analytics", "settings"],
    staff: ["overview", "orders", "customers", "reports", "settings"],
    rider: ["overview", "deliveries", "routes", "earnings", "settings"],
    inventory: ["overview", "inventory", "products", "reports", "settings"],
    support: ["overview", "tickets", "customers", "orders", "reports"],
    hr: ["overview", "applications", "users", "reports", "settings"],
    operations: ["overview", "applications", "orders", "inventory", "reports", "settings"],
    finance: ["overview", "finance", "orders", "reports", "settings"],
    marketing: ["overview", "campaigns", "analytics", "customers", "settings"],
    super_admin: ["overview", "users", "roles", "orders", "products", "vendors", "customers", "reports", "analytics", "inventory", "marketing", "finance", "settings", "logs", "preview-customer", "preview-vendor", "preview-staff", "preview-rider", "preview-inventory", "preview-support", "preview-finance", "preview-marketing"]
  };

  const labels = {
    overview: "Dashboard",
    users: "User Management",
    roles: "Roles & Permissions",
    logs: "System Logs",
    wishlist: "Wishlist",
    profile: "Profile",
    products: "Products",
    vendors: "Vendors",
    customers: "Customers",
    reports: "Reports",
    analytics: "Analytics",
    inventory: "Inventory",
    marketing: "Marketing",
    finance: "Finance",
    settings: "Settings",
    orders: "Orders",
    tickets: "Tickets",
    applications: "Applications",
    campaigns: "Campaigns",
    deliveries: "Deliveries",
    routes: "Routes",
    earnings: "Earnings"
  };

  const $ = (selector) => document.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function toast(message) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(node.timeout);
    node.timeout = setTimeout(() => node.classList.remove("show"), 2600);
  }

  function avatar(user) {
    if (user?.avatarUrl) return `<img src="${escapeHtml(user.avatarUrl)}" alt="">`;
    return `<span>${escapeHtml(window.CommerceAuth?.initials?.(user) || "A")}</span>`;
  }

  function navIcon(id) {
    if (id.includes("preview")) return icons.overview;
    if (id.includes("role")) return icons.shield;
    if (id.includes("finance") || id.includes("earnings")) return icons.finance;
    if (id.includes("analytics") || id.includes("reports") || id.includes("marketing") || id.includes("campaign")) return icons.analytics;
    if (id.includes("inventory") || id.includes("product")) return icons.inventory;
    if (id.includes("user") || id.includes("customer") || id.includes("vendor") || id.includes("support")) return icons.users;
    if (id.includes("order") || id.includes("delivery") || id.includes("route")) return icons.orders;
    if (id.includes("setting") || id.includes("log")) return icons.settings;
    return icons.overview;
  }

  function itemLabel(id) {
    if (id.startsWith("preview-")) {
      const role = id.replace("preview-", "");
      return `Preview ${roleMeta[role]?.label || role}`;
    }
    return labels[id] || id.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function statsForRole(role) {
    const orders = state.account?.stats?.orders || { total: 0, pending: 0, completed: 0 };
    const base = {
      admin: [["Orders", orders.total, "Operational view"], ["Customers", 128, "Active this week"], ["Applications", state.account?.applications?.length || 0, "Assigned queue"], ["Reports", 9, "Ready"]],
      customer: [["Orders", orders.total, "Lifetime purchases"], ["Pending", orders.pending, "Needs attention"], ["Wishlist", state.account?.stats?.wishlist || 0, "Saved pieces"], ["Cart Items", state.account?.stats?.cartItems || 0, "Ready for checkout"]],
      vendor: [["Live Products", 38, "Across storefront"], ["Open Orders", 16, "Fulfillment queue"], ["Conversion", "4.8%", "Seven day lift"], ["Low Stock", 5, "Restock soon"]],
      staff: [["Tasks", 24, "Assigned today"], ["Open Orders", 16, "Needs review"], ["Customers", 128, "Active this week"], ["SLA", "96%", "On time"]],
      rider: [["Deliveries", 12, "Today"], ["On Route", 4, "In progress"], ["Success Rate", "98%", "Last 30 days"], ["Payout", "KES 8.4K", "This week"]],
      inventory: [["SKUs", 184, "Tracked"], ["Low Stock", 9, "Below threshold"], ["Transfers", 6, "Open"], ["Accuracy", "99.1%", "Cycle count"]],
      support: [["Tickets", 42, "Open"], ["First Reply", "8m", "Median"], ["CSAT", "94%", "Last 30 days"], ["Refunds", 5, "Pending approval"]],
      hr: [["Applications", state.account?.applications?.length || 0, "Assigned to HR"], ["Interviews", 6, "This week"], ["Open Roles", 12, "Hiring plan"], ["Offers", 2, "Awaiting response"]],
      operations: [["Applications", state.account?.applications?.length || 0, "Assigned to Operations"], ["Orders", 32, "In queue"], ["Inventory Alerts", 9, "Needs review"], ["SLA", "97%", "On time"]],
      finance: [["Revenue", "KES 2.4M", "Month to date"], ["Refunds", "KES 48K", "Pending review"], ["Payouts", 12, "Scheduled"], ["Margin", "62%", "Blended"]],
      marketing: [["Campaigns", 7, "Active"], ["Audience", "18.2K", "Reach"], ["CTR", "6.3%", "This week"], ["Revenue", "KES 640K", "Attributed"]],
      super_admin: [["Users", 1240, "All accounts"], ["Revenue", "KES 2.4M", "Month to date"], ["Orders", 318, "Active cycle"], ["System Health", "99.98%", "Uptime"]]
    };
    return base[role] || base.customer;
  }

  function renderForbidden() {
    const own = window.CommerceAuth?.dashboardPathForUser?.(state.user) || "/";
    $("#dashboardBody").innerHTML = `
      <section class="forbidden-state">
        <strong>403 Unauthorized</strong>
        <h1>This dashboard belongs to another role.</h1>
        <p>Your session is active, but your role does not permit this workspace.</p>
        <a class="role-primary-button" href="${escapeHtml(own)}">Go to my dashboard</a>
      </section>
    `;
  }

  function renderShell() {
    const meta = roleMeta[state.role] || roleMeta.customer;
    document.title = `${meta.title} | OMANUTRO`;
    $("#breadcrumbRole").textContent = meta.label;
    document.body.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
    $("#sidebarUser").innerHTML = `
      <div class="role-avatar">${avatar(state.user)}</div>
      <div><strong>${escapeHtml(state.user?.name || "Omanutro User")}</strong><span>${escapeHtml(state.user?.email || "")}</span></div>
    `;
    $("#topProfileButton").innerHTML = avatar(state.user);
    $("#topProfileSummary").innerHTML = `<strong>${escapeHtml(state.user?.name || "Omanutro User")}</strong><span>${escapeHtml(state.user?.email || "")}</span>`;
    $("#roleNav").innerHTML = (navByRole[state.role] || navByRole.customer).map((id) => `
      <button class="${id === state.active ? "active" : ""}" type="button" data-nav="${escapeHtml(id)}">
        ${navIcon(id)}
        <span>${escapeHtml(itemLabel(id))}</span>
      </button>
    `).join("");
  }

  function renderDashboard() {
    if (state.forbidden) {
      renderForbidden();
      return;
    }
    const meta = roleMeta[state.role] || roleMeta.customer;
    const activeLabel = itemLabel(state.active);
    const previewRole = state.active.startsWith("preview-") ? state.active.replace("preview-", "") : "";
    const viewMeta = previewRole ? roleMeta[previewRole] : meta;
    const stats = statsForRole(previewRole || state.role);
    const applications = state.active === "applications" ? applicationQueueMarkup() : "";
    $("#dashboardBody").innerHTML = `
      <section class="dashboard-hero">
        <div>
          <span>${escapeHtml(activeLabel)}</span>
          <h1>${escapeHtml(previewRole ? viewMeta.title : meta.title)}</h1>
          <p>${escapeHtml(previewRole ? viewMeta.focus : meta.focus)}</p>
        </div>
        <div class="quick-actions">
          <button type="button">Create</button>
          <button type="button">Export</button>
          <button type="button">Review</button>
        </div>
      </section>

      <section class="stats-grid">
        ${stats.map(([label, value, hint]) => `
          <article class="stat-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            <small>${escapeHtml(hint)}</small>
          </article>
        `).join("")}
      </section>
      ${applications}

      <section class="dashboard-grid">
        <article class="dashboard-panel">
          <div class="panel-title"><h2>Recent Activity</h2><span>Live</span></div>
          <div class="activity-list">
            ${["Session restored", `${activeLabel} view opened`, "Permissions verified", "Dashboard data refreshed"].map((item, index) => `
              <div class="activity-item"><i></i><div><strong>${escapeHtml(item)}</strong><span>${index + 1} min ago</span></div></div>
            `).join("")}
          </div>
        </article>
        <article class="dashboard-panel">
          <div class="panel-title"><h2>Work Queue</h2><span>${escapeHtml(meta.label)}</span></div>
          <div class="skeleton-list" aria-label="Loading skeleton preview">
            <span></span><span></span><span></span>
          </div>
          <div class="empty-illustration" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        </article>
      </section>
    `;
  }

  function applicationQueueMarkup() {
    const applications = state.account?.applications || [];
    return `
      <section class="dashboard-panel">
        <div class="panel-title"><h2>Applications</h2><span>${escapeHtml(applications.length)} assigned</span></div>
        <div class="activity-list">
          ${applications.length ? applications.map((application) => `
            <div class="activity-item">
              <i></i>
              <div>
                <strong>${escapeHtml(application.applicantName)} - ${escapeHtml(application.position)}</strong>
                <span>${escapeHtml(application.department)} - ${escapeHtml(application.status)} - ${escapeHtml(new Date(application.createdAt).toLocaleDateString())}</span>
              </div>
            </div>
          `).join("") : '<div class="activity-item"><i></i><div><strong>No applications assigned yet.</strong><span>New submissions will appear here automatically.</span></div></div>'}
        </div>
      </section>
    `;
  }

  async function load() {
    if (!window.CommerceAuth?.protectDashboardRoute?.()) return;
    try {
      state.user = await window.CommerceAuth.refreshUser();
      if (!window.CommerceAuth.canAccessDashboard(state.user)) {
        state.forbidden = true;
      }
      state.role = window.CommerceAuth.dashboardRoleFromPath() || window.CommerceAuth.roleForUser(state.user);
      if (!state.forbidden && state.role !== window.CommerceAuth.roleForUser(state.user) && window.CommerceAuth.roleForUser(state.user) !== "super_admin") {
        location.replace(window.CommerceAuth.dashboardPathForUser(state.user));
        return;
      }
      state.account = await window.CommerceApi.request("/api/account").catch(() => ({}));
      const applicationData = await window.CommerceApi.request("/api/applications").catch(() => ({ applications: [] }));
      state.account.applications = applicationData.applications || [];
      renderShell();
      renderDashboard();
    } catch (error) {
      if (error.status === 401) {
        location.replace("/?signin=1");
        return;
      }
      toast(error.message || "Unable to load dashboard.");
    }
  }

  function bindEvents() {
    $("#roleNav")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-nav]");
      if (!button) return;
      state.active = button.dataset.nav;
      renderShell();
      renderDashboard();
    });
    $("#sidebarToggle")?.addEventListener("click", () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem("omanutro-dashboard-sidebar", state.sidebarCollapsed ? "collapsed" : "expanded");
      renderShell();
    });
    $("#mobileSidebarToggle")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    $("#topProfileButton")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const menu = $("#topProfileMenu");
      const open = menu.classList.toggle("hidden");
      event.currentTarget.setAttribute("aria-expanded", String(!open));
    });
    $("#dashboardLogout")?.addEventListener("click", () => {
      sessionStorage.setItem("omanutro-logout-success", "1");
      window.CommerceAuth.logout({ redirectTo: "/" });
    });
    document.addEventListener("click", () => $("#topProfileMenu")?.classList.add("hidden"));
    window.addEventListener(window.CommerceAuth?.eventName || "omanutro:auth", (event) => {
      state.user = event.detail?.user || window.CommerceAuth?.readUser?.();
      if (!state.user) location.replace("/?signin=1");
      renderShell();
    });
  }

  bindEvents();
  load();
})();
