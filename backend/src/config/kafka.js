import { Kafka } from "kafkajs";

export const TOPIC_TRANSACTIONS_CREATED = "transactions.created";

export const kafka = new Kafka({
  clientId: "money-transfer-backend",
  brokers: [process.env.KAFKA_BROKER || "127.0.0.1:9092"],
});
