(function () {
  "use strict";

  const INTERNAL_NAV_KEY = "omanutro-internal-nav";
  const MORE_NAV_GROUPS = [
    {
      title: "Support",
      links: [
        { label: "FAQs", href: "/faq.html" },
        { label: "Size Guide", href: "/size-guide.html" },
        { label: "Returns & Exchanges", href: "/return-exchange-policy" }
      ]
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Terms & Conditions", href: "/terms-conditions" },
        { label: "Cookie Policy", href: "/cookie-policy" }
      ]
    }
  ];

  function redirectReloadsToHome() {
    return;
  }

  function setupTopbarScrollState() {
    const update = () => {
      document.body.classList.toggle("topbar-scrolled", window.scrollY > 2);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function markInternalNavigation(event) {
    const link = event.target.closest?.("a[href]");
    if (!link) return;

    const url = new URL(link.href, location.href);
    const isSameOrigin = url.origin === location.origin;
    const isModifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank";
    const isSamePageHash = url.pathname === location.pathname && url.hash && url.search === location.search;

    if (!isSameOrigin || isModifiedClick || isSamePageHash) return;
    sessionStorage.setItem(INTERNAL_NAV_KEY, "1");
  }

  function setupNavIndicator(nav) {
    if (!nav || nav.querySelector(".nav-active-indicator")) return;

    const indicator = document.createElement("span");
    indicator.className = "nav-active-indicator";
    indicator.setAttribute("aria-hidden", "true");
    nav.append(indicator);

    function visibleActiveTab() {
      return [...nav.querySelectorAll(".nav-tab.active:not(.nav-more-trigger)")]
        .find((tab) => tab.offsetParent !== null);
    }

    function moveIndicator(target = visibleActiveTab()) {
      if (!target) {
        indicator.classList.remove("is-visible");
        return;
      }

      const navRect = nav.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      indicator.style.width = `${Math.round(targetRect.width)}px`;
      indicator.style.transform = `translate3d(${Math.round(targetRect.left - navRect.left)}px, 0, 0)`;
      indicator.classList.add("is-visible");
    }

    nav.addEventListener("click", (event) => {
      const target = event.target.closest?.(".nav-tab");
      if (target && nav.contains(target)) moveIndicator(target);
    });
    document.getElementById("mobileMenuButton")?.addEventListener("click", () => {
      requestAnimationFrame(() => moveIndicator());
    });

    const observer = new MutationObserver(() => moveIndicator());
    nav.querySelectorAll(".nav-tab").forEach((tab) => {
      observer.observe(tab, { attributes: true, attributeFilter: ["class"] });
    });

    window.addEventListener("resize", () => moveIndicator(), { passive: true });
    requestAnimationFrame(() => moveIndicator());
  }

  function setupNavIndicators() {
    document.querySelectorAll(".nav-tabs").forEach(setupNavIndicator);
  }

  function normalizePath(value) {
    const url = new URL(value, location.origin);
    const path = url.pathname.replace(/\/index\.html$/, "/");
    return path.endsWith(".html") ? path.replace(/\.html$/, "") : path.replace(/\/$/, "") || "/";
  }

  function setupMoreNavigation() {
    document.querySelectorAll(".nav-tabs").forEach((nav, navIndex) => {
      if (nav.querySelector(".nav-more")) return;

      const existingPaths = new Set([...nav.querySelectorAll("a[href]")].map((link) => normalizePath(link.getAttribute("href"))));
      const currentPath = normalizePath(location.pathname);
      const groups = MORE_NAV_GROUPS
        .map((group) => ({
          ...group,
          links: group.links.filter((link) => !existingPaths.has(normalizePath(link.href)))
        }))
        .filter((group) => group.links.length);

      if (!groups.length) return;

      const more = document.createElement("div");
      more.className = "nav-more";
      const buttonId = `navMoreButton${navIndex}`;
      const menuId = `navMoreMenu${navIndex}`;
      more.innerHTML = `
        <button class="nav-tab nav-more-trigger" id="${buttonId}" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="${menuId}">
          More
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
        </button>
        <div class="nav-more-menu" id="${menuId}" role="menu" aria-labelledby="${buttonId}">
          ${groups.map((group) => `
            <section class="nav-more-group" aria-label="${group.title}">
              <span class="nav-more-heading">${group.title}</span>
              ${group.links.map((link) => {
                const isActive = normalizePath(link.href) === currentPath;
                return `<a class="nav-more-link${isActive ? " active" : ""}" href="${link.href}" role="menuitem"${isActive ? ' aria-current="page"' : ""}>${link.label}</a>`;
              }).join("")}
            </section>
          `).join("")}
        </div>
      `;
      nav.append(more);

      const trigger = more.querySelector(".nav-more-trigger");
      const menu = more.querySelector(".nav-more-menu");
      const close = (returnFocus = false) => {
        more.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        if (returnFocus) trigger.focus();
      };
      const open = () => {
        document.querySelectorAll(".nav-more.is-open").forEach((entry) => {
          if (entry !== more) {
            entry.classList.remove("is-open");
            entry.querySelector(".nav-more-trigger")?.setAttribute("aria-expanded", "false");
          }
        });
        more.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      };

      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        more.classList.contains("is-open") ? close() : open();
      });
      more.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(true);
        }
        if (event.key === "ArrowDown" && document.activeElement === trigger) {
          event.preventDefault();
          open();
          menu.querySelector("a")?.focus();
        }
      });
      menu.addEventListener("click", () => close());
    });

    document.addEventListener("click", (event) => {
      document.querySelectorAll(".nav-more.is-open").forEach((more) => {
        if (!more.contains(event.target)) {
          more.classList.remove("is-open");
          more.querySelector(".nav-more-trigger")?.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  function setupMobileNavigation() {
    const button = document.getElementById("mobileMenuButton");
    if (!button || button.dataset.mobileNavBound === "true") return;

    button.dataset.mobileNavBound = "true";
    button.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("mobile-nav-open");
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });

    document.querySelectorAll(".nav-tab").forEach((link) => {
      link.addEventListener("click", () => {
        if (!link.matches("a[href]")) return;
        document.body.classList.remove("mobile-nav-open");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Open navigation");
      });
    });
  }

  function siteFooterMarkup() {
    return `
      <div class="footer-panel">
        <div class="footer-grid">
          <section class="footer-column footer-brand-column" aria-labelledby="footerBrandTitle">
            <a class="footer-logo-link" href="/" aria-label="OMANUTRO home">
              <img class="footer-logo-image" src="https://3z8qdlgzk1.ufs.sh/f/ryTwMvEKto8yWUEcNazPVjgpf1LJ95aFliKEU3kwNuBomy2G" alt="" width="96" height="96" loading="lazy" decoding="async">
            </a>
            <div>
              <h2 class="footer-wordmark" id="footerBrandTitle">OMANUTRO</h2>
              <p class="footer-motto">Totum ad te pertinet.</p>
            </div>
            <p class="footer-description">Premium streetwear inspired by individuality, confidence, and modern culture.</p>
          </section>

          <nav class="footer-column" aria-labelledby="footerQuickLinksTitle">
            <h2 class="footer-heading" id="footerQuickLinksTitle">Quick Links</h2>
            <ul class="footer-link-list">
              <li><a href="/">Home</a></li>
              <li><a href="/#shopView">Shop</a></li>
              <li><a href="/catalog.html">Collections</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/faq.html">FAQs</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </nav>

          <nav class="footer-column" aria-labelledby="footerSupportTitle">
            <h2 class="footer-heading" id="footerSupportTitle">Support</h2>
            <ul class="footer-link-list">
              <li><a href="/faq.html#shipping">Shipping Information</a></li>
              <li><a href="/return-exchange-policy">Returns &amp; Exchanges</a></li>
              <li><a href="/size-guide.html">Size Guide</a></li>
              <li><a href="/catalog.html">Order Tracking</a></li>
              <li><a href="/privacy-policy">Privacy Policy</a></li>
              <li><a href="/terms-conditions">Terms &amp; Conditions</a></li>
              <li><a href="/cookie-policy">Cookie Policy</a></li>
            </ul>
          </nav>

          <section class="footer-column footer-newsletter-column" aria-labelledby="footerNewsletterTitle">
            <h2 class="footer-heading" id="footerNewsletterTitle">Stay Connected</h2>
            <p class="footer-newsletter-copy">Be the first to know about new drops, exclusive collections, and limited releases.</p>
            <form class="footer-newsletter-form" novalidate>
              <label class="visually-hidden" for="footerNewsletterEmail">Email address</label>
              <div class="footer-newsletter-control">
                <input id="footerNewsletterEmail" name="email" type="email" autocomplete="email" inputmode="email" placeholder="Email address" required aria-describedby="footerNewsletterMessage">
                <button class="footer-subscribe-button" type="submit">Subscribe</button>
              </div>
              <p class="footer-newsletter-message" id="footerNewsletterMessage" role="status" aria-live="polite"></p>
            </form>
            <div class="footer-social-links" aria-label="Social media">
              <a href="https://www.instagram.com/omanutro?igsh=cnJ2MGp1NDJjdXNz" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="16.8" cy="7.2" r="1"/></svg></a>
              <a href="https://www.tiktok.com/@omanutro?_r=1&_t=ZS-97ir8ngyBz0" target="_blank" rel="noopener noreferrer" aria-label="TikTok" title="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4c.5 2.4 2 3.9 4.5 4.3v3.4c-1.7 0-3.2-.5-4.5-1.4V16a4.8 4.8 0 1 1-4.8-4.8c.4 0 .8 0 1.1.1v3.6a1.5 1.5 0 1 0 .9 1.4V4H14Z"/></svg></a>
              <a href="https://x.com/omanutro" target="_blank" rel="noopener noreferrer" aria-label="X" title="X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4.3l3.3 4.7L16.7 4H20l-5.8 6.7L20.5 20h-4.3l-3.7-5.3L7.9 20H4.5l6.3-7.3L5 4Z"/></svg></a>
              <a href="https://www.facebook.com/share/1BTrQGbvMC/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.1 0-5 1.9-5 5v3H6v4h3v4h4v-4h3.2l.8-4h-4V9c0-.7.3-1 1-1Z"/></svg></a>
              <a href="https://whatsapp.com/channel/0029VbDY5lc3GJOpwXBDgj2Q" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Channel" title="WhatsApp Channel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a8.7 8.7 0 0 0-7.4 13.2L3.7 21l4.9-1.1A8.7 8.7 0 1 0 12 3Z"/><path d="M8.8 8.4c.3-.5.6-.5.9-.1l.8 1.2c.2.3.2.7-.1 1l-.3.4c.6 1 1.4 1.8 2.4 2.4l.4-.3c.3-.2.7-.3 1 0l1.2.7c.5.3.5.7.1 1.1-.6.6-1.3.9-2.1.8-2.6-.3-5.2-2.9-5.5-5.5-.1-.8.2-1.5 1.2-1.7Z"/></svg></a>
            </div>
          </section>
        </div>

        <div class="footer-bottom">
          <p>&copy; <span id="copyrightYear"></span> Omanutro. All rights reserved.</p>
          <nav class="footer-legal-links" aria-label="Legal">
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-conditions">Terms &amp; Conditions</a>
            <a href="/cookie-policy">Cookies</a>
            <a href="/return-exchange-policy">Returns</a>
            <span>Made with &#10084; in Kenya</span>
          </nav>
        </div>
      </div>
    `;
  }

  function setupNewsletterForm(form) {
    const input = form.querySelector("input[type='email']");
    const message = form.querySelector(".footer-newsletter-message");
    if (!input || !message) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = input.value.trim();

      form.classList.remove("is-success", "is-error");
      if (!email || !input.checkValidity()) {
        form.classList.add("is-error");
        message.textContent = "Enter a valid email to join the list.";
        input.focus();
        return;
      }

      form.classList.add("is-success");
      message.textContent = "You're on the list. Watch for the next drop.";
      form.reset();
    });

    input.addEventListener("input", () => {
      form.classList.remove("is-success", "is-error");
      message.textContent = "";
    });
  }

  function setupSiteFooters() {
    if (!document.querySelector(".site-footer")) {
      const footer = document.createElement("footer");
      footer.className = "site-footer";
      document.querySelector("main")?.after(footer);
    }

    document.querySelectorAll(".site-footer").forEach((footer) => {
      footer.id = footer.id || "footer";
      footer.setAttribute("aria-labelledby", "footerBrandTitle");
      footer.innerHTML = siteFooterMarkup();
      const year = footer.querySelector("#copyrightYear");
      if (year) year.textContent = new Date().getFullYear();
      footer.querySelectorAll(".footer-newsletter-form").forEach(setupNewsletterForm);
    });
  }

  redirectReloadsToHome();
  setupTopbarScrollState();
  setupSiteFooters();
  setupMobileNavigation();
  setupMoreNavigation();
  document.addEventListener("click", markInternalNavigation, true);
  document.addEventListener("DOMContentLoaded", setupTopbarScrollState);
  document.addEventListener("DOMContentLoaded", setupSiteFooters);
  document.addEventListener("DOMContentLoaded", setupMobileNavigation);
  document.addEventListener("DOMContentLoaded", setupMoreNavigation);
  document.addEventListener("DOMContentLoaded", setupNavIndicators);
})();
