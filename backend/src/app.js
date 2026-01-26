import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { getPool } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./modules/auth/auth.routes.js";

import sendersRoutes from "./modules/senders/senders.routes.js";
import receiversRoutes from "./modules/receivers/receivers.routes.js";


export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.get("/db-test", async (req, res) => {
    try {
      const pool = await getPool();
      const result = await pool.request().query("SELECT GETDATE() AS now");
      res.json({ db: "ok", now: result.recordset[0].now });
    } catch (err) {
      res.status(500).json({ db: "error", message: err.message });
    }
  });

  app.use("/auth", authRoutes);
  app.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
  });

  app.use("/senders", sendersRoutes);
  app.use("/receivers", receiversRoutes);

  // Global error handler (last middleware)
  app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Internal server error" });
  });



  return app;
}
