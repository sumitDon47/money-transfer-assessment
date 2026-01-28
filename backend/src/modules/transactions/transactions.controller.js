import sql from "mssql";
import { getPool } from "../../config/db.js";
import { publishTransactionCreated } from "./transactions.producer.js";
import { v4 as uuidv4 } from "uuid";


const FOREX_RATE = 0.92; // 1 JPY = 0.92 NPR
const eventId = uuidv4();


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
      eventId,
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
      eventId
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
    const senderId = req.query.senderId ? Number(req.query.senderId) : null;
    const receiverId = req.query.receiverId ? Number(req.query.receiverId) : null;
    const q = req.query.q ? String(req.query.q).trim() : null;

    // Dates: support "YYYY-MM-DD" or ISO
    const fromRaw = req.query.from ? String(req.query.from).trim() : null;
    const toRaw = req.query.to ? String(req.query.to).trim() : null;

    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;

    if (from && Number.isNaN(from.getTime())) {
      return res.status(400).json({ message: "Invalid 'from' date" });
    }
    if (to && Number.isNaN(to.getTime())) {
      return res.status(400).json({ message: "Invalid 'to' date" });
    }

    // Make "to" inclusive through end-of-day if user passed date-only (or any date)
    // We do: createdAt < (to + 1 day)
    const toExclusive = to ? new Date(to) : null;
    if (toExclusive) {
      toExclusive.setDate(toExclusive.getDate() + 1);
    }

    const pool = await getPool();

    // Build WHERE safely
    const where = [];
    where.push("t.isActive = 1");
    where.push("t.createdByUserId = @userId");

    if (status) where.push("t.status = @status");
    if (Number.isFinite(senderId) && senderId > 0) where.push("t.senderId = @senderId");
    if (Number.isFinite(receiverId) && receiverId > 0) where.push("t.receiverId = @receiverId");

    if (from) where.push("t.createdAt >= @from");
    if (toExclusive) where.push("t.createdAt < @toExclusive");

    if (q) {
      where.push(
        "(s.fullName LIKE @q OR s.phone LIKE @q OR r.fullName LIKE @q OR r.phone LIKE @q)"
      );
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // Count
    const countReq = pool.request()
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(20), status)
      .input("senderId", sql.Int, Number.isFinite(senderId) ? senderId : null)
      .input("receiverId", sql.Int, Number.isFinite(receiverId) ? receiverId : null)
      .input("from", sql.DateTime2, from)
      .input("toExclusive", sql.DateTime2, toExclusive)
      .input("q", sql.NVarChar(120), q ? `%${q}%` : null);

    const countResult = await countReq.query(`
      SELECT COUNT(*) AS total
      FROM Transactions t
      JOIN Senders s ON s.id = t.senderId
      JOIN Receivers r ON r.id = t.receiverId
      ${whereSql}
    `);

    const total = countResult.recordset[0]?.total ?? 0;

    // Data
    const dataReq = pool.request()
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(20), status)
      .input("senderId", sql.Int, Number.isFinite(senderId) ? senderId : null)
      .input("receiverId", sql.Int, Number.isFinite(receiverId) ? receiverId : null)
      .input("from", sql.DateTime2, from)
      .input("toExclusive", sql.DateTime2, toExclusive)
      .input("q", sql.NVarChar(120), q ? `%${q}%` : null)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit);

    const dataResult = await dataReq.query(`
      SELECT
        t.*,
        s.fullName AS senderName,
        s.phone AS senderPhone,
        r.fullName AS receiverName,
        r.phone AS receiverPhone
      FROM Transactions t
      JOIN Senders s ON s.id = t.senderId
      JOIN Receivers r ON r.id = t.receiverId
      ${whereSql}
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
