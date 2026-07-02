(function () {
  "use strict";

  const root = document.documentElement;
  const savedTheme = localStorage.getItem("commerce-theme");
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  let currentTheme = savedTheme || preferredTheme;

  function redirectReloadToHome() {
    const navigation = performance.getEntriesByType?.("navigation")?.[0];
    const isReload = navigation
      ? navigation.type === "reload"
      : performance.navigation?.type === 1;

    if (isReload && location.pathname !== "/") {
      location.replace("/");
    }
  }

  function applyTheme(theme) {
    currentTheme = theme === "light" ? "light" : "dark";
    root.dataset.theme = currentTheme;
    localStorage.setItem("commerce-theme", currentTheme);

    const button = document.getElementById("themeToggleButton");
    if (!button) return;

    const nextTheme = currentTheme === "light" ? "dark" : "light";
    button.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    button.setAttribute("aria-checked", String(currentTheme === "dark"));
    button.setAttribute("title", `Switch to ${nextTheme} theme`);
  }

  function setupMobileNav() {
    const button = document.getElementById("mobileMenuButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("mobile-nav-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });

    document.querySelectorAll(".nav-tab").forEach((link) => {
      link.addEventListener("click", () => {
        document.body.classList.remove("mobile-nav-open");
        button.setAttribute("aria-expanded", "false");
      });
    });
  }

  function updateTopbarState() {
    document.body.classList.toggle("topbar-scrolled", window.scrollY > 12);
  }

  function setupReveals() {
    const nodes = [...document.querySelectorAll(".scroll-reveal")];
    if (!nodes.length) return;

    nodes.forEach((node, index) => {
      node.style.setProperty("--reveal-delay", `${Math.min(index, 8) * 80}ms`);
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    });

    nodes.forEach((node) => observer.observe(node));
  }

  function setupGalleryParallax() {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const images = [...document.querySelectorAll(".about-gallery img")];
    if (!images.length || motionQuery.matches) return;

    let ticking = false;

    function update() {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      images.forEach((image) => {
        const rect = image.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
        const offset = Math.max(-18, Math.min(18, progress * -28));
        image.style.setProperty("--parallax-offset", `${offset.toFixed(2)}px`);
      });
      ticking = false;
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  }

  redirectReloadToHome();

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(currentTheme);
    setupMobileNav();
    setupReveals();
    setupGalleryParallax();
    updateTopbarState();
    window.addEventListener("scroll", updateTopbarState, { passive: true });

    const year = document.getElementById("copyrightYear");
    if (year) year.textContent = new Date().getFullYear();

    document.getElementById("themeToggleButton")?.addEventListener("click", () => {
      applyTheme(currentTheme === "light" ? "dark" : "light");
    });
  });
})();
