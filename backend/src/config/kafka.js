import kafkajs from "kafkajs";
import snappyImport from "kafkajs-snappy";

const { Kafka, CompressionCodecs, CompressionTypes } = kafkajs;

export const TOPIC_TRANSACTIONS_CREATED = "transactions.created";

export const KAFKA_BROKERS = (process.env.KAFKA_BROKER || "127.0.0.1:9092")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ✅ kafkajs-snappy can come as default or module itself depending on version
const snappyCodec = snappyImport?.default ?? snappyImport;

// ✅ Register Snappy so consumer can read snappy-compressed messages
CompressionCodecs[CompressionTypes.Snappy] = snappyCodec;

export const kafka = new Kafka({
  clientId: "money-transfer-backend",
  brokers: KAFKA_BROKERS,
});
