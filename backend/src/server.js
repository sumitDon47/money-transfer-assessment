import dotenv from "dotenv";
dotenv.config(); // <-- loads backend/.env

import { transporter } from "./config/mailer.js";
transporter.verify()
  .then(() => console.log("✅ Mailer ready"))
  .catch((e) => console.log("❌ Mailer verify failed:", e.message));


import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

