const crypto = require("crypto");
const { db } = require("./database");

function toSavedJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    department: row.department,
    type: row.job_type,
    location: row.location,
    level: row.level,
    description: row.description,
    savedAt: row.created_at
  };
}

function allForUser(userId) {
  return db.prepare(`
    SELECT *
    FROM saved_jobs
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId).map(toSavedJob);
}

function add(userId, job) {
  const title = String(job.title || "").trim();
  if (!title) {
    throw new Error("Missing job title.");
  }

  db.prepare(`
    INSERT INTO saved_jobs (
      id, user_id, title, department, job_type, location, level, description, created_at
    ) VALUES (
      @id, @userId, @title, @department, @type, @location, @level, @description, @createdAt
    )
    ON CONFLICT(user_id, title) DO UPDATE SET
      department = excluded.department,
      job_type = excluded.job_type,
      location = excluded.location,
      level = excluded.level,
      description = excluded.description
  `).run({
    id: `job_${crypto.randomBytes(8).toString("hex")}`,
    userId,
    title,
    department: job.department || null,
    type: job.type || null,
    location: job.location || null,
    level: job.level || null,
    description: job.description || null,
    createdAt: new Date().toISOString()
  });

  return allForUser(userId);
}

function remove(userId, idOrTitle) {
  db.prepare(`
    DELETE FROM saved_jobs
    WHERE user_id = ?
      AND (id = ? OR title = ?)
  `).run(userId, idOrTitle, idOrTitle);
  return allForUser(userId);
}

module.exports = {
  allForUser,
  add,
  remove
};
