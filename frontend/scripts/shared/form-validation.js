(function () {
  "use strict";

  const KENYAN_PHONE_MESSAGE = "Enter a valid Kenyan phone number, for example 0747690999 or +254747690999.";
  const EMAIL_MESSAGE = "Enter a valid email address, for example customer@example.com.";
  const NAME_MESSAGE = "Use letters only.";
  const NUMBER_MESSAGE = "Enter numbers only.";

  const labelText = (field) => {
    const label = field.closest("label");
    if (!label) return "";
    return [...label.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(" ")
      .replace(/^\s*\*\s*/, "")
      .replace(/\s*\*\s*$/, "")
      .trim() || label.querySelector("span")?.textContent?.replace(/^\s*\*\s*/, "")?.trim() || "";
  };

  const fieldKey = (field) => `${field.id || ""} ${field.name || ""} ${labelText(field)} ${field.placeholder || ""}`.toLowerCase();
  const isVisible = (field) => !field.closest(".hidden") && field.offsetParent !== null;
  const normalizedPhone = (value) => String(value || "").replace(/[\s().-]/g, "");

  function isKenyanPhone(value) {
    const phone = normalizedPhone(value);
    return /^(?:\+?254|0)(?:7|1)\d{8}$/.test(phone);
  }

  function placeholderFor(field) {
    const key = fieldKey(field);
    if (field.type === "email" || key.includes("email")) return "customer@example.com";
    if (field.type === "tel" || key.includes("phone") || key.includes("whatsapp")) return "0747690999 or +254747690999";
    if (key.includes("full name") || key.includes("first name") || key.includes("last name") || key.includes("holder name")) return "Jane Amani";
    if (field.type === "url" || key.includes("url") || key.includes("linkedin") || key.includes("portfolio")) return "https://example.com";
    if (field.type === "date" || key.includes("date of birth")) return "YYYY-MM-DD";
    if (field.type === "number" || key.includes("price") || key.includes("stock") || key.includes("rating")) return "0";
    if (key.includes("card number")) return "1234 5678 9012 3456";
    if (key.includes("expiry")) return "MM/YY";
    if (key.includes("cvv")) return "123";
    if (key.includes("code")) return "123456";
    if (key.includes("address")) return "123 Main Street";
    if (key.includes("city") || key.includes("town")) return "Nairobi";
    if (key.includes("country")) return "Kenya";
    if (key.includes("county")) return "Nairobi County";
    if (key.includes("area")) return "Westlands";
    if (key.includes("street")) return "Muthithi Road";
    if (key.includes("building")) return "Omanutro House";
    if (key.includes("subject")) return "Order inquiry";
    if (key.includes("message")) return "Tell us how we can help.";
    if (key.includes("description")) return "Describe the product clearly.";
    if (key.includes("bio") || key.includes("about")) return "Tell us a little about yourself.";
    if (key.includes("cover letter")) return "Share why this role fits your experience.";
    if (key.includes("search")) return "Search products, orders, or questions";
    return "Enter details";
  }

  function removeRequiredMarker(label) {
    label.querySelectorAll(".required-marker").forEach((marker) => marker.remove());
    const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (textNode) textNode.textContent = textNode.textContent.replace(/^(\s*)\*\s*/, "$1").replace(/\s*\*\s*$/, "");
    label.querySelectorAll("span").forEach((span) => {
      if (!span.classList.contains("field-feedback")) span.textContent = span.textContent.replace(/^\s*\*\s*/, "").replace(/\s*\*\s*$/, "");
    });
  }

  function syncRequiredMarker(field) {
    const label = field.closest("label");
    if (!label) return;
    removeRequiredMarker(label);
    if (!field.required) return;
    const marker = document.createElement("span");
    marker.className = "required-marker";
    marker.textContent = "*";
    if (label.classList.contains("career-field") && label.querySelector("span")) {
      const labelSpan = label.querySelector("span");
      labelSpan.append(marker);
      return;
    }
    const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (textNode) {
      const directChild = field.parentElement === label ? field : field.closest("label > *");
      label.insertBefore(marker, directChild || null);
      return;
    }
    const firstLabelSpan = [...label.children].find((node) => node.tagName === "SPAN" && !node.classList.contains("field-feedback"));
    if (firstLabelSpan) {
      firstLabelSpan.append(marker);
      return;
    }
    const directChild = field.parentElement === label ? field : field.closest("label > *");
    label.insertBefore(marker, directChild || null);
  }

  function prepareField(field) {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
    if (field.type === "hidden" || field.type === "checkbox" || field.type === "radio" || field.type === "range" || field.type === "file") {
      syncRequiredMarker(field);
      return;
    }
    if (!field.placeholder || field.placeholder.trim() === "") field.placeholder = placeholderFor(field);
    syncRequiredMarker(field);
    validateField(field);
  }

  function validateField(field) {
    if (!field.willValidate) return true;
    if (!isVisible(field)) {
      field.setCustomValidity("");
      return true;
    }

    const value = String(field.value || "").trim();
    const key = fieldKey(field);
    let message = "";

    if (!message && field.required && !value) message = "This required field must be completed.";
    if (!message && value && key.includes("email or phone") && !(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) || isKenyanPhone(value))) message = "Enter a valid email address or Kenyan phone number.";
    if (!message && value && !key.includes("email or phone") && (field.type === "email" || key.includes("email")) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) message = EMAIL_MESSAGE;
    if (!message && value && (field.type === "tel" || key.includes("phone") || key.includes("whatsapp")) && !isKenyanPhone(value)) message = KENYAN_PHONE_MESSAGE;
    if (!message && value && (key.includes("full name") || key.includes("first name") || key.includes("last name") || key.includes("holder name")) && !/^[A-Za-z][A-Za-z\s.'-]{1,}$/.test(value)) message = NAME_MESSAGE;
    if (!message && value && (field.type === "number" || key.includes("price") || key.includes("stock") || key.includes("rating")) && !/^-?\d+(\.\d+)?$/.test(value)) message = NUMBER_MESSAGE;
    if (!message && value && (field.type === "date" || key.includes("date of birth")) && Number.isNaN(new Date(value).getTime())) message = "Enter a valid date.";
    if (!message && value && key.includes("code") && !/^\d{4,8}$/.test(value)) message = "Enter the numeric code only.";
    if (!message && value && key.includes("cvv") && !/^\d{3,4}$/.test(value)) message = "Enter a 3 or 4 digit CVV.";
    if (!message && value && key.includes("card number") && !/^\d(?:[\d ]{11,22})$/.test(value)) message = "Enter numbers only for the card number.";
    if (!message && value && key.includes("expiry") && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) message = "Enter expiry as MM/YY.";

    field.setCustomValidity(message);
    return !message;
  }

  function validateForm(form) {
    const fields = [...form.elements].filter((field) => field.willValidate);
    fields.forEach(syncRequiredMarker);
    fields.forEach(validateField);
    const invalid = fields.find((field) => !field.checkValidity());
    if (!invalid) return true;
    invalid.reportValidity();
    invalid.focus({ preventScroll: false });
    return false;
  }

  function linkVisibleEmails(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(node.textContent || "")) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest("a, script, style, textarea, input")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      const parts = node.textContent.split(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi);
      parts.forEach((part) => {
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(part)) {
          const link = document.createElement("a");
          link.href = `mailto:${part}`;
          link.textContent = part;
          fragment.append(link);
        } else {
          fragment.append(document.createTextNode(part));
        }
      });
      node.replaceWith(fragment);
    });
  }

  function enhance(root = document) {
    root.querySelectorAll?.("input, textarea, select").forEach(prepareField);
    linkVisibleEmails(root.body || root);
  }

  document.addEventListener("input", (event) => validateField(event.target));
  document.addEventListener("change", (event) => validateField(event.target));
  document.addEventListener("submit", (event) => {
    if (!validateForm(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    enhance();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes") {
          prepareField(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
        });
      });
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["required", "class"], childList: true, subtree: true });
  });
})();
