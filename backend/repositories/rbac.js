const crypto = require("crypto");
const { db, json } = require("./database");

const BUSINESS_ADMIN_EMAILS = new Set(["business.omanutro@gmail.com"]);

function isBusinessAdmin(user) {
  return BUSINESS_ADMIN_EMAILS.has(String(user?.email || "").trim().toLowerCase());
}

function rolesForUser(userId) {
  return db.prepare(`
    SELECT roles.id, roles.name, roles.description
    FROM user_roles
    INNER JOIN roles ON roles.id = user_roles.role_id
    WHERE user_roles.user_id = ?
    ORDER BY roles.name
  `).all(userId);
}

function permissionsForUser(userId) {
  const rows = db.prepare(`
    SELECT DISTINCT permissions.name
    FROM user_roles
    INNER JOIN role_permissions ON role_permissions.role_id = user_roles.role_id
    INNER JOIN permissions ON permissions.id = role_permissions.permission_id
    WHERE user_roles.user_id = ?
  `).all(userId);
  return rows.map((row) => row.name);
}

function permissionsForRoles(roleIds) {
  if (!roleIds.length) return [];
  const placeholders = roleIds.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT DISTINCT permissions.name
    FROM role_permissions
    INNER JOIN permissions ON permissions.id = role_permissions.permission_id
    WHERE role_permissions.role_id IN (${placeholders})
  `).all(...roleIds);
  return rows.map((row) => row.name);
}

function allRoles() {
  return db.prepare(`
    SELECT roles.id, roles.name, roles.description,
      COALESCE(json_group_array(permissions.name), '[]') AS permissions_json
    FROM roles
    LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
    LEFT JOIN permissions ON permissions.id = role_permissions.permission_id
    GROUP BY roles.id
    ORDER BY roles.name
  `).all().map((role) => ({
    ...role,
    permissions: JSON.parse(role.permissions_json || "[]").filter(Boolean)
  }));
}

function allPermissions() {
  return db.prepare("SELECT id, name, description FROM permissions ORDER BY name").all();
}

function accessForUser(user) {
  if (!user) return { roles: [], permissions: [] };
  let roles = rolesForUser(user.id);
  if (!roles.length && user.role) {
    const fallbackRoleId = user.role === "admin" ? "super_admin" : user.role;
    const fallbackRole = db.prepare("SELECT id, name, description FROM roles WHERE id = ?").get(fallbackRoleId);
    if (fallbackRole) roles = [fallbackRole];
  }
  if (isBusinessAdmin(user) && !roles.some((role) => role.id === "super_admin")) {
    const superAdminRole = db.prepare("SELECT id, name, description FROM roles WHERE id = ?").get("super_admin");
    if (superAdminRole) roles = [...roles, superAdminRole];
  }
  const roleIds = roles.map((role) => role.id);
  const permissions = roles.length ? permissionsForRoles(roleIds) : permissionsForUser(user.id);
  return {
    roles: roles.map((role) => role.name),
    permissions
  };
}

function hasPermission(user, permission) {
  const access = user.permissions ? user : accessForUser(user);
  return access.permissions?.includes("*") || access.permissions?.includes(permission);
}

function assignRole(userId, roleId, actorId = null) {
  const role = db.prepare("SELECT id FROM roles WHERE id = ?").get(roleId);
  if (!role) throw new Error("Role not found.");
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, ?)")
    .run(userId, roleId, new Date().toISOString());
  log(actorId, "role.assigned", "user", userId, { roleId });
}

function replaceRoles(userId, roleIds, actorId = null) {
  const uniqueRoleIds = [...new Set((roleIds || []).map((roleId) => String(roleId || "").trim()).filter(Boolean))];
  if (!uniqueRoleIds.length) throw new Error("Select at least one role.");
  db.transaction(() => {
    db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(userId);
    for (const roleId of uniqueRoleIds) assignRole(userId, roleId, actorId);
    log(actorId, "roles.replaced", "user", userId, { roleIds: uniqueRoleIds });
  })();
}

function log(userId, action, targetType = null, targetId = null, metadata = {}) {
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, target_type, target_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `audit_${crypto.randomBytes(8).toString("hex")}`,
    userId || null,
    action,
    targetType,
    targetId,
    json(metadata, {}),
    new Date().toISOString()
  );
}

module.exports = {
  rolesForUser,
  permissionsForUser,
  allRoles,
  allPermissions,
  accessForUser,
  hasPermission,
  assignRole,
  replaceRoles,
  log
};
