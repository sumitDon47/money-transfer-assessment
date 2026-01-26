import { kafka, TOPIC_TRANSACTIONS_CREATED } from "../../config/kafka.js";

const producer = kafka.producer();
let isConnected = false;

async function ensureConnected() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
  }
}

export async function publishTransactionCreated(event) {
  await ensureConnected();
  await producer.send({
    topic: TOPIC_TRANSACTIONS_CREATED,
    messages: [
      {
        key: String(event.createdByUserId),
        value: JSON.stringify(event),
      },
    ],
  });
}
