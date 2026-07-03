(function () {
  const endpointDefaults = {
    profileImage: { types: ["image/"], maxSize: 2 * 1024 * 1024, maxFiles: 1, imagesOnly: true },
    productImages: { types: ["image/"], maxSize: 4 * 1024 * 1024, maxFiles: 6, imagesOnly: true },
    categoryImages: { types: ["image/"], maxSize: 3 * 1024 * 1024, maxFiles: 1, imagesOnly: true },
    heroImages: { types: ["image/"], maxSize: 8 * 1024 * 1024, maxFiles: 2, imagesOnly: true },
    blogImages: { types: ["image/"], maxSize: 4 * 1024 * 1024, maxFiles: 8, imagesOnly: true },
    brandImages: { types: ["image/"], maxSize: 2 * 1024 * 1024, maxFiles: 1, imagesOnly: true },
    workWithUsImages: { types: ["image/"], maxSize: 4 * 1024 * 1024, maxFiles: 4, imagesOnly: true },
    documents: {
      types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/"],
      maxSize: 8 * 1024 * 1024,
      maxFiles: 3,
      rejectImages: true
    },
    resumes: {
      types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/"],
      maxSize: 4 * 1024 * 1024,
      maxFiles: 1,
      rejectImages: true
    }
  };

  const stateByInput = new WeakMap();
  let uploaderPromise = null;

  function loadUploader() {
    if (!uploaderPromise) {
      uploaderPromise = import("https://esm.sh/uploadthing@6.12.0/client?bundle")
        .then(({ genUploader }) => genUploader({ url: "/api/uploadthing", package: "omanutro-browser" }));
    }
    return uploaderPromise;
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function matchesType(file, patterns) {
    const type = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    return patterns.some((pattern) => {
      if (pattern.endsWith("/")) return type.startsWith(pattern);
      if (pattern.startsWith(".")) return name.endsWith(pattern);
      return type === pattern;
    });
  }

  function configFor(input) {
    const endpoint = input.dataset.uploadEndpoint || "documents";
    const base = endpointDefaults[endpoint] || endpointDefaults.documents;
    return {
      ...base,
      endpoint,
      maxFiles: Number(input.dataset.maxFiles || base.maxFiles || 1),
      maxSize: Number(input.dataset.maxSize || base.maxSize || 4 * 1024 * 1024)
    };
  }

  function validateFiles(files, config) {
    if (!files.length) return "Select a file to upload.";
    if (files.length > config.maxFiles) return `Upload ${config.maxFiles} file${config.maxFiles === 1 ? "" : "s"} or fewer.`;

    for (const file of files) {
      if (file.size > config.maxSize) return `${file.name} is larger than ${formatBytes(config.maxSize)}.`;
      if (config.imagesOnly && !file.type.startsWith("image/")) return `${file.name} must be an image.`;
      if (config.rejectImages && file.type.startsWith("image/")) return `${file.name} must be a document, not an image.`;
      if (!matchesType(file, config.types)) return `${file.name} is not an accepted file type.`;
    }
    return "";
  }

  async function compressImage(file) {
    if (!file.type.startsWith("image/") || file.size < 1024 * 1024 || !window.createImageBitmap) return file;
    const image = await createImageBitmap(file).catch(() => null);
    if (!image) return file;
    const maxSide = 1800;
    const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
    if (ratio >= 1 && file.size < 2 * 1024 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp", lastModified: Date.now() });
  }

  function buildUi(input) {
    const label = input.dataset.uploadLabel || input.closest("label")?.childNodes?.[0]?.textContent?.trim() || "Upload file";
    const root = document.createElement("div");
    root.className = "ut-upload";
    root.innerHTML = `
      <div class="ut-upload-drop" tabindex="0" role="button">
        <span class="ut-upload-icon" aria-hidden="true">+</span>
        <span><strong>${label}</strong><small>Click or drop files here</small></span>
      </div>
      <div class="ut-upload-preview" hidden></div>
      <div class="ut-upload-progress" hidden><i></i></div>
      <p class="ut-upload-status" aria-live="polite"></p>
      <div class="ut-upload-actions">
        <button class="secondary-button" type="button" data-ut-replace>Replace</button>
        <button class="secondary-button" type="button" data-ut-retry hidden>Retry</button>
        <button class="danger-button" type="button" data-ut-remove>Remove</button>
      </div>
    `;
    input.after(root);
    input.classList.add("visually-hidden");
    stateByInput.set(input, { root, files: [], uploaded: [], status: "idle" });
    return root;
  }

  function setStatus(input, status, message) {
    const state = stateByInput.get(input);
    state.status = status;
    state.root.dataset.status = status;
    state.root.querySelector(".ut-upload-status").textContent = message || "";
  }

  function renderPreview(input, files, uploaded) {
    const preview = stateByInput.get(input).root.querySelector(".ut-upload-preview");
    preview.hidden = !files.length && !uploaded?.length;
    const items = files.length ? files : uploaded || [];
    preview.innerHTML = items.map((item) => {
      const isFile = item instanceof File;
      const url = isFile && item.type.startsWith("image/") ? URL.createObjectURL(item) : item.url;
      const name = isFile ? item.name : item.name || "Uploaded file";
      const size = isFile ? item.size : item.size;
      const image = url && (isFile ? item.type.startsWith("image/") : /^image\//.test(item.type || ""))
        ? `<img src="${url}" alt="">`
        : `<span class="ut-file-icon" aria-hidden="true">DOC</span>`;
      return `<div class="ut-upload-file">${image}<span><strong>${name}</strong><small>${formatBytes(size || 0)}</small></span></div>`;
    }).join("");
  }

  function setProgress(input, value) {
    const progress = stateByInput.get(input).root.querySelector(".ut-upload-progress");
    progress.hidden = value <= 0 || value >= 100;
    progress.querySelector("i").style.width = `${Math.max(0, Math.min(value, 100))}%`;
  }

  function writeTargets(input, file) {
    const urlField = document.querySelector(input.dataset.urlField || "");
    const keyField = document.querySelector(input.dataset.keyField || "");
    if (urlField) {
      urlField.value = file?.url || "";
      urlField.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (keyField) {
      keyField.value = file?.key || "";
      keyField.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  async function uploadInput(input, selectedFiles) {
    const config = configFor(input);
    const files = [...(selectedFiles || input.files || [])];
    const validationError = validateFiles(files, config);
    const state = stateByInput.get(input);
    state.files = files;
    renderPreview(input, files);
    setProgress(input, 0);

    if (validationError) {
      setStatus(input, "error", validationError);
      state.root.querySelector("[data-ut-retry]").hidden = true;
      return null;
    }

    try {
      setStatus(input, "uploading", "Uploading...");
      const uploadFiles = await loadUploader();
      const processedFiles = await Promise.all(files.map(compressImage));
      const result = await uploadFiles(config.endpoint, {
        files: processedFiles,
        headers: () => {
          const token = window.CommerceApi?.getToken?.() || localStorage.getItem("commerce-auth-token") || "";
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        onUploadProgress: ({ progress }) => setProgress(input, progress)
      });
      state.uploaded = result;
      setProgress(input, 100);
      renderPreview(input, [], result);
      writeTargets(input, result[0]);
      state.root.querySelector("[data-ut-retry]").hidden = true;
      setStatus(input, "success", "Upload complete.");
      input.dispatchEvent(new CustomEvent("uploadthing:uploaded", { bubbles: true, detail: { files: result, endpoint: config.endpoint } }));
      return result;
    } catch (error) {
      state.root.querySelector("[data-ut-retry]").hidden = false;
      setStatus(input, "error", friendlyError(error));
      input.dispatchEvent(new CustomEvent("uploadthing:error", { bubbles: true, detail: { error } }));
      return null;
    }
  }

  function friendlyError(error) {
    const message = String(error?.message || "Upload failed.");
    if (/unauthorized|sign in|expired/i.test(message)) return "Sign in again before uploading.";
    if (/forbidden|permission/i.test(message)) return "You do not have permission to upload this file.";
    if (/network|fetch|failed to fetch/i.test(message)) return "Network error. Check your connection and retry.";
    if (/file size|larger|too large/i.test(message)) return "This file is too large for this upload.";
    return message.replace(/^UploadThingError:\s*/i, "") || "Upload failed. Try again.";
  }

  function enhance(input) {
    if (stateByInput.has(input)) return;
    const root = buildUi(input);
    const drop = root.querySelector(".ut-upload-drop");
    const openPicker = () => input.click();
    drop.addEventListener("click", openPicker);
    drop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPicker();
      }
    });
    root.querySelector("[data-ut-replace]").addEventListener("click", openPicker);
    root.querySelector("[data-ut-remove]").addEventListener("click", () => {
      input.value = "";
      stateByInput.get(input).files = [];
      stateByInput.get(input).uploaded = [];
      writeTargets(input, null);
      renderPreview(input, [], []);
      setProgress(input, 0);
      setStatus(input, "idle", "File removed. Save the form to keep this change.");
    });
    root.querySelector("[data-ut-retry]").addEventListener("click", () => uploadInput(input, stateByInput.get(input).files));
    input.addEventListener("change", () => uploadInput(input));

    ["dragenter", "dragover"].forEach((name) => drop.addEventListener(name, (event) => {
      event.preventDefault();
      root.classList.add("is-dragging");
    }));
    ["dragleave", "drop"].forEach((name) => drop.addEventListener(name, () => root.classList.remove("is-dragging")));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      uploadInput(input, event.dataTransfer.files);
    });

    const existingUrl = document.querySelector(input.dataset.urlField || "")?.value;
    const existingKey = document.querySelector(input.dataset.keyField || "")?.value;
    if (existingUrl || existingKey) {
      renderPreview(input, [], [{ url: existingUrl, key: existingKey, name: "Current file", type: input.accept?.includes("image") ? "image/*" : "" }]);
      setStatus(input, "success", "Current upload ready.");
    }
  }

  function init(root = document) {
    root.querySelectorAll("input[type='file'][data-upload-endpoint]").forEach(enhance);
  }

  window.UploadThingUploader = { init, uploadInput, endpointDefaults };
  document.addEventListener("DOMContentLoaded", () => init());
})();
