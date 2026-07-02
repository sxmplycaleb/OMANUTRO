(function () {
  "use strict";

  const INTERNAL_NAV_KEY = "omanutro-internal-nav";
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

  document.addEventListener("click", markInternalNavigation, true);
  document.addEventListener("DOMContentLoaded", setupNavIndicators);
})();
