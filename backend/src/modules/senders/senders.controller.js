// backend/src/modules/senders/senders.controller.js
import sql from "mssql";
import { getPool } from "../../config/db.js";

// Optional: normalize phone to reduce duplicates like "123 456" vs "123456"
function normalizePhone(phone) {
  if (phone === null || phone === undefined) return null;
  const s = String(phone).trim();
  if (!s) return null;
  // keep digits and +
  return s.replace(/[^\d+]/g, "");
}

function uniqueViolation(err) {
  // SQL Server unique constraint / index violation
  return err?.number === 2601 || err?.number === 2627;
}

export async function createSender(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { fullName, phone, address, country } = req.body;

    const pool = await getPool();

    const result = await pool
      .request()
      .input("fullName", sql.NVarChar(120), fullName.trim())
      .input("phone", sql.NVarChar(40), normalizePhone(phone))
      .input("address", sql.NVarChar(255), address ? address.trim() : null)
      .input("country", sql.NVarChar(60), country ? country.trim() : "Japan")
      .input("createdByUserId", sql.Int, userId)
      .query(`
        INSERT INTO Senders (fullName, phone, address, country, createdByUserId)
        OUTPUT INSERTED.*
        VALUES (@fullName, @phone, @address, @country, @createdByUserId)
      `);

    return res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (uniqueViolation(err)) {
      return res.status(409).json({ message: "Phone number already exists" });
    }
    console.error("createSender error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function listSenders(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const q = (req.query.q || "").toString().trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const offset = (page - 1) * limit;

    const pool = await getPool();

    const whereSearch = q ? "AND (fullName LIKE @q OR phone LIKE @q)" : "";

    const countResult = await pool
      .request()
      .input("createdByUserId", sql.Int, userId)
      .input("q", sql.NVarChar(260), q ? `%${q}%` : null)
      .query(`
        SELECT COUNT(*) AS total
        FROM Senders
        WHERE isActive = 1
          AND createdByUserId = @createdByUserId
          ${whereSearch}
      `);

    const total = countResult.recordset[0].total;

    const dataResult = await pool
      .request()
      .input("createdByUserId", sql.Int, userId)
      .input("q", sql.NVarChar(260), q ? `%${q}%` : null)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT *
        FROM Senders
        WHERE isActive = 1
          AND createdByUserId = @createdByUserId
          ${whereSearch}
        ORDER BY createdAt DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    return res.json({ page, limit, total, data: dataResult.recordset });
  } catch (err) {
    console.error("listSenders error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSenderById(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid sender id" });

    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("createdByUserId", sql.Int, userId)
      .query(`
        SELECT *
        FROM Senders
        WHERE id = @id
          AND isActive = 1
          AND createdByUserId = @createdByUserId
      `);

    const sender = result.recordset[0];
    if (!sender) return res.status(404).json({ message: "Sender not found" });

    return res.json(sender);
  } catch (err) {
    console.error("getSenderById error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateSender(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid sender id" });

    const { fullName, phone, address, country } = req.body;

    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("createdByUserId", sql.Int, userId)
      .input("fullName", sql.NVarChar(120), fullName ? fullName.trim() : null)
      .input("phone", sql.NVarChar(40), phone !== undefined ? normalizePhone(phone) : null)
      .input("address", sql.NVarChar(255), address ? address.trim() : null)
      .input("country", sql.NVarChar(60), country ? country.trim() : null)
      .query(`
        UPDATE Senders
        SET
          fullName = COALESCE(@fullName, fullName),
          phone = COALESCE(@phone, phone),
          address = COALESCE(@address, address),
          country = COALESCE(@country, country),
          updatedAt = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
          AND isActive = 1
          AND createdByUserId = @createdByUserId
      `);

    const updated = result.recordset[0];
    if (!updated) return res.status(404).json({ message: "Sender not found" });

    return res.json(updated);
  } catch (err) {
    if (uniqueViolation(err)) {
      return res.status(409).json({ message: "Phone number already exists" });
    }
    console.error("updateSender error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteSender(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid sender id" });

    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("createdByUserId", sql.Int, userId)
      .query(`
        UPDATE Senders
        SET isActive = 0, updatedAt = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
          AND isActive = 1
          AND createdByUserId = @createdByUserId
      `);

    const deleted = result.recordset[0];
    if (!deleted) return res.status(404).json({ message: "Sender not found" });

    return res.json({ message: "Sender deleted" });
  } catch (err) {
    console.error("deleteSender error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
