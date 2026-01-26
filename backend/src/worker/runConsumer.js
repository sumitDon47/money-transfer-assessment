import "dotenv/config";
import { startTransactionConsumer } from "./transactions.consumer.js";

startTransactionConsumer().catch((e) => {
  console.error("❌ Consumer crashed:", e);
  process.exit(1);
});
