(function () {
  const tokenKey = "commerce-auth-token";
  const sidebarStateKey = "commerce-admin-sidebar";
  const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });
  const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

  const state = {
    user: null,
    dashboard: null,
    rbac: null,
    route: "overview",
    previewRole: "",
    tableFilter: "",
    roleEditorUserId: "",
    roleEditorRole: "store_manager",
    openGroups: new Set(["Core", "Store", "Orders", "Role Preview"]),
    loading: true,
    loadError: ""
  };

  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 12 5l8 7.5V20H5v-7.5Z"/><path d="M9.5 20v-5h5v5"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5"/><circle cx="11" cy="11" r="6.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 1 0-12 0c0 7-2.5 7-2.5 9h17c0-2-2.5-2-2.5-9Z"/><path d="M10 21h4"/></svg>',
    message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H9l-4 4V5Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.3A8.4 8.4 0 0 1 8.7 4a8.6 8.6 0 1 0 11.3 11.3Z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4V2m0 20v-2m8-8h2M2 12h2m14.4-6.4 1.4-1.4M4.2 19.8l1.4-1.4m0-12.8L4.2 4.2m15.6 15.6-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 17l5-5-5-5M20 12H9"/><path d="M12 20H5V4h7"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1-5H5L4 9Z"/><path d="M6 9v11h12V9"/><path d="M9 20v-6h6v6"/></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4Z"/><path d="M9.5 9h5M9.5 13h5"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 20a6 6 0 0 0-12 0M10.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 19a4.5 4.5 0 0 0-3.2-4.3M16 4.3a3.5 3.5 0 0 1 0 6.4"/></svg>',
    finance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M7 16V8m5 8V5m5 11v-6"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V5M5 19h15"/><path d="M9 16v-5M13 16V8M17 16v-7"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19 6v5.2c0 4.3-2.8 7.5-7 9.3-4.2-1.8-7-5-7-9.3V6l7-2.5Z"/><path d="m9 12 2 2 4-4"/></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></svg>',
    content: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5V4Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.2 7.2 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.2 7.2 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.2 7.2 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.2 7.2 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/></svg>',
    filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    export: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4"/><path d="M5 17v3h14v-3"/></svg>'
  };

  const roleNames = {
    customer: "Customer",
    store_manager: "Store Manager",
    finance: "Finance",
    inventory: "Inventory",
    fulfillment: "Fulfillment",
    customer_support: "Customer Support",
    marketing: "Marketing",
    content: "Content",
    analytics: "Analytics",
    developer: "Developer",
    super_admin: "Super Admin"
  };

  const permissionsByRole = {
    customer: ["orders:view", "wishlist:view", "addresses:manage", "profile:update"],
    store_manager: ["products:manage", "categories:manage", "collections:manage", "orders:view", "customers:view"],
    finance: ["payments:view", "refunds:manage", "reports:finance", "exports:finance", "mpesa:settings"],
    inventory: ["inventory:manage", "products:quantities", "warehouse:manage", "stock_adjustments:create"],
    fulfillment: ["orders:manage", "shipping:manage", "delivery:manage", "returns:manage"],
    customer_support: ["customers:view", "orders:view", "refunds:request", "customer_notes:update"],
    marketing: ["campaigns:manage", "coupons:manage", "discounts:manage", "analytics:view"],
    content: ["content:manage", "collections:manage", "media:manage", "seo:manage"],
    analytics: ["analytics:view", "reports:sales", "reports:customers", "reports:products", "reports:inventory"],
    developer: ["api:monitor", "logs:view", "firebase:manage", "integrations:manage", "feature_flags:manage"],
    super_admin: ["*"]
  };

  const navGroups = [
    { label: "Core", items: [{ id: "overview", label: "Dashboard", icon: "dashboard", permissions: ["admin:access"] }] },
    { label: "Store", items: [
      { id: "products", label: "Products", icon: "store", permissions: ["products:manage", "products:descriptions", "products:feature"] },
      { id: "categories", label: "Categories", icon: "store", permissions: ["categories:manage"] },
      { id: "collections", label: "Collections", icon: "store", permissions: ["collections:manage"] },
      { id: "inventory", label: "Inventory", icon: "store", permissions: ["inventory:manage", "products:quantities"] }
    ] },
    { label: "Orders", items: [
      { id: "orders", label: "Orders", icon: "orders", permissions: ["orders:manage", "orders:view"] },
      { id: "customers", label: "Customers", icon: "users", permissions: ["customers:view"] },
      { id: "fulfillment", label: "Fulfillment", icon: "orders", permissions: ["shipping:manage", "delivery:manage", "orders:manage"] }
    ] },
    { label: "Growth", items: [
      { id: "marketing", label: "Marketing", icon: "analytics", permissions: ["campaigns:manage", "coupons:manage", "discounts:manage"] },
      { id: "content", label: "Content", icon: "content", permissions: ["content:manage", "seo:manage", "media:manage"] },
      { id: "analytics", label: "Analytics", icon: "analytics", permissions: ["analytics:view", "reports:all"] }
    ] },
    { label: "Business", items: [
      { id: "finance", label: "Finance", icon: "finance", permissions: ["payments:view", "reports:finance", "reports:all"] },
      { id: "reports", label: "Reports", icon: "analytics", permissions: ["reports:all", "reports:sales"] },
      { id: "staff", label: "Staff Management", icon: "users", permissions: ["staff:manage"] },
      { id: "security", label: "Security", icon: "shield", permissions: ["security:manage", "staff:manage"] }
    ] },
    { label: "Platform", items: [
      { id: "developer", label: "Developers", icon: "code", permissions: ["api:monitor", "logs:view", "firebase:manage", "integrations:manage"] },
      { id: "firebase", label: "Firebase", icon: "code", permissions: ["firebase:manage"] },
      { id: "integrations", label: "Integrations", icon: "settings", permissions: ["integrations:manage", "mpesa:settings"] },
      { id: "system", label: "System Health", icon: "settings", permissions: ["logs:view", "api:monitor"] },
      { id: "logs", label: "Logs", icon: "code", permissions: ["logs:view"] },
      { id: "roles", label: "Role & Permissions", icon: "shield", permissions: ["staff:manage"] },
      { id: "settings", label: "Settings", icon: "settings", permissions: ["settings:manage", "security:manage"] }
    ] },
    { label: "Role Preview", superOnly: true, items: [
      { id: "preview-customer", label: "Customer Dashboard", icon: "users", preview: "customer", permissions: ["*"] },
      { id: "preview-store_manager", label: "Store Manager Dashboard", icon: "store", preview: "store_manager", permissions: ["*"] },
      { id: "preview-finance", label: "Finance Dashboard", icon: "finance", preview: "finance", permissions: ["*"] },
      { id: "preview-inventory", label: "Inventory Dashboard", icon: "store", preview: "inventory", permissions: ["*"] },
      { id: "preview-fulfillment", label: "Fulfillment Dashboard", icon: "orders", preview: "fulfillment", permissions: ["*"] },
      { id: "preview-customer_support", label: "Customer Support Dashboard", icon: "users", preview: "customer_support", permissions: ["*"] },
      { id: "preview-marketing", label: "Marketing Dashboard", icon: "analytics", preview: "marketing", permissions: ["*"] },
      { id: "preview-content", label: "Content Dashboard", icon: "content", preview: "content", permissions: ["*"] },
      { id: "preview-analytics", label: "Analytics Dashboard", icon: "analytics", preview: "analytics", permissions: ["*"] },
      { id: "preview-developer", label: "Developer Dashboard", icon: "code", preview: "developer", permissions: ["*"] }
    ] }
  ];

  const pageMeta = {
    overview: ["Super Admin", "Command Center", "Revenue, operations, people, platform health, and executive alerts."],
    products: ["Store", "Products", "Manage OMANUTRO catalog items, merchandising, prices, and visibility."],
    categories: ["Store", "Categories", "Organize catalog taxonomy and merchandising zones."],
    collections: ["Store", "Collections", "Curate seasonal edits, lookbooks, and featured product stories."],
    inventory: ["Operations", "Inventory", "Track stock levels, incoming inventory, adjustments, and warehouse status."],
    orders: ["Orders", "Order Operations", "Review payment, fulfillment, delivery, refunds, and customer context."],
    customers: ["Customers", "Customer Intelligence", "Profiles, retention signals, order history, and lifetime value."],
    fulfillment: ["Operations", "Fulfillment", "Packing queues, shipping progress, courier performance, and returns."],
    marketing: ["Growth", "Marketing", "Campaigns, coupons, banners, conversion, and revenue attribution."],
    content: ["Content", "Content Studio", "Homepage modules, media, product copy, SEO, and draft publishing."],
    analytics: ["Analytics", "Analytics", "Read-only sales, customer, inventory, product, geographic, and funnel insights."],
    finance: ["Finance", "Finance", "Revenue, taxes, refunds, payments, M-Pesa collections, profit, and reports."],
    reports: ["Reports", "Reports", "Scheduled exports and high-confidence operational reporting."],
    staff: ["Access", "Staff Management", "Invite, filter, export, edit, and secure staff accounts."],
    security: ["Security", "Security", "Sessions, role changes, audit events, access policy, and risk posture."],
    developer: ["Developer", "Developer Console", "API health, latency, logs, Firebase monitoring, deployments, and feature flags."],
    firebase: ["Platform", "Firebase", "Authentication, cloud messaging, token health, and admin service status."],
    integrations: ["Platform", "Integrations", "M-Pesa, UploadThing, delivery partners, analytics, and webhook health."],
    system: ["Platform", "System Health", "Application health, background jobs, uptime, server usage, and incidents."],
    logs: ["Platform", "Logs", "Errors, deployment events, audit records, and API traces."],
    roles: ["Access", "Role & Permission Manager", "Review role templates and permission coverage."],
    settings: ["System", "Settings", "Store, payments, tax, shipping, theme, notification, and security controls."]
  };

  const roleRoutes = {
    customer: "Customer Dashboard",
    store_manager: "Store Manager Dashboard",
    finance: "Finance Dashboard",
    inventory: "Inventory Dashboard",
    fulfillment: "Fulfillment Dashboard",
    customer_support: "Customer Support Dashboard",
    marketing: "Marketing Dashboard",
    content: "Content Dashboard",
    analytics: "Analytics Dashboard",
    developer: "Developer Dashboard"
  };

  const demo = {
    products: [
      { name: "Rose Noir Tailored Blazer", category: "Outerwear", sku: "OMA-BLZ-104", stock: 18, price: 14500, status: "Live", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=180&q=80" },
      { name: "Soft Pink Ribbed Set", category: "Loungewear", sku: "OMA-SET-221", stock: 4, price: 8200, status: "Live", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=180&q=80" },
      { name: "OMANUTRO Satin Scarf", category: "Accessories", sku: "OMA-ACC-078", stock: 0, price: 3100, status: "Hidden", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=180&q=80" },
      { name: "Pearl Street Tote", category: "Bags", sku: "OMA-BAG-016", stock: 31, price: 6900, status: "Live", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=180&q=80" }
    ],
    staff: [
      { id: "u1", name: "Nadia Wanjiru", email: "nadia@omanutro.com", department: "Store Ops", role: "Store Manager", status: "Active", lastLogin: "2026-07-04", createdAt: "2026-01-18" },
      { id: "u2", name: "Amina Okello", email: "amina@omanutro.com", department: "Finance", role: "Finance", status: "Active", lastLogin: "2026-07-03", createdAt: "2026-02-11" },
      { id: "u3", name: "Ivy Mwende", email: "ivy@omanutro.com", department: "Support", role: "Customer Support", status: "Suspended", lastLogin: "2026-06-28", createdAt: "2026-03-04" },
      { id: "u4", name: "Leo Barasa", email: "leo@omanutro.com", department: "Engineering", role: "Developer", status: "Active", lastLogin: "2026-07-04", createdAt: "2026-04-15" }
    ],
    orders: [
      { id: "OMA-10482", customer: "Malaika N.", total: 24800, payment: "M-Pesa", status: "Processing", channel: "Mobile" },
      { id: "OMA-10481", customer: "Zuri A.", total: 9300, payment: "Card", status: "Paid", channel: "Web" },
      { id: "OMA-10480", customer: "Imani K.", total: 17300, payment: "M-Pesa", status: "Packing", channel: "Instagram" },
      { id: "OMA-10479", customer: "Nia M.", total: 6900, payment: "M-Pesa", status: "Delivered", channel: "Web" }
    ],
    timeline: [
      ["Feature flag enabled", "Homepage lookbook beta opened to 25% of traffic", "10 min ago"],
      ["M-Pesa reconciliation", "KES 318,450 matched across 41 transactions", "24 min ago"],
      ["Inventory alert", "Soft Pink Ribbed Set crossed low stock threshold", "42 min ago"],
      ["Deployment", "Production build 1.1.6 deployed successfully", "1 hr ago"]
    ]
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  async function api(path, options = {}) {
    const token = localStorage.getItem(tokenKey) || "";
    const response = await fetch(path, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  function hasPermission(permission) {
    const permissions = state.user?.permissions || state.dashboard?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  }

  function isSuperAdmin() {
    return hasPermission("*") || ["super_admin", "admin"].includes(String(state.user?.role || "").toLowerCase());
  }

  function canAccess(item) {
    return isSuperAdmin() || (item.permissions || []).some(hasPermission);
  }

  function initTheme() {
    const saved = localStorage.getItem("commerce-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeButton(saved);
  }

  function updateThemeButton(theme) {
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) themeToggle.innerHTML = theme === "dark" ? icons.moon : icons.sun;
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("commerce-theme", next);
    updateThemeButton(next);
  }

  function toast(message) {
    const region = document.getElementById("toastRegion");
    if (!region) return;
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    region.appendChild(item);
    window.setTimeout(() => item.remove(), 2800);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const error = document.getElementById("loginError");
    const submit = event.currentTarget?.querySelector("button[type='submit']");
    if (error) error.textContent = "";
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Signing in...";
    }
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email: document.getElementById("email").value, password: document.getElementById("password").value }
      });
      localStorage.setItem(tokenKey, data.token);
      window.location.href = dashboardPathForRole(data.user);
    } catch (err) {
      if (error) error.textContent = err.message || "Sign in failed. Check your email and password.";
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Sign In";
      }
    }
  }

  function dashboardPathForRole(user) {
    const role = String(user?.role || "").toLowerCase();
    const permissions = user?.permissions || [];
    if (role === "admin" || role === "super_admin" || permissions.includes("*") || permissions.includes("admin:access")) return "/admin/index.html#overview";
    return "/catalog.html";
  }

  function allNavItems() {
    return navGroups.flatMap((group) => group.items);
  }

  function renderNav() {
    const nav = document.getElementById("sidebarNav");
    if (!nav) return;
    nav.innerHTML = navGroups.map((group) => {
      if (group.superOnly && !isSuperAdmin()) return "";
      const items = group.items.filter(canAccess);
      if (!items.length) return "";
      const isOpen = state.openGroups.has(group.label);
      return `
        <section class="nav-group ${isOpen ? "open" : ""}">
          <button class="nav-group-toggle" type="button" data-nav-group="${escapeHtml(group.label)}" aria-expanded="${isOpen}">
            <span class="nav-label">${escapeHtml(group.label)}</span>${icons.chevron}
          </button>
          <div class="nav-group-items">
            ${items.map((item) => {
              const active = state.route === item.id;
              return `<a class="${active ? "active" : ""}" href="#${item.id}" title="${escapeHtml(item.label)}">
                <span class="nav-icon">${icons[item.icon] || icons.dashboard}</span>
                <span class="nav-label">${escapeHtml(item.label)}</span>
              </a>`;
            }).join("")}
          </div>
        </section>
      `;
    }).join("");
  }

  function setPageChrome() {
    let meta = pageMeta[state.route] || pageMeta.overview;
    if (state.previewRole) meta = ["Preview Mode", roleRoutes[state.previewRole] || "Role Dashboard", `Viewing as ${roleNames[state.previewRole]} while retaining Super Admin privileges.`];
    const [section, title, subtitle] = meta;
    document.getElementById("pageSection").textContent = section;
    document.getElementById("pageTitle").textContent = title;
    document.getElementById("pageSubtitle").textContent = subtitle;
    document.getElementById("breadcrumb").textContent = `${section} / ${title}`;
    document.getElementById("pageActions").innerHTML = actionMarkup();
    document.getElementById("roleBadge").textContent = state.previewRole ? `Preview: ${roleNames[state.previewRole]}` : roleNames[state.user?.role] || "Super Admin";
    updateGreeting();
  }

  function actionMarkup() {
    if (state.previewRole) return `<button class="secondary-button" data-action="exit-preview" type="button">${icons.dashboard}Return to Super Admin</button>`;
    const quick = `<button class="primary-button" data-action="quick-add" type="button">${icons.plus}Quick Action</button>`;
    const exportButton = `<button class="secondary-button" data-action="export" type="button">${icons.export}Export</button>`;
    if (["staff", "roles"].includes(state.route)) return `${exportButton}<button class="primary-button" data-action="invite" type="button">${icons.plus}Invite Staff</button>`;
    return `${exportButton}${quick}`;
  }

  function updateGreeting() {
    const greeting = document.getElementById("welcomeGreeting");
    if (!greeting) return;
    const name = String(state.user?.name || state.user?.email || "Admin").split(/\s+/)[0];
    greeting.textContent = state.previewRole ? `Viewing as: ${roleNames[state.previewRole]} (Preview Mode)` : `Welcome back, ${name}`;
  }

  function skeleton(count = 10) {
    return `<div class="skeleton-grid">${Array.from({ length: count }, () => `<div class="skeleton"></div>`).join("")}</div>`;
  }

  function errorState(message) {
    return `<div class="empty-state error-state"><strong>Dashboard data could not load</strong><p>${escapeHtml(message || "Check that the server is running, then try again.")}</p><button class="primary-button" data-action="retry-load" type="button">Retry</button></div>`;
  }

  function emptyState(title, body) {
    return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>`;
  }

  function statusPill(value) {
    const key = String(value || "Unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `<span class="pill ${key}">${escapeHtml(value || "Unknown")}</span>`;
  }

  function avatar(name) {
    const initials = String(name || "OM").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    return `<span class="mini-avatar">${escapeHtml(initials)}</span>`;
  }

  function card(label, value, hint, trend = "") {
    return `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(hint || "")}</small>${trend ? `<em>${escapeHtml(trend)}</em>` : ""}</article>`;
  }

  function chart(title, series, formatValue = (value) => value) {
    const max = Math.max(...(series || []).map((item) => Number(item.value || 0)), 1);
    return `<article class="panel chart-panel"><div class="panel-title"><h2>${escapeHtml(title)}</h2><span class="badge">Live</span></div>
      ${(series || []).map((item) => `<div class="bar-row"><span>${escapeHtml(item.label)}</span><div class="bar-track"><i style="width:${Math.max((Number(item.value || 0) / max) * 100, 4)}%"></i></div><strong>${escapeHtml(formatValue(item.value))}</strong></div>`).join("") || emptyState("No chart data", "Metrics will appear as activity grows.")}
    </article>`;
  }

  function donut(title, items) {
    const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
    return `<article class="panel"><div class="panel-title"><h2>${escapeHtml(title)}</h2><span>${total}</span></div><div class="donut-list">${items.map((item) => `<div class="split"><span><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span><strong>${Math.round((item.value / total) * 100)}%</strong></div>`).join("")}</div></article>`;
  }

  function table(headers, rows, emptyMessage) {
    if (!rows.length) return emptyState("Nothing to show", emptyMessage);
    return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div><div class="table-footer"><span>Showing ${rows.length} records</span><div><button class="pager" disabled>Prev</button><button class="pager">Next${icons.chevron}</button></div></div>`;
  }

  function filterItems(items, fields) {
    const value = state.tableFilter.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) => fields.some((field) => String(item[field] || "").toLowerCase().includes(value)));
  }

  function filtersMarkup(labels = []) {
    return `<section class="toolbar"><label class="search-inline"><span>Search</span><input id="tableSearch" type="search" value="${escapeHtml(state.tableFilter)}" placeholder="Search this page"></label>${labels.map((label) => `<button class="filter-button" data-action="filter" type="button">${icons.filter}${escapeHtml(label)}</button>`).join("")}</section>`;
  }

  function mergedProducts() {
    const apiProducts = (state.dashboard?.products || []).map((product) => ({
      name: product.name,
      category: product.category || "Uncategorized",
      sku: product.id || product.sku || "SKU",
      stock: Number(product.stock || 0),
      price: Number(product.price || 0),
      status: Number(product.stock || 0) <= 0 ? "Hidden" : "Live",
      image: product.image || product.imageUrl || demo.products[0].image
    }));
    return apiProducts.length ? apiProducts : demo.products;
  }

  function mergedOrders() {
    const apiOrders = (state.dashboard?.orders || state.dashboard?.recentOrders || []).map((order) => ({
      id: order.id,
      customer: order.customer?.name || order.customer?.email || "Guest customer",
      total: Number(order.total || 0),
      payment: order.paymentStatus || "M-Pesa",
      status: order.status || "Pending",
      channel: "Web"
    }));
    return apiOrders.length ? apiOrders : demo.orders;
  }

  function mergedStaff() {
    const users = state.dashboard?.users || [];
    if (!users.length) return demo.staff;
    return users.map((user, index) => ({
      id: user.id || `user-${index}`,
      name: user.name || "Unnamed",
      email: user.email,
      department: ["Store Ops", "Finance", "Support", "Marketing", "Engineering"][index % 5],
      role: (user.roles?.[0] || user.role || "customer").split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "),
      status: user.suspended ? "Suspended" : "Active",
      lastLogin: user.lastLogin || user.createdAt || new Date().toISOString(),
      createdAt: user.createdAt || new Date().toISOString()
    }));
  }

  function renderOverview() {
    const kpis = state.dashboard?.kpis || {};
    const products = mergedProducts();
    const orders = mergedOrders();
    const revenueSeries = state.dashboard?.charts?.revenueByDay?.length ? state.dashboard.charts.revenueByDay : [
      { label: "Mon", value: 186000 }, { label: "Tue", value: 221000 }, { label: "Wed", value: 198000 }, { label: "Thu", value: 264000 }, { label: "Fri", value: 318000 }, { label: "Sat", value: 402000 }
    ];
    return `
      <section class="stats-grid">
        ${card("Revenue Today", money.format(kpis.revenueToday || 318450), "M-Pesa and card settled", "+18.2%")}
        ${card("Orders Today", kpis.ordersToday || 74, "22 waiting fulfillment", "+9.6%")}
        ${card("Monthly Revenue", money.format(kpis.totalRevenue || 6842000), "July run rate", "+14.1%")}
        ${card("Users Online", "1,284", "Customers browsing now", "Peak hour")}
        ${card("M-Pesa Status", "Healthy", "Safaricom callbacks nominal")}
        ${card("Firebase Status", "Synced", "Auth and messaging online")}
        ${card("API Health", "99.98%", "p95 latency 142ms")}
        ${card("Server Health", "42%", "CPU load stable")}
      </section>
      <section class="preview-banner">
        <strong>Super Admin workspace</strong><span>Unrestricted access is active. Menus and dashboards are still rendered from permissions so role-specific views can be previewed safely.</span>
      </section>
      <section class="grid two">
        ${chart("Sales Graph", revenueSeries, (value) => money.format(value || 0))}
        ${chart("Traffic Analytics", [{ label: "Organic", value: 42 }, { label: "Instagram", value: 31 }, { label: "Direct", value: 18 }, { label: "Email", value: 9 }], (value) => `${value}%`)}
      </section>
      <section class="grid three">
        <article class="panel"><div class="panel-title"><h2>Recent Orders</h2><span class="badge">${orders.length}</span></div>${ordersTable(orders)}</article>
        <article class="panel"><div class="panel-title"><h2>Top Selling Products</h2><span class="badge">Hot</span></div>${productList(products)}</article>
        <article class="panel"><div class="panel-title"><h2>Inventory Alerts</h2><span class="badge">${products.filter((item) => item.stock <= 5).length}</span></div>${notificationList(products.filter((item) => item.stock <= 5).map((item) => ({ type: item.stock ? "Low stock" : "Out of stock", label: `${item.name}: ${item.stock} left` })))}</article>
      </section>
      <section class="grid three">
        <article class="panel"><h2>Latest Customers</h2>${staffMiniList(mergedStaff().slice(0, 4))}</article>
        <article class="panel"><h2>Activity Timeline</h2>${timelineList(demo.timeline)}</article>
        <article class="panel"><h2>Error Logs</h2>${notificationList([{ type: "Resolved", label: "Webhook retry completed for OMA-10474" }, { type: "Warning", label: "3 image transforms queued for retry" }, { type: "Info", label: "No critical production errors" }])}</article>
      </section>
      <section class="quick-actions">
        ${["Add Product", "Create Collection", "Invite Staff", "Backup Database", "View Logs", "Manage Feature Flags"].map((label) => `<button class="action-tile" data-action="${escapeHtml(label)}" type="button">${icons.plus}<span>${escapeHtml(label)}</span></button>`).join("")}
      </section>
    `;
  }

  function ordersTable(orders) {
    return table(["Order", "Customer", "Total", "Payment", "Status"], orders.map((order) => `<tr><td><strong>${escapeHtml(order.id)}</strong><small>${escapeHtml(order.channel)}</small></td><td>${escapeHtml(order.customer)}</td><td>${money.format(order.total)}</td><td>${statusPill(order.payment)}</td><td>${statusPill(order.status)}</td></tr>`), "Orders will appear after checkout.");
  }

  function productList(products) {
    return `<div class="product-stack">${products.slice(0, 5).map((product) => `<div class="product-line"><img src="${escapeHtml(product.image)}" alt=""><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} / ${escapeHtml(product.sku)}</small></span><em>${money.format(product.price)}</em></div>`).join("")}</div>`;
  }

  function notificationList(items) {
    if (!items.length) return emptyState("All clear", "No alerts right now.");
    return `<div class="notification-grid">${items.map((item) => `<div class="notice"><span>${escapeHtml(item.type)}</span><strong>${escapeHtml(item.label)}</strong></div>`).join("")}</div>`;
  }

  function timelineList(items) {
    return `<div class="timeline">${items.map(([title, body, time]) => `<div><i></i><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p><small>${escapeHtml(time)}</small></div>`).join("")}</div>`;
  }

  function staffMiniList(users) {
    return `<div class="staff-stack">${users.map((user) => `<div class="staff-line">${avatar(user.name)}<span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></span>${statusPill(user.status || user.role)}</div>`).join("")}</div>`;
  }

  function renderProducts() {
    const products = filterItems(mergedProducts(), ["name", "category", "sku"]);
    return `${filtersMarkup(["Category", "Stock", "Visibility", "Price"])}<section class="panel"><div class="panel-title"><h2>Product Catalog</h2><div class="button-row"><button class="secondary-button" data-action="import" type="button">Import</button><button class="primary-button" data-action="add-product" type="button">${icons.plus}Add Product</button></div></div>${table(["Product", "Category", "Price", "Stock", "Visibility", "Actions"], products.map((product) => `<tr><td><div class="product-cell"><img src="${escapeHtml(product.image)}" alt=""><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.sku)}</small></span></div></td><td>${escapeHtml(product.category)}</td><td>${money.format(product.price)}</td><td>${statusPill(product.stock <= 0 ? "Out of stock" : product.stock <= 5 ? "Low stock" : "In stock")}</td><td>${statusPill(product.status)}</td><td><button class="table-action" data-action="edit-product" type="button">Edit</button></td></tr>`), "No products match the current search.")}</section>`;
  }

  function renderStaff() {
    const staff = filterItems(mergedStaff(), ["name", "email", "department", "role", "status"]);
    return `${filtersMarkup(["Department", "Role", "Status", "Last login"])}
      <section class="panel staff-management">
        <div class="panel-title"><h2>Staff Directory</h2><div class="button-row"><button class="secondary-button" data-action="export-staff" type="button">${icons.export}Export</button><button class="primary-button" data-action="invite-staff" type="button">${icons.plus}Invite</button></div></div>
        ${table(["Avatar", "Name", "Email", "Department", "Assigned Role", "Status", "Last Login", "Created Date", "Actions"], staff.map((user) => `<tr><td>${avatar(user.name)}</td><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.email)}</td><td>${escapeHtml(user.department)}</td><td>${statusPill(user.role)}</td><td>${statusPill(user.status)}</td><td>${formatDate(user.lastLogin)}</td><td>${formatDate(user.createdAt)}</td><td class="actions-cell">${["View", "Edit", "Change Role", "Reset Password", user.status === "Suspended" ? "Activate" : "Suspend", "Delete"].map((label) => `<button class="table-action" data-action="${escapeHtml(label)}" data-user-id="${escapeHtml(user.id)}" type="button">${escapeHtml(label)}</button>`).join("")}</td></tr>`), "No staff match the current search.")}
      </section>
      ${roleModalMarkup(staff[0])}`;
  }

  function roleModalMarkup(user) {
    if (!user) return "";
    const role = state.roleEditorRole;
    return `<section class="panel role-modal-preview">
      <div class="panel-title"><div><h2>Edit User Role</h2><small>Professional role assignment modal preview</small></div>${statusPill("Live Preview")}</div>
      <div class="modal-surface">
        <div class="form-grid">
          <label>Name<input value="${escapeHtml(user.name)}"></label>
          <label>Email<input value="${escapeHtml(user.email)}"></label>
          <label>Phone<input value="+254 712 000 451"></label>
          <label>Status<select><option>Active</option><option>Suspended</option></select></label>
          <label>Assigned Role<select id="rolePreviewSelect">${Object.entries(roleNames).map(([id, label]) => `<option value="${escapeHtml(id)}" ${id === role ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>
        </div>
        <div class="permission-preview"><h3>Permissions Preview</h3><div class="permission-chip-grid">${(permissionsByRole[role] || []).map((permission) => `<span>${escapeHtml(permission)}</span>`).join("")}</div></div>
      </div>
    </section>`;
  }

  function renderRoleManager() {
    return `<section class="permission-grid">${Object.entries(roleNames).map(([id, label]) => `<article class="permission-card"><div class="panel-title"><h2>${escapeHtml(label)}</h2>${statusPill(id === "super_admin" ? "Full access" : "Scoped")}</div><p>${escapeHtml(id === "super_admin" ? "Unrestricted OMANUTRO administration across dashboards, data, integrations, security, and system health." : `Designed for ${label.toLowerCase()} workflows with least-privilege access.`)}</p><div class="permission-chip-grid">${(permissionsByRole[id] || []).map((permission) => `<span>${escapeHtml(permission)}</span>`).join("")}</div></article>`).join("")}</section>`;
  }

  function renderFinance() {
    return `<section class="stats-grid compact">${card("Revenue", money.format(6842000), "Gross July sales")}${card("Taxes", money.format(547360), "Estimated VAT")}${card("Refunds", money.format(84600), "2.1% of revenue")}${card("Payments", "1,482", "Settled transactions")}${card("M-Pesa Collections", money.format(4218400), "61.6% of sales")}${card("Profit", money.format(2189000), "After COGS and fees")}</section><section class="grid three">${chart("Revenue Trend", [{ label: "Apr", value: 4200000 }, { label: "May", value: 5100000 }, { label: "Jun", value: 5960000 }, { label: "Jul", value: 6842000 }], money.format)}${donut("Payment Methods", [{ label: "M-Pesa", value: 62, color: "#ff1493" }, { label: "Card", value: 28, color: "#8b5cf6" }, { label: "Cash", value: 10, color: "#14b8a6" }])}${chart("Tax Summary", [{ label: "VAT", value: 547360 }, { label: "Withholding", value: 84000 }, { label: "Fees", value: 126500 }], money.format)}</section>`;
  }

  function renderInventory() {
    const products = mergedProducts();
    return `<section class="stats-grid compact">${card("Current Stock", "8,412", "Across all warehouses")}${card("Low Stock", products.filter((p) => p.stock > 0 && p.stock <= 5).length, "Needs purchase order")}${card("Out of Stock", products.filter((p) => p.stock <= 0).length, "Hidden from storefront")}${card("Incoming Inventory", "1,260", "Expected this week")}${card("Warehouse Status", "Nominal", "Nairobi hub active")}</section><section class="grid two"><article class="panel"><h2>Stock Adjustments</h2>${timelineList([["Cycle count", "Pearl Street Tote adjusted +4 units", "Today"], ["Inbound", "Rose Noir Tailored Blazer received 60 units", "Yesterday"], ["Return", "Satin Scarf returned to inspection", "Yesterday"]])}</article><article class="panel"><h2>Warehouse Quantity</h2>${table(["Product", "Category", "Quantity", "Status"], products.map((product) => `<tr><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.category)}</td><td>${product.stock}</td><td>${statusPill(product.stock <= 0 ? "Out of stock" : product.stock <= 5 ? "Low stock" : "In stock")}</td></tr>`), "Inventory will appear after products are added.")}</article></section>`;
  }

  function renderRoleDashboard(role) {
    const cards = {
      customer: [["Orders", "8", "2 arriving this week"], ["Wishlist", "24", "Saved OMANUTRO styles"], ["Saved Addresses", "3", "Nairobi and Mombasa"], ["Reward Points", "1,840", "Silver tier"]],
      store_manager: [["Sales", money.format(318450), "Today"], ["Orders", "74", "New today"], ["Low Stock", "5", "Needs action"], ["Best Sellers", "Rose Noir", "Top item"]],
      finance: [["Revenue", money.format(6842000), "Month"], ["Taxes", money.format(547360), "Estimated"], ["Refunds", money.format(84600), "Open"], ["Payments", "1,482", "Settled"]],
      inventory: [["Current Stock", "8,412", "Units"], ["Low Stock", "5", "SKUs"], ["Out of Stock", "2", "SKUs"], ["Incoming", "1,260", "Units"]],
      fulfillment: [["Orders Waiting", "22", "Ready"], ["Packing Queue", "17", "In progress"], ["Shipping", "43", "In transit"], ["Returns", "6", "Pending"]],
      customer_support: [["Open Tickets", "18", "SLA 96%"], ["Customer History", "Live", "Unified"], ["Refund Requests", "5", "Needs review"], ["Cancellations", "3", "Today"]],
      marketing: [["Active Campaigns", "7", "Live"], ["Coupons", "14", "Available"], ["Conversion Rate", "4.8%", "+0.7"], ["Revenue Generated", money.format(1280000), "Attributed"]],
      content: [["Homepage Editor", "Live", "4 modules"], ["Media Library", "842", "Assets"], ["SEO Status", "94%", "Healthy"], ["Draft Content", "12", "Pending"]],
      analytics: [["Sales Analytics", money.format(6842000), "Read-only"], ["Customer Growth", "18.4%", "MoM"], ["Product Performance", "96", "SKUs"], ["Conversion Funnel", "4.8%", "Checkout"]],
      developer: [["API Health", "99.98%", "Healthy"], ["Request Latency", "142ms", "p95"], ["Error Rate", "0.08%", "Stable"], ["Feature Flags", "12", "Managed"]]
    };
    const roleCards = cards[role] || cards.store_manager;
    return `<section class="preview-banner"><strong>Viewing as: ${escapeHtml(roleNames[role])} (Preview Mode)</strong><span>Super Admin controls remain available. This preview does not alter the active session or permissions.</span></section><section class="stats-grid">${roleCards.map(([label, value, hint]) => card(label, value, hint)).join("")}</section><section class="grid two">${chart(`${roleNames[role]} Trend`, [{ label: "Week 1", value: 44 }, { label: "Week 2", value: 62 }, { label: "Week 3", value: 57 }, { label: "Week 4", value: 79 }])}<article class="panel"><h2>${escapeHtml(roleNames[role])} Work Queue</h2>${notificationList(roleCards.map(([label, value, hint]) => ({ type: label, label: `${value} - ${hint}` })))}</article></section>`;
  }

  function renderGeneric(title, cards) {
    return `<section class="stats-grid">${cards.map(([label, value, hint]) => card(label, value, hint)).join("")}</section><section class="grid two">${chart(`${title} Trend`, [{ label: "Mon", value: 24 }, { label: "Tue", value: 34 }, { label: "Wed", value: 41 }, { label: "Thu", value: 38 }, { label: "Fri", value: 52 }])}<article class="panel"><h2>${escapeHtml(title)} Activity</h2>${timelineList(demo.timeline)}</article></section>`;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
  }

  function renderView() {
    const view = document.getElementById("appView");
    if (!view) return;
    renderNav();
    setPageChrome();
    if (state.loading) {
      view.innerHTML = skeleton();
      return;
    }
    if (state.loadError || !state.dashboard) {
      view.innerHTML = errorState(state.loadError);
      return;
    }
    if (state.previewRole) {
      view.innerHTML = renderRoleDashboard(state.previewRole);
      return;
    }
    const routes = {
      overview: renderOverview,
      products: renderProducts,
      categories: () => renderGeneric("Categories", [["Active Categories", "18", "Fashion taxonomy"], ["Featured", "6", "Homepage placements"], ["Empty States", "1", "Needs products"], ["SEO Coverage", "92%", "Metadata complete"]]),
      collections: () => renderGeneric("Collections", [["Active Collections", "12", "Seasonal edits"], ["Featured", "4", "Homepage"], ["Drafts", "3", "Awaiting approval"], ["Revenue", money.format(1245000), "Attributed"]]),
      inventory: renderInventory,
      orders: () => `${filtersMarkup(["Date", "Status", "Payment", "Channel"])}<section class="panel"><h2>Order Queue</h2>${ordersTable(filterItems(mergedOrders(), ["id", "customer", "status", "payment"]))}</section>`,
      customers: () => renderGeneric("Customers", [["Active Customers", "12,840", "Non-staff accounts"], ["Repeat Rate", "38%", "+4.2%"], ["Average LTV", money.format(18400), "Premium buyers"], ["Reward Members", "4,218", "Enrolled"]]),
      fulfillment: () => renderRoleDashboard("fulfillment"),
      marketing: () => renderRoleDashboard("marketing"),
      content: () => renderRoleDashboard("content"),
      analytics: () => renderRoleDashboard("analytics"),
      finance: renderFinance,
      reports: () => renderGeneric("Reports", [["Scheduled Reports", "9", "Automated"], ["Exports", "148", "This month"], ["Data Freshness", "3 min", "Warehouse sync"], ["Audit Coverage", "100%", "Tracked"]]),
      staff: renderStaff,
      security: () => renderGeneric("Security", [["Active Sessions", "42", "Staff"], ["MFA Coverage", "91%", "Admins"], ["Role Changes", "6", "This week"], ["Risk Alerts", "0", "Critical"]]),
      developer: () => renderRoleDashboard("developer"),
      firebase: () => renderGeneric("Firebase", [["Auth", "Healthy", "Token service"], ["Messaging", "Online", "Push ready"], ["Admin SDK", "Connected", "Service account"], ["Errors", "0", "Critical"]]),
      integrations: () => renderGeneric("Integrations", [["M-Pesa", "Healthy", "Callbacks live"], ["UploadThing", "Online", "Media uploads"], ["Courier API", "Degraded", "Retrying"], ["Webhooks", "99.9%", "Delivery rate"]]),
      system: () => renderGeneric("System Health", [["Uptime", "99.98%", "30 days"], ["CPU", "42%", "Stable"], ["Memory", "61%", "Normal"], ["Queue Depth", "12", "Jobs"]]),
      logs: () => `<section class="panel"><h2>Operational Logs</h2>${timelineList(demo.timeline.concat([["API trace", "GET /api/admin/dashboard completed in 118ms", "2 hr ago"], ["Security", "RBAC permissions refreshed", "3 hr ago"]]))}</section>`,
      roles: renderRoleManager,
      settings: () => renderGeneric("Settings", [["Store Profile", "Complete", "Brand identity"], ["Payments", "Enabled", "M-Pesa and card"], ["Notifications", "12", "Templates"], ["Theme", "OMANUTRO Pink", "Active"]])
    };
    view.innerHTML = (routes[state.route] || renderOverview)();
    document.getElementById("tableSearch")?.addEventListener("input", (event) => {
      state.tableFilter = event.target.value;
      renderView();
    });
    document.getElementById("rolePreviewSelect")?.addEventListener("change", (event) => {
      state.roleEditorRole = event.target.value;
      renderView();
    });
  }

  async function ensureRbacLoaded() {
    if (state.rbac || !hasPermission("staff:manage")) return;
    state.rbac = await api("/api/admin/rbac");
  }

  function setRoute() {
    const next = (window.location.hash || "#overview").replace("#", "") || "overview";
    const item = allNavItems().find((entry) => entry.id === next);
    if (item?.preview) {
      state.previewRole = item.preview;
      state.route = item.id;
    } else {
      state.previewRole = "";
      state.route = item && canAccess(item) ? item.id : "overview";
    }
    state.tableFilter = "";
    renderView();
    closeMobileSidebar();
  }

  async function loadDashboard() {
    try {
      state.loading = true;
      state.loadError = "";
      renderView();
      const me = await api("/api/admin/auth/me");
      state.user = me.user;
      if (!hasPermission("admin:access") && !isSuperAdmin()) throw new Error("Admin access required.");
      const initials = (state.user.name || state.user.email || "AD").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
      document.getElementById("avatarInitials").textContent = initials;
      state.dashboard = await api("/api/admin/dashboard");
      await ensureRbacLoaded();
      state.loading = false;
      setRoute();
    } catch (err) {
      state.loading = false;
      state.dashboard = null;
      state.loadError = err.message || "Unable to load dashboard data.";
      if (/sign in|invalid|expired|admin access/i.test(state.loadError)) {
        localStorage.removeItem(tokenKey);
        window.location.href = "/admin/login.html";
        return;
      }
      renderView();
    }
  }

  function closeMobileSidebar() {
    document.getElementById("appShell")?.classList.remove("sidebar-open");
  }

  function applyStoredSidebarState() {
    const shell = document.getElementById("appShell");
    if (!shell || window.matchMedia("(max-width: 900px)").matches) return;
    const collapsed = sessionStorage.getItem(sidebarStateKey) === "collapsed";
    shell.classList.toggle("sidebar-collapsed", collapsed);
    document.getElementById("sidebarToggle")?.setAttribute("aria-expanded", String(!collapsed));
  }

  function toggleSidebar() {
    const shell = document.getElementById("appShell");
    if (!shell) return;
    if (window.matchMedia("(max-width: 900px)").matches) {
      shell.classList.toggle("sidebar-open");
      return;
    }
    shell.classList.toggle("sidebar-collapsed");
    const collapsed = shell.classList.contains("sidebar-collapsed");
    sessionStorage.setItem(sidebarStateKey, collapsed ? "collapsed" : "expanded");
    document.getElementById("sidebarToggle")?.setAttribute("aria-expanded", String(!collapsed));
  }

  function initDashboardChrome() {
    applyStoredSidebarState();
    document.getElementById("sidebarToggle")?.addEventListener("click", toggleSidebar);
    window.addEventListener("resize", applyStoredSidebarState);
    document.getElementById("mobileSidebarClose")?.addEventListener("click", closeMobileSidebar);
    document.getElementById("sidebarBackdrop")?.addEventListener("click", closeMobileSidebar);
    document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
    document.getElementById("logoutButton")?.addEventListener("click", () => {
      localStorage.removeItem(tokenKey);
      window.location.href = "/admin/login.html";
    });
    document.getElementById("logoutButtonTop")?.addEventListener("click", () => {
      localStorage.removeItem(tokenKey);
      window.location.href = "/admin/login.html";
    });
    document.getElementById("accountToggle")?.addEventListener("click", () => document.getElementById("accountMenu")?.classList.toggle("open"));
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#accountMenu")) document.getElementById("accountMenu")?.classList.remove("open");
    });
    document.getElementById("globalSearch")?.addEventListener("input", (event) => {
      state.tableFilter = event.target.value;
      renderView();
    });
    document.getElementById("sidebarNav")?.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-nav-group]");
      if (!toggle) return;
      event.preventDefault();
      const group = toggle.dataset.navGroup;
      if (state.openGroups.has(group)) state.openGroups.delete(group);
      else state.openGroups.add(group);
      renderNav();
    });
    document.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      if (action === "retry-load") return loadDashboard();
      if (action === "logout") return;
      if (action === "exit-preview") {
        window.location.hash = "#overview";
        return;
      }
      toast(`${event.target.textContent.trim()} is ready for backend integration`);
    });
    window.addEventListener("hashchange", setRoute);
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
