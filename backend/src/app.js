import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { getPool } from "./config/db.js";
import authRoutes from "./modules/auth/auth.routes.js";


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
  return app;
}
