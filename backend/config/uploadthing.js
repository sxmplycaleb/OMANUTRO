const { createUploadthing, UploadThingError } = require("uploadthing/server");
const { authenticateHeaders } = require("../middleware/auth");

const f = createUploadthing();

const uploadPermissions = {
  profileImage: ["profile:manage_own", "admin:access"],
  productImages: ["products:manage"],
  categoryImages: ["categories:manage", "collections:manage"],
  heroImages: ["homepage:manage", "marketing:banners", "content:manage"],
  blogImages: ["content:manage"],
  brandImages: ["collections:manage", "content:manage"],
  workWithUsImages: ["content:manage", "marketing:banners"],
  documents: ["content:manage", "settings:manage", "admin:access"],
  resumes: ["profile:manage_own", "admin:access"]
};

function canUpload(user, endpoint) {
  const permissions = user?.permissions || [];
  return permissions.includes("*") || (uploadPermissions[endpoint] || []).some((permission) => permissions.includes(permission));
}

function createEndpoint(endpoint, config) {
  return f(config)
    .middleware(async ({ req, files }) => {
      const user = await authenticateHeaders(req.headers);
      if (!user) {
        throw new UploadThingError({ code: "UNAUTHORIZED", message: "Sign in to upload files." });
      }
      if (!canUpload(user, endpoint)) {
        throw new UploadThingError({ code: "FORBIDDEN", message: "You do not have permission to upload this file." });
      }
      if (!files.length) {
        throw new UploadThingError({ code: "BAD_REQUEST", message: "Select a file to upload." });
      }
      if (endpoint.includes("Images") || endpoint === "profileImage") {
        const invalid = files.find((file) => !String(file.type || "").startsWith("image/"));
        if (invalid) {
          throw new UploadThingError({ code: "BAD_REQUEST", message: "This endpoint only accepts image files." });
        }
      }
      if (["documents", "resumes"].includes(endpoint)) {
        const image = files.find((file) => String(file.type || "").startsWith("image/"));
        if (image) {
          throw new UploadThingError({ code: "BAD_REQUEST", message: "This endpoint only accepts document files." });
        }
        const allowedDocumentTypes = new Set([
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain"
        ]);
        const invalidDocument = files.find((file) => {
          const type = String(file.type || "").toLowerCase();
          const name = String(file.name || "").toLowerCase();
          return !allowedDocumentTypes.has(type) && !/\.(pdf|doc|docx|txt)$/.test(name);
        });
        if (invalidDocument) {
          throw new UploadThingError({ code: "BAD_REQUEST", message: "Upload a PDF, DOC, DOCX, or TXT document." });
        }
      }
      return { userId: user.id, endpoint };
    })
    .onUploadComplete(({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      endpoint: metadata.endpoint,
      url: file.url,
      key: file.key,
      name: file.name,
      size: file.size,
      type: file.type
    }));
}

const ourFileRouter = {
  profileImage: createEndpoint("profileImage", {
    image: { maxFileSize: "2MB", maxFileCount: 1 }
  }),
  productImages: createEndpoint("productImages", {
    image: { maxFileSize: "4MB", maxFileCount: 6 }
  }),
  categoryImages: createEndpoint("categoryImages", {
    image: { maxFileSize: "3MB", maxFileCount: 1 }
  }),
  heroImages: createEndpoint("heroImages", {
    image: { maxFileSize: "8MB", maxFileCount: 2 }
  }),
  blogImages: createEndpoint("blogImages", {
    image: { maxFileSize: "4MB", maxFileCount: 8 }
  }),
  brandImages: createEndpoint("brandImages", {
    image: { maxFileSize: "2MB", maxFileCount: 1 }
  }),
  workWithUsImages: createEndpoint("workWithUsImages", {
    image: { maxFileSize: "4MB", maxFileCount: 4 }
  }),
  documents: createEndpoint("documents", {
    pdf: { maxFileSize: "8MB", maxFileCount: 3 },
    text: { maxFileSize: "4MB", maxFileCount: 3 },
    blob: { maxFileSize: "8MB", maxFileCount: 3 }
  }),
  resumes: createEndpoint("resumes", {
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
    text: { maxFileSize: "2MB", maxFileCount: 1 },
    blob: { maxFileSize: "4MB", maxFileCount: 1 }
  })
};

module.exports = { ourFileRouter, uploadPermissions };
