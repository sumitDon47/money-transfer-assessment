import sql from "mssql";
import { kafka, TOPIC_TRANSACTIONS_CREATED } from "../config/kafka.js";
import { getPool } from "../config/db.js";

import kafkajs from "kafkajs";
import snappy from "snappy";

const { CompressionCodecs, CompressionTypes } = kafkajs;

// IMPORTANT: KafkaJS expects a FUNCTION that returns the codec
CompressionCodecs[CompressionTypes.Snappy] = () => ({
  compress: async (encoder) =>
    new Promise((resolve, reject) => {
      snappy.compress(encoder.buffer, (err, out) =>
        err ? reject(err) : resolve(out)
      );
    }),

  decompress: async (buffer) =>
    new Promise((resolve, reject) => {
      snappy.uncompress(buffer, { asBuffer: true }, (err, out) =>
        err ? reject(err) : resolve(out)
      );
    }),
});


export async function startTransactionConsumer() {
  const consumer = kafka.consumer({ groupId: "transactions-created-consumer" });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_TRANSACTIONS_CREATED, fromBeginning: false });

  console.log("✅ Consumer listening on topic:", TOPIC_TRANSACTIONS_CREATED);
  await consumer.run({
  eachMessage: async ({ message }) => {
    const payload = JSON.parse(message.value.toString());

    try {
      const pool = await getPool();

      try {
        await pool.request()
          .input("eventId", sql.UniqueIdentifier, payload.eventId)

          .input("createdByUserId", sql.Int, payload.createdByUserId)
          .input("senderId", sql.Int, payload.senderId)
          .input("receiverId", sql.Int, payload.receiverId)

          // legacy NOT NULL columns
          .input("amount", sql.Decimal(18, 2), payload.amount)
          .input("fee", sql.Decimal(18, 2), payload.fee)
          .input("totalAmount", sql.Decimal(18, 2), payload.totalAmount)
          .input("currencyFrom", sql.NVarChar(10), payload.currencyFrom || "JPY")
          .input("currencyTo", sql.NVarChar(10), payload.currencyTo || "NPR")

          // Day 6 columns
          .input("amountJPY", sql.Decimal(18, 2), payload.amountJPY)
          .input("forexRate", sql.Decimal(10, 4), payload.forexRate)
          .input("amountNPR", sql.Decimal(18, 2), payload.amountNPR)
          .input("feeNPR", sql.Decimal(18, 2), payload.feeNPR)
          .input("totalNPR", sql.Decimal(18, 2), payload.totalNPR)

          .input("status", sql.NVarChar(20), payload.status || "PENDING")
          .input("note", sql.NVarChar(255), payload.note ?? null)
          .query(`
            INSERT INTO Transactions
              (eventId, createdByUserId, senderId, receiverId,
               amount, fee, totalAmount, currencyFrom, currencyTo,
               amountJPY, forexRate, amountNPR, feeNPR, totalNPR,
               status, note)
            VALUES
              (@eventId, @createdByUserId, @senderId, @receiverId,
               @amount, @fee, @totalAmount, @currencyFrom, @currencyTo,
               @amountJPY, @forexRate, @amountNPR, @feeNPR, @totalNPR,
               @status, @note)
          `);

        console.log("✅ Inserted transaction:", payload.eventId);

      } catch (dbErr) {
        // SQL duplicate key (unique index violation)
        if (dbErr?.number === 2627 || dbErr?.number === 2601) {
          console.log("ℹ️ Duplicate event ignored:", payload.eventId);
          return;
        }
        throw dbErr;
      }

    } catch (err) {
      console.error("❌ Kafka consumer error:", err.message);
    }
  },
});
}
