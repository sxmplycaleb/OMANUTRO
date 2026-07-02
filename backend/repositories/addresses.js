const crypto = require("crypto");
const { db } = require("./database");

function toAddress(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    phone: row.phone,
    county: row.county,
    city: row.city,
    area: row.area,
    street: row.street,
    building: row.building,
    notes: row.notes,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeAddress(body = {}) {
  const fullName = String(body.fullName || body.full_name || "").trim();
  const city = String(body.city || "").trim();

  if (!fullName || !city) {
    throw new Error("Full name and city are required.");
  }

  return {
    fullName,
    phone: String(body.phone || "").trim() || null,
    county: String(body.county || "").trim() || null,
    city,
    area: String(body.area || "").trim() || null,
    street: String(body.street || "").trim() || null,
    building: String(body.building || "").trim() || null,
    notes: String(body.notes || body.additionalNotes || "").trim() || null,
    isDefault: Boolean(body.isDefault)
  };
}

function allForUser(userId) {
  return db.prepare(`
    SELECT * FROM addresses
    WHERE user_id = ?
    ORDER BY is_default DESC, updated_at DESC
  `).all(userId).map(toAddress);
}

function setDefault(userId, addressId) {
  db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(userId);
  db.prepare("UPDATE addresses SET is_default = 1 WHERE user_id = ? AND id = ?").run(userId, addressId);
}

function create(userId, body) {
  const now = new Date().toISOString();
  const address = normalizeAddress(body);
  const id = `addr_${crypto.randomBytes(8).toString("hex")}`;
  const hasAddress = Boolean(db.prepare("SELECT 1 FROM addresses WHERE user_id = ? LIMIT 1").get(userId));

  db.transaction(() => {
    if (address.isDefault || !hasAddress) {
      db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(userId);
      address.isDefault = true;
    }

    db.prepare(`
      INSERT INTO addresses (
        id, user_id, full_name, phone, county, city, area, street, building, notes,
        is_default, created_at, updated_at
      ) VALUES (
        @id, @userId, @fullName, @phone, @county, @city, @area, @street, @building, @notes,
        @isDefault, @createdAt, @updatedAt
      )
    `).run({
      id,
      userId,
      ...address,
      isDefault: address.isDefault ? 1 : 0,
      createdAt: now,
      updatedAt: now
    });
  })();

  return toAddress(db.prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?").get(id, userId));
}

function update(userId, addressId, body) {
  const current = toAddress(db.prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?").get(addressId, userId));
  if (!current) return null;

  const next = { ...current, ...normalizeAddress({ ...current, ...body }) };
  const now = new Date().toISOString();

  db.transaction(() => {
    if (next.isDefault) setDefault(userId, addressId);

    db.prepare(`
      UPDATE addresses
      SET full_name = @fullName,
          phone = @phone,
          county = @county,
          city = @city,
          area = @area,
          street = @street,
          building = @building,
          notes = @notes,
          is_default = @isDefault,
          updated_at = @updatedAt
      WHERE id = @id AND user_id = @userId
    `).run({
      ...next,
      id: addressId,
      userId,
      isDefault: next.isDefault ? 1 : 0,
      updatedAt: now
    });
  })();

  return toAddress(db.prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?").get(addressId, userId));
}

function remove(userId, addressId) {
  const result = db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").run(addressId, userId);
  return result.changes > 0;
}

module.exports = {
  allForUser,
  create,
  update,
  remove
};
