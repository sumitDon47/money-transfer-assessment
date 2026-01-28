import kafkajs from "kafkajs";
import snappy from "snappy";
import { kafka, TOPIC_TRANSACTIONS_CREATED } from "../../config/kafka.js";

const { CompressionCodecs, CompressionTypes } = kafkajs;

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
