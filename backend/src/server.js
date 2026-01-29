import dotenv from "dotenv";
import "dotenv/config";

dotenv.config({ path: new URL("../.env", import.meta.url) }); // <-- loads backend/.env

import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();


app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

