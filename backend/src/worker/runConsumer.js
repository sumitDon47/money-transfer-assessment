import dotenv from "dotenv";
dotenv.config({ path: new URL("../../.env", import.meta.url) });

import { startTransactionConsumer } from "./transactions.consumer.js";

startTransactionConsumer().catch((err) => {
  console.error("Consumer crashed:", err);
  process.exit(1);
});
