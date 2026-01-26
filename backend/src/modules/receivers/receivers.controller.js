// backend/src/modules/receivers/receivers.controller.js
import sql from "mssql";
import { getPool } from "../../config/db.js";

function normalizePhone(phone) {
  if (phone === null || phone === undefined) return null;
  const s = String(phone).trim();
  if (!s) return null;
  return s.replace(/[^\d+]/g, "");
}

function uniqueViolation(err) {
  return err?.number === 2601 || err?.number === 2627;
}

export async function createReceiver(req, res) {
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
      .input("country", sql.NVarChar(60), country ? country.trim() : "Nepal")
      .input("createdByUserId", sql.Int, userId)
      .query(`
        INSERT INTO Receivers (fullName, phone, address, country, createdByUserId)
        OUTPUT INSERTED.*
        VALUES (@fullName, @phone, @address, @country, @createdByUserId)
      `);

    return res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (uniqueViolation(err)) {
      return res.status(409).json({ message: "Phone number already exists" });
    }
    console.error("createReceiver error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function listReceivers(req, res) {
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
        FROM Receivers
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
        FROM Receivers
        WHERE isActive = 1
          AND createdByUserId = @createdByUserId
          ${whereSearch}
        ORDER BY createdAt DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    return res.json({ page, limit, total, data: dataResult.recordset });
  } catch (err) {
    console.error("listReceivers error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getReceiverById(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid receiver id" });

    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("createdByUserId", sql.Int, userId)
      .query(`
        SELECT *
        FROM Receivers
        WHERE id = @id
          AND isActive = 1
          AND createdByUserId = @createdByUserId
      `);

    const receiver = result.recordset[0];
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    return res.json(receiver);
  } catch (err) {
    console.error("getReceiverById error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateReceiver(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid receiver id" });

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
        UPDATE Receivers
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
    if (!updated) return res.status(404).json({ message: "Receiver not found" });

    return res.json(updated);
  } catch (err) {
    if (uniqueViolation(err)) {
      return res.status(409).json({ message: "Phone number already exists" });
    }
    console.error("updateReceiver error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteReceiver(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid receiver id" });

    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("createdByUserId", sql.Int, userId)
      .query(`
        UPDATE Receivers
        SET isActive = 0, updatedAt = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
          AND isActive = 1
          AND createdByUserId = @createdByUserId
      `);

    const deleted = result.recordset[0];
    if (!deleted) return res.status(404).json({ message: "Receiver not found" });

    return res.json({ message: "Receiver deleted" });
  } catch (err) {
    console.error("deleteReceiver error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
