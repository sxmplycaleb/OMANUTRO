(function () {
  "use strict";

  const INTERNAL_NAV_KEY = "omanutro-internal-nav";

  function redirectReloadsToHome() {
    const navigation = performance.getEntriesByType?.("navigation")?.[0];
    const isReload = navigation?.type === "reload" || performance.navigation?.type === 1;
    if (!isReload) return;

    const isHome = location.pathname === "/" || location.pathname.endsWith("/index.html");
    if (!isHome || location.search || location.hash) {
      location.replace("/");
    }
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
      return [...nav.querySelectorAll(".nav-tab.active")]
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

  function siteFooterMarkup() {
    return `
      <div class="footer-panel">
        <div class="footer-grid">
          <section class="footer-column footer-brand-column" aria-labelledby="footerBrandTitle">
            <a class="footer-logo-link" href="/" aria-label="OMANUTRO home">
              <img class="footer-logo-image" src="https://3z8qdlgzk1.ufs.sh/f/ryTwMvEKto8ys3y42oCTF6D4Ol9h23xm7RJM8UPeNGfvYBpI" alt="" width="96" height="96" loading="lazy" decoding="async">
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
              <li><a href="/contact#contactFaq">FAQs</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </nav>

          <nav class="footer-column" aria-labelledby="footerSupportTitle">
            <h2 class="footer-heading" id="footerSupportTitle">Support</h2>
            <ul class="footer-link-list">
              <li><a href="/contact#contactFaq">Shipping Information</a></li>
              <li><a href="/contact#contactFaq">Returns &amp; Exchanges</a></li>
              <li><a href="/contact#contactFaq">Size Guide</a></li>
              <li><a href="/catalog.html">Order Tracking</a></li>
              <li><a href="/contact">Privacy Policy</a></li>
              <li><a href="/contact">Terms &amp; Conditions</a></li>
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
              <a href="https://www.instagram.com/fans.of.caleb?igsh=MWUybGo3azY5NXAwbA==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="16.8" cy="7.2" r="1"/></svg></a>
              <a href="https://www.tiktok.com/@sxmplycaleb?_r=1&_t=ZS-96gVmON5zYG" target="_blank" rel="noopener noreferrer" aria-label="TikTok" title="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4c.5 2.4 2 3.9 4.5 4.3v3.4c-1.7 0-3.2-.5-4.5-1.4V16a4.8 4.8 0 1 1-4.8-4.8c.4 0 .8 0 1.1.1v3.6a1.5 1.5 0 1 0 .9 1.4V4H14Z"/></svg></a>
              <a href="https://x.com/sxmplycaleb" target="_blank" rel="noopener noreferrer" aria-label="X" title="X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4.3l3.3 4.7L16.7 4H20l-5.8 6.7L20.5 20h-4.3l-3.7-5.3L7.9 20H4.5l6.3-7.3L5 4Z"/></svg></a>
              <a href="https://www.facebook.com/share/1B6xXmP99d/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.1 0-5 1.9-5 5v3H6v4h3v4h4v-4h3.2l.8-4h-4V9c0-.7.3-1 1-1Z"/></svg></a>
              <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.4a3 3 0 0 0-2.1-2.1C17 5.8 12 5.8 12 5.8s-5 0-6.9.5A3 3 0 0 0 3 8.4 31.4 31.4 0 0 0 2.5 12c0 1.2.1 2.4.5 3.6a3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1c.4-1.2.5-2.4.5-3.6 0-1.2-.1-2.4-.5-3.6Z"/><path d="m10 15 5.2-3L10 9v6Z"/></svg></a>
            </div>
          </section>
        </div>

        <div class="footer-bottom">
          <p>&copy; <span id="copyrightYear"></span> Omanutro. All rights reserved.</p>
          <nav class="footer-legal-links" aria-label="Legal">
            <a href="/contact">Privacy Policy</a>
            <a href="/contact">Terms &amp; Conditions</a>
            <a href="/contact">Cookies</a>
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
  document.addEventListener("click", markInternalNavigation, true);
  document.addEventListener("DOMContentLoaded", setupTopbarScrollState);
  document.addEventListener("DOMContentLoaded", setupSiteFooters);
  document.addEventListener("DOMContentLoaded", setupNavIndicators);
})();
