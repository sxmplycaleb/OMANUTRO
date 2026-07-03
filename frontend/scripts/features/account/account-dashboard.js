(function () {
  const state = {
    account: null,
    activePanel: "overview"
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function toast(message) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(node.timeout);
    node.timeout = setTimeout(() => node.classList.remove("show"), 2600);
  }

  function initials(user) {
    return window.CommerceAuth?.initials(user) || String(user?.name || user?.email || "O").slice(0, 1).toUpperCase();
  }

  function photoMarkup(user, fallback) {
    if (user?.avatarUrl) return `<img src="${escapeHtml(user.avatarUrl)}" alt="">`;
    return escapeHtml(fallback || initials(user));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
  }

  function date(value) {
    return value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Not available";
  }

  function savedJobsStorageKey() {
    const user = state.account?.user || JSON.parse(localStorage.getItem("omanutro-auth-user") || "null");
    const accountId = user?.id || user?.email;
    return accountId ? `omanutro-saved-jobs:${accountId}` : "omanutro-saved-jobs:guest";
  }

  function readSavedJobs() {
    if (state.account?.savedJobs) return state.account.savedJobs;
    try {
      return JSON.parse(localStorage.getItem(savedJobsStorageKey()) || "[]");
    } catch {
      return [];
    }
  }

  function writeSavedJobs(jobs) {
    localStorage.setItem(savedJobsStorageKey(), JSON.stringify(jobs));
  }

  async function api(path, options) {
    return window.CommerceApi.request(path, options);
  }

  function ensureSavedJobsPanel() {
    if (!$("[data-panel='saved-jobs']")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.panel = "saved-jobs";
      button.textContent = "Saved Jobs";
      $(".account-nav")?.insertBefore(button, $("[data-panel='addresses']") || $("[data-panel='profile']"));
    }

    if (!$("#panel-saved-jobs")) {
      const panel = document.createElement("section");
      panel.className = "account-panel";
      panel.id = "panel-saved-jobs";
      panel.innerHTML = `
        <div class="panel-heading"><h2>Saved Jobs</h2><a class="secondary-button" href="/work-with-us.html#openPositions">Add Positions</a></div>
        <div class="account-list" id="savedJobsAccountList"></div>
      `;
      $("#panel-wishlist")?.after(panel);
    }
  }

  function showPanel(panel) {
    state.activePanel = panel;
    $$(".account-panel").forEach((node) => node.classList.toggle("active", node.id === `panel-${panel}`));
    $$("[data-panel]").forEach((node) => node.classList.toggle("active", node.dataset.panel === panel));
    $("#accountTitle").textContent = panel === "saved-jobs" ? "Saved Jobs" : panel[0].toUpperCase() + panel.slice(1);
  }

  function renderChrome() {
    const user = state.account.user;
    $("#accountName").textContent = user.name || "Omanutro Customer";
    $("#accountEmail").textContent = user.email || "";
    $("#accountPhoto").innerHTML = photoMarkup(user);
    $("#overviewPhoto").innerHTML = photoMarkup(user);
    $("#welcomeText").textContent = `Welcome back, ${user.name || "friend"}`;
    $("#overviewName").textContent = user.name || "Omanutro Customer";
    $("#overviewEmail").textContent = user.email || "";
    $("#overviewCreated").textContent = `Member since ${date(user.createdAt)}`;
    $("#profileName").value = user.name || "";
    $("#profileEmail").value = user.email || "";
    $("#profilePhone").value = user.phone || "";
    $("#profileAvatarUrl").value = user.avatarUrl || "";
  }

  function renderOverview() {
    const stats = state.account.stats;
    $("#metricOrders").textContent = stats.orders.total;
    $("#metricPending").textContent = stats.orders.pending;
    $("#metricCompleted").textContent = stats.orders.completed;
    $("#metricCartItems").textContent = stats.cartItems;
    $("#metricWishlist").textContent = stats.wishlist;
  }

  function orderDetails(order) {
    const items = (order.items || []).map((item) => {
      const options = Object.entries(item.options || {}).map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value)}`).join(", ");
      return `
        <li>
          <strong>${escapeHtml(item.name || item.productId)}</strong>
          <span>${item.quantity} x ${money(item.price)}${options ? ` - ${options}` : ""}</span>
        </li>
      `;
    }).join("");
    const timeline = (order.timeline || []).map((entry) => `<li>${escapeHtml(entry.label)} <span>${date(entry.at)}</span></li>`).join("");
    return `
      <details>
        <summary>View Details</summary>
        <div class="order-detail-grid">
          <div><span>Ship To</span><strong>${escapeHtml(order.shippingAddress?.name || "")}</strong><p>${escapeHtml(order.shippingAddress?.address || "")}, ${escapeHtml(order.shippingAddress?.city || "")}</p></div>
          <div><span>Payment</span><strong>${escapeHtml(order.paymentProvider || "m-pesa")}</strong><p>${order.mpesaReceiptNumber ? `Receipt ${escapeHtml(order.mpesaReceiptNumber)}` : escapeHtml(order.paymentStatus)}</p></div>
        </div>
        <ul class="detail-list">${items}</ul>
        <ul class="timeline-list">${timeline}</ul>
      </details>
    `;
  }

  function renderOrders() {
    const orders = state.account.orders || [];
    $("#ordersList").innerHTML = orders.length ? orders.map((order) => `
      <article class="account-item">
        <div>
          <span>${escapeHtml(order.orderNumber || order.id)}</span>
          <h3>${money(order.total)}</h3>
          <p>${date(order.createdAt)} - ${escapeHtml(order.status)} - ${escapeHtml(order.paymentStatus)}</p>
          ${order.mpesaReceiptNumber ? `<p>M-Pesa Receipt: ${escapeHtml(order.mpesaReceiptNumber)}</p>` : ""}
        </div>
        ${orderDetails(order)}
      </article>
    `).join("") : emptyState("No orders yet.", "Your M-Pesa orders will appear here after checkout.");
  }

  function renderWishlist() {
    const wishlist = state.account.wishlist || [];
    $("#wishlistList").innerHTML = wishlist.length ? wishlist.map((item) => `
      <article class="account-item product-row">
        <img src="${escapeHtml(item.product?.image || "")}" alt="">
        <div>
          <span>${escapeHtml(item.product?.category || "Product")}</span>
          <h3>${escapeHtml(item.product?.name || item.productId)}</h3>
          <p>${money(item.product?.price)}</p>
        </div>
        <button class="secondary-button" type="button" data-move-wishlist="${escapeHtml(item.productId)}">Move to Cart</button>
        <button class="danger-button" type="button" data-remove-wishlist="${escapeHtml(item.id)}">Remove</button>
      </article>
    `).join("") : emptyState("Your wishlist is empty.", "Save products from the catalog and they will sync here.");
  }

  function renderSavedJobs() {
    const list = $("#savedJobsAccountList");
    if (!list) return;
    const savedJobs = readSavedJobs();
    list.innerHTML = savedJobs.length ? savedJobs.map((job) => `
      <article class="account-item">
        <div>
          <span>${escapeHtml(job.department || "Careers")}</span>
          <h3>${escapeHtml(job.title)}</h3>
          <p>${escapeHtml([job.type, job.location, job.level].filter(Boolean).join(" - "))}</p>
        </div>
        <a class="secondary-button" href="/work-with-us.html#applicationForm" data-apply-saved-job="${escapeHtml(job.title)}">Apply Now</a>
        <button class="danger-button" type="button" data-remove-saved-job="${escapeHtml(job.title)}">Remove</button>
      </article>
    `).join("") : emptyState("No saved jobs yet.", "Save positions from the Careers page and they will appear here.");
  }

  function renderAddresses() {
    const addresses = state.account.addresses || [];
    $("#addressesList").innerHTML = addresses.length ? addresses.map((address) => `
      <article class="account-item">
        <div>
          <span>${address.isDefault ? "Default Address" : "Saved Address"}</span>
          <h3>${escapeHtml(address.fullName)}</h3>
          <p>${escapeHtml([address.building, address.street, address.area, address.city, address.county].filter(Boolean).join(", "))}</p>
          <p>${escapeHtml(address.phone || "")}</p>
        </div>
        <button class="secondary-button" type="button" data-edit-address="${escapeHtml(address.id)}">Edit</button>
        <button class="danger-button" type="button" data-delete-address="${escapeHtml(address.id)}">Delete</button>
      </article>
    `).join("") : emptyState("No saved addresses.", "Add a delivery address to make checkout faster.");
  }

  function emptyState(title, message) {
    return `<div class="account-empty"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
  }

  function render() {
    renderChrome();
    renderOverview();
    renderOrders();
    renderWishlist();
    renderSavedJobs();
    renderAddresses();
  }

  async function loadAccount() {
    try {
      state.account = await api("/api/account");
      render();
    } catch (error) {
      if (error.status === 401) {
        sessionStorage.setItem("omanutro-account-redirect", "1");
        location.href = "/?signin=1";
        return;
      }
      toast(error.message);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const data = await api("/api/account", {
      method: "PUT",
      body: {
        name: $("#profileName").value,
        phone: $("#profilePhone").value,
        avatarUrl: $("#profileAvatarUrl").value
      }
    });
    state.account.user = data.user;
    renderChrome();
    toast("Profile updated.");
  }

  async function saveAddress(event) {
    event.preventDefault();
    const id = $("#addressId").value;
    const body = {
      fullName: $("#addressFullName").value,
      phone: $("#addressPhone").value,
      county: $("#addressCounty").value,
      city: $("#addressCity").value,
      area: $("#addressArea").value,
      street: $("#addressStreet").value,
      building: $("#addressBuilding").value,
      notes: $("#addressNotes").value,
      isDefault: $("#addressDefault").checked
    };
    await api(id ? `/api/addresses/${id}` : "/api/addresses", { method: id ? "PUT" : "POST", body });
    event.target.reset();
    $("#addressId").value = "";
    await loadAccount();
    showPanel("addresses");
    toast("Address saved.");
  }

  function fillAddress(id) {
    const address = state.account.addresses.find((entry) => entry.id === id);
    if (!address) return;
    $("#addressId").value = address.id;
    $("#addressFullName").value = address.fullName || "";
    $("#addressPhone").value = address.phone || "";
    $("#addressCounty").value = address.county || "";
    $("#addressCity").value = address.city || "";
    $("#addressArea").value = address.area || "";
    $("#addressStreet").value = address.street || "";
    $("#addressBuilding").value = address.building || "";
    $("#addressNotes").value = address.notes || "";
    $("#addressDefault").checked = address.isDefault;
  }

  async function logout() {
    if (window.FirebaseAuth?.logoutGoogle) {
      await window.FirebaseAuth.logoutGoogle({ silent: true }).catch(() => {});
    }
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.CommerceAuth?.clearSession();
    localStorage.removeItem("omanutro-auth-user");
    sessionStorage.setItem("omanutro-logout-success", "1");
    location.href = "/";
  }

  function bindEvents() {
    $$("[data-panel]").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.panel)));
    $$("[data-action='logout'], #securityLogout").forEach((button) => button.addEventListener("click", logout));
    $("#profileForm").addEventListener("submit", (event) => saveProfile(event).catch((error) => toast(error.message)));
    $("#addressForm").addEventListener("submit", (event) => saveAddress(event).catch((error) => toast(error.message)));
    $("#refreshOrders").addEventListener("click", () => loadAccount().catch((error) => toast(error.message)));
    document.addEventListener("click", async (event) => {
      const removeWish = event.target.closest("[data-remove-wishlist]");
      const moveWish = event.target.closest("[data-move-wishlist]");
      const removeSavedJob = event.target.closest("[data-remove-saved-job]");
      const applySavedJob = event.target.closest("[data-apply-saved-job]");
      const editAddress = event.target.closest("[data-edit-address]");
      const deleteAddress = event.target.closest("[data-delete-address]");

      if (removeWish) {
        const data = await api(`/api/wishlist/${removeWish.dataset.removeWishlist}`, { method: "DELETE" });
        state.account.wishlist = data.wishlist;
        renderWishlist();
        renderOverview();
      }

      if (moveWish) {
        const data = await api(`/api/wishlist/${moveWish.dataset.moveWishlist}/move-to-cart`, { method: "POST" });
        state.account.wishlist = data.wishlist;
        state.account.cart = data.cart;
        state.account.stats.cartItems = data.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        state.account.stats.wishlist = data.wishlist.length;
        renderWishlist();
        renderOverview();
        toast("Moved to cart.");
      }

      if (removeSavedJob) {
        const data = await api(`/api/saved-jobs/${encodeURIComponent(removeSavedJob.dataset.removeSavedJob)}`, { method: "DELETE" });
        state.account.savedJobs = data.savedJobs;
        renderSavedJobs();
        toast("Saved job removed.");
      }

      if (applySavedJob) {
        localStorage.setItem("omanutro-career-apply-position", applySavedJob.dataset.applySavedJob);
      }

      if (editAddress) {
        fillAddress(editAddress.dataset.editAddress);
        showPanel("addresses");
      }

      if (deleteAddress) {
        await api(`/api/addresses/${deleteAddress.dataset.deleteAddress}`, { method: "DELETE" });
        await loadAccount();
        showPanel("addresses");
        toast("Address deleted.");
      }
    });
  }

  ensureSavedJobsPanel();
  bindEvents();
  const initialPanel = location.hash.replace("#", "");
  if (initialPanel) showPanel(initialPanel);
  loadAccount();
})();
