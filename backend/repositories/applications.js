const crypto = require("crypto");
const { db, json, parseJson } = require("./database");

const DEPARTMENT_ROLES = {
  hr: "hr",
  marketing: "marketing",
  operations: "operations",
  fulfillment: "operations",
  inventory: "operations",
  "customer service": "customer_support",
  "customer support": "customer_support",
  support: "customer_support",
  creative: "marketing",
  "e-commerce": "operations",
  ecommerce: "operations",
  internship: "hr",
  general: "hr"
};

function normalizeDepartment(value) {
  const raw = String(value || "").trim();
  if (!raw) return "HR";
  const key = raw.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");
  if (key.includes("marketing") || key.includes("content") || key.includes("creative")) return "Marketing";
  if (key.includes("customer") || key.includes("support") || key.includes("service")) return "Customer Service";
  if (key.includes("operation") || key.includes("fulfillment") || key.includes("inventory") || key.includes("e-commerce")) return "Operations";
  if (key.includes("intern") || key.includes("general") || key.includes("hr")) return "HR";
  return raw;
}

function assignedRoleForDepartment(department) {
  const key = String(department || "").toLowerCase();
  return DEPARTMENT_ROLES[key] || "hr";
}

function toApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    applicantName: row.applicant_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    city: row.city,
    position: row.position,
    department: row.department,
    assignedRole: row.assigned_role,
    employmentType: row.employment_type,
    linkedin: row.linkedin,
    portfolio: row.portfolio,
    resumeUrl: row.resume_url,
    resumeKey: row.resume_key,
    coverLetterUrl: row.cover_letter_url,
    coverLetterKey: row.cover_letter_key,
    portfolioFileUrl: row.portfolio_file_url,
    portfolioFileKey: row.portfolio_file_key,
    answers: parseJson(row.answers_json, {}),
    status: row.status,
    createdAt: row.created_at
  };
}

function create(payload) {
  const applicantName = String(payload.fullName || payload.applicantName || "").trim();
  const email = String(payload.email || "").trim();
  const phone = String(payload.phone || "").trim();
  const position = String(payload.position || "").trim();
  const department = normalizeDepartment(payload.department);
  const assignedRole = assignedRoleForDepartment(department);

  if (!applicantName) throw new Error("Full name is required.");
  if (!email) throw new Error("Email is required.");
  if (!phone) throw new Error("Phone number is required.");
  if (!position) throw new Error("Position is required.");

  const record = {
    id: `app_${crypto.randomBytes(8).toString("hex")}`,
    applicantName,
    email,
    phone,
    country: payload.country || null,
    city: payload.city || null,
    position,
    department,
    assignedRole,
    employmentType: payload.employmentType || null,
    linkedin: payload.linkedin || null,
    portfolio: payload.portfolio || null,
    resumeUrl: payload.resumeUrl || null,
    resumeKey: payload.resumeKey || null,
    coverLetterUrl: payload.coverLetterUrl || null,
    coverLetterKey: payload.coverLetterKey || null,
    portfolioFileUrl: payload.portfolioFileUrl || null,
    portfolioFileKey: payload.portfolioFileKey || null,
    answers: payload.answers || {},
    status: "Submitted",
    createdAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO applications (
      id, applicant_name, email, phone, country, city, position, department, assigned_role,
      employment_type, linkedin, portfolio, resume_url, resume_key, cover_letter_url,
      cover_letter_key, portfolio_file_url, portfolio_file_key, answers_json, status, created_at
    ) VALUES (
      @id, @applicantName, @email, @phone, @country, @city, @position, @department, @assignedRole,
      @employmentType, @linkedin, @portfolio, @resumeUrl, @resumeKey, @coverLetterUrl,
      @coverLetterKey, @portfolioFileUrl, @portfolioFileKey, @answersJson, @status, @createdAt
    )
  `).run({ ...record, answersJson: json(record.answers, {}) });

  return record;
}

function allForUser(user) {
  const role = String(user?.role || "").toLowerCase();
  const roles = (user?.roles || []).map((entry) => String(entry || "").toLowerCase());
  const permissions = user?.permissions || [];
  const isSuperAdmin = role === "super_admin" || role === "admin" || permissions.includes("*") || roles.includes("super_admin");

  if (isSuperAdmin) {
    return db.prepare("SELECT * FROM applications ORDER BY created_at DESC").all().map(toApplication);
  }

  const assignedRoles = [role, ...roles].filter(Boolean);
  if (!assignedRoles.length) return [];
  const placeholders = assignedRoles.map(() => "?").join(",");
  return db.prepare(`
    SELECT *
    FROM applications
    WHERE assigned_role IN (${placeholders})
    ORDER BY created_at DESC
  `).all(...assignedRoles).map(toApplication);
}

module.exports = {
  allForUser,
  assignedRoleForDepartment,
  create,
  normalizeDepartment
};
