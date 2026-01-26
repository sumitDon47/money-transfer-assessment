import sql from "mssql";
import { getPool } from "../../config/db.js";

function calcFee(amount) {
  // Simple fee rule (you can adjust anytime)
  // Example: 2% fee, minimum 50, maximum 2000
  const fee = amount * 0.02;
  return Math.min(Math.max(fee, 50), 2000);
}

export async function createTransaction(req, res) {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { senderId, receiverId, amount, currencyFrom, currencyTo, note } = req.body;

  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

    // 1) Verify sender belongs to this user and is active
    const senderResult = await new sql.Request(tx)
      .input("senderId", sql.Int, senderId)
      .input("userId", sql.Int, userId)
      .query(`
        SELECT id
        FROM Senders
        WHERE id = @senderId
          AND isActive = 1
          AND createdByUserId = @userId
      `);

    if (senderResult.recordset.length === 0) {
      await tx.rollback();
      return res.status(404).json({ message: "Sender not found" });
    }

    // 2) Verify receiver belongs to this user and is active
    const receiverResult = await new sql.Request(tx)
      .input("receiverId", sql.Int, receiverId)
      .input("userId", sql.Int, userId)
      .query(`
        SELECT id
        FROM Receivers
        WHERE id = @receiverId
          AND isActive = 1
          AND createdByUserId = @userId
      `);

    if (receiverResult.recordset.length === 0) {
      await tx.rollback();
      return res.status(404).json({ message: "Receiver not found" });
    }

    // 3) Fee + totals
    const fee = Number(calcFee(Number(amount)).toFixed(2));
    const totalAmount = Number((Number(amount) + fee).toFixed(2));

    // 4) Insert transaction
    const insertResult = await new sql.Request(tx)
      .input("createdByUserId", sql.Int, userId)
      .input("senderId", sql.Int, senderId)
      .input("receiverId", sql.Int, receiverId)
      .input("amount", sql.Decimal(18, 2), Number(amount))
      .input("fee", sql.Decimal(18, 2), fee)
      .input("totalAmount", sql.Decimal(18, 2), totalAmount)
      .input("currencyFrom", sql.NVarChar(10), (currencyFrom || "JPY").trim())
      .input("currencyTo", sql.NVarChar(10), (currencyTo || "NPR").trim())
      .input("note", sql.NVarChar(255), note ? String(note).trim() : null)
      .query(`
        INSERT INTO Transactions
          (createdByUserId, senderId, receiverId, amount, fee, totalAmount, currencyFrom, currencyTo, status, note)
        OUTPUT INSERTED.*
        VALUES
          (@createdByUserId, @senderId, @receiverId, @amount, @fee, @totalAmount, @currencyFrom, @currencyTo, 'PENDING', @note)
      `);

    const created = insertResult.recordset[0];

    await tx.commit();
    return res.status(201).json(created);
  } catch (err) {
    try { await tx.rollback(); } catch {}
    console.error("createTransaction error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function listTransactions(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const offset = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).trim() : null;

    const pool = await getPool();

    const statusFilter = status ? "AND t.status = @status" : "";

    const countResult = await pool.request()
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(20), status)
      .query(`
        SELECT COUNT(*) AS total
        FROM Transactions t
        WHERE t.isActive = 1
          AND t.createdByUserId = @userId
          ${statusFilter}
      `);

    const total = countResult.recordset[0].total;

    const dataResult = await pool.request()
  .input("userId", sql.Int, userId)
  .input("status", sql.NVarChar(20), status)
  .input("offset", sql.Int, offset)
  .input("limit", sql.Int, limit)
  .query(`
    SELECT
      t.*,
      s.fullName AS senderName,
      s.phone AS senderPhone,
      r.fullName AS receiverName,
      r.phone AS receiverPhone
    FROM Transactions t
    JOIN Senders s ON s.id = t.senderId
    JOIN Receivers r ON r.id = t.receiverId
    WHERE t.isActive = 1
      AND t.createdByUserId = @userId
      ${statusFilter}
    ORDER BY t.createdAt DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);


    return res.json({ page, limit, total, data: dataResult.recordset });
  } catch (err) {
    console.error("listTransactions error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getTransactionById(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid transaction id" });

    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("userId", sql.Int, userId)
      .query(`
        SELECT *
        FROM Transactions
        WHERE id = @id
          AND isActive = 1
          AND createdByUserId = @userId
      `);

    const txRow = result.recordset[0];
    if (!txRow) return res.status(404).json({ message: "Transaction not found" });

    return res.json(txRow);
  } catch (err) {
    console.error("getTransactionById error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateTransactionStatus(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    const { status } = req.body;

    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(20), status)
      .query(`
        UPDATE Transactions
        SET status = @status, updatedAt = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND isActive = 1 AND createdByUserId = @userId
      `);

    const updated = result.recordset[0];
    if (!updated) return res.status(404).json({ message: "Transaction not found" });

    return res.json(updated);
  } catch (err) {
    console.error("updateTransactionStatus error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

