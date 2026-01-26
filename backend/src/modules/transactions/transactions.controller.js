import sql from "mssql";
import { getPool } from "../../config/db.js";
import { publishTransactionCreated } from "./transactions.producer.js";
import { v4 as uuidv4 } from "uuid";


const FOREX_RATE = 0.92; // 1 JPY = 0.92 NPR

function calcFeeNPR(amountNPR) {
  if (amountNPR <= 100000) return 500;
  if (amountNPR <= 200000) return 1000;
  return 3000;
}

export async function createTransaction(req, res) {
  
  const eventId = uuidv4();
  
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { senderId, receiverId, amountJPY, note } = req.body;

  // validate amountJPY
  const jpy = Number(amountJPY);
  if (!Number.isFinite(jpy) || jpy <= 0) {
    return res.status(400).json({ message: "amountJPY must be a valid number > 0" });
  }

  try {
    const pool = await getPool();

    // 1) Verify sender belongs to user and is active
    const senderResult = await pool.request()
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
      return res.status(404).json({ message: "Sender not found" });
    }

    // 2) Verify receiver belongs to user and is active
    const receiverResult = await pool.request()
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
      return res.status(404).json({ message: "Receiver not found" });
    }

    // 3) Compute NPR + fee tiers
    const amountNPR = Number((jpy * FOREX_RATE).toFixed(2));
    const feeNPR = calcFeeNPR(amountNPR);
    const totalNPR = Number((amountNPR + feeNPR).toFixed(2));

    // 4) Produce Kafka event (consumer will insert into DB)
    await publishTransactionCreated({
      createdByUserId: userId,
      senderId,
      receiverId,

      // old required DB columns (consumer will use these)
      amount: jpy,
      fee: 0,
      totalAmount: jpy,
      currencyFrom: "JPY",
      currencyTo: "NPR",

      // Day 6 columns
      amountJPY: jpy,
      forexRate: FOREX_RATE,
      amountNPR,
      feeNPR,
      totalNPR,

      status: "PENDING",
      note: note ? String(note).trim() : null,
      createdAt: new Date().toISOString(),
    });

    // ✅ API returns queued (not inserted yet)
    return res.status(202).json({
      message: "Queued",
      status: "PENDING",
      amountJPY: jpy,
      amountNPR,
      feeNPR,
      totalNPR,
      forexRate: FOREX_RATE,
    });
  } catch (err) {
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
    const from = req.query.from ? String(req.query.from).trim() : null;
    const to = req.query.to ? String(req.query.to).trim() : null;
    const senderId = req.query.senderId ? Number(req.query.senderId) : null;
    const receiverId = req.query.receiverId ? Number(req.query.receiverId) : null;

    const pool = await getPool();

    const statusFilter = status ? "AND t.status = @status" : "";
    const dateFilter = from && to ? "AND t.createdAt >= @from AND t.createdAt < DATEADD(day, 1, @to)" : "";
    const senderFilter = senderId ? "AND t.senderId = @senderId" : "";
    const receiverFilter = receiverId ? "AND t.receiverId = @receiverId" : "";

    const filters = `
      ${statusFilter}
      ${dateFilter}
      ${senderFilter}
      ${receiverFilter}
    `;

    // Count query
    const countResult = await pool.request()
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(20), status)
      .input("from", sql.Date, from)
      .input("to", sql.Date, to)
      .input("senderId", sql.Int, senderId)
      .input("receiverId", sql.Int, receiverId)
      .query(`
        SELECT COUNT(*) AS total
        FROM Transactions t
        WHERE t.isActive = 1
          AND t.createdByUserId = @userId
          ${filters}
      `);

    const total = countResult.recordset[0].total;

    // Data query
    const dataResult = await pool.request()
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(20), status)
      .input("from", sql.Date, from)
      .input("to", sql.Date, to)
      .input("senderId", sql.Int, senderId)
      .input("receiverId", sql.Int, receiverId)
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
          ${filters}
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
