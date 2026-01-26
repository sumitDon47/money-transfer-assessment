import sql from "mssql";
import { kafka, TOPIC_TRANSACTIONS_CREATED } from "../config/kafka.js";
import { getPool } from "../config/db.js";

export async function startTransactionConsumer() {
  const consumer = kafka.consumer({ groupId: "transactions-created-consumer" });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_TRANSACTIONS_CREATED, fromBeginning: false });

  console.log("✅ Consumer listening on topic:", TOPIC_TRANSACTIONS_CREATED);

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        const pool = await getPool();

        await pool.request()
          .input("createdByUserId", sql.Int, payload.createdByUserId)
          .input("senderId", sql.Int, payload.senderId)
          .input("receiverId", sql.Int, payload.receiverId)

          // legacy NOT NULL columns
          .input("amount", sql.Decimal(18, 2), payload.amount)
          .input("fee", sql.Decimal(18, 2), payload.fee)
          .input("totalAmount", sql.Decimal(18, 2), payload.totalAmount)
          .input("currencyFrom", sql.NVarChar(10), payload.currencyFrom || "JPY")
          .input("currencyTo", sql.NVarChar(10), payload.currencyTo || "NPR")

          // new Day 6 columns
          .input("amountJPY", sql.Decimal(18, 2), payload.amountJPY)
          .input("forexRate", sql.Decimal(10, 4), payload.forexRate)
          .input("amountNPR", sql.Decimal(18, 2), payload.amountNPR)
          .input("feeNPR", sql.Decimal(18, 2), payload.feeNPR)
          .input("totalNPR", sql.Decimal(18, 2), payload.totalNPR)

          .input("status", sql.NVarChar(20), payload.status || "PENDING")
          .input("note", sql.NVarChar(255), payload.note ?? null)
          .query(`
            INSERT INTO Transactions
              (createdByUserId, senderId, receiverId,
               amount, fee, totalAmount, currencyFrom, currencyTo,
               amountJPY, forexRate, amountNPR, feeNPR, totalNPR,
               status, note)
            VALUES
              (@createdByUserId, @senderId, @receiverId,
               @amount, @fee, @totalAmount, @currencyFrom, @currencyTo,
               @amountJPY, @forexRate, @amountNPR, @feeNPR, @totalNPR,
               @status, @note)
          `);

        console.log("✅ Inserted transaction from Kafka:", payload.senderId);
      } catch (err) {
        console.error("❌ Kafka consumer error:", err.message);
      }
    },
  });
}
