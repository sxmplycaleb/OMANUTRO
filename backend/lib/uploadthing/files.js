const { UTApi } = require("uploadthing/server");

let utapi = null;

function uploadThingApiKey() {
  return process.env.UPLOADTHING_SECRET || process.env.UPLOADTHING_TOKEN || "";
}

function getUtapi() {
  const apiKey = uploadThingApiKey();
  if (!apiKey || !apiKey.startsWith("sk_")) return null;
  if (!utapi) {
    utapi = new UTApi({
      apiKey,
      logLevel: process.env.NODE_ENV === "production" ? "info" : "warn"
    });
  }
  return utapi;
}

function normalizeUpload(upload) {
  if (!upload) return { url: "", key: "" };
  return {
    url: upload.url || upload.fileUrl || "",
    key: upload.key || upload.fileKey || ""
  };
}

function uploadChanged(currentKey, nextKey) {
  return Boolean(currentKey && nextKey !== undefined && currentKey !== nextKey);
}

async function deleteUploadThingFile(key) {
  if (!key) return { skipped: true };
  const api = getUtapi();
  if (!api) {
    console.warn("UploadThing cleanup skipped because UPLOADTHING_SECRET is not configured.");
    return { skipped: true, reason: "missing_uploadthing_secret" };
  }
  try {
    return await api.deleteFiles(key);
  } catch (error) {
    console.warn(`UploadThing cleanup failed for ${key}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  deleteUploadThingFile,
  getUtapi,
  normalizeUpload,
  uploadChanged,
  uploadThingApiKey
};
