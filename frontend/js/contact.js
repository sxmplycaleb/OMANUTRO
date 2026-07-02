(function () {
  "use strict";

  const root = document.documentElement;
  const savedTheme = localStorage.getItem("commerce-theme");
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  let currentTheme = savedTheme || preferredTheme;

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

  function setupReveals() {
    const nodes = [...document.querySelectorAll(".scroll-reveal")];
    if (!nodes.length) return;

    nodes.forEach((node, index) => {
      node.style.setProperty("--reveal-delay", `${Math.min(index, 8) * 70}ms`);
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
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px"
    });

    nodes.forEach((node) => observer.observe(node));
  }

  function setupFaq() {
    document.querySelectorAll(".contact-faq-item button").forEach((button) => {
      button.addEventListener("click", () => {
        const item = button.closest(".contact-faq-item");
        const isOpen = item.classList.toggle("is-open");
        button.setAttribute("aria-expanded", String(isOpen));
        button.querySelector("span").textContent = isOpen ? "-" : "+";
      });
    });
  }

  function showAlert(text, type) {
    const alert = document.getElementById("contactFormAlert");
    const toast = document.getElementById("toast");

    if (alert) {
      alert.textContent = text;
      alert.className = `form-alert ${type}`;
    }

    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function setupForm() {
    const form = document.getElementById("contactMessageForm");
    const success = document.getElementById("contactSuccess");
    if (!form || !success) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const invalidField = [...form.elements].find((field) => field.willValidate && !field.checkValidity());
      if (invalidField) {
        invalidField.reportValidity();
        showAlert("Please complete the required fields before sending.", "error");
        return;
      }

      form.reset();
      form.classList.add("hidden");
      success.classList.remove("hidden");
      success.focus({ preventScroll: true });
      showAlert("Message sent. Thanks for reaching out.", "success");
    });
  }

  function updateTopbarState() {
    document.body.classList.toggle("topbar-scrolled", window.scrollY > 12);
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(currentTheme);
    setupMobileNav();
    setupReveals();
    setupFaq();
    setupForm();
    updateTopbarState();
    window.addEventListener("scroll", updateTopbarState, { passive: true });

    const year = document.getElementById("copyrightYear");
    if (year) year.textContent = new Date().getFullYear();

    document.getElementById("themeToggleButton")?.addEventListener("click", () => {
      applyTheme(currentTheme === "light" ? "dark" : "light");
    });
  });
})();
