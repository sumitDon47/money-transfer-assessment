import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { getPool } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./modules/auth/auth.routes.js";

import sendersRoutes from "./modules/senders/senders.routes.js";
import receiversRoutes from "./modules/receivers/receivers.routes.js";
import transactionsRoutes from "./modules/transactions/transactions.routes.js";

export function createApp() {
  const app = express();

  const corsOptions = {
    origin: (origin, cb) => {
      // allow curl/postman (no Origin header)
      if (!origin) return cb(null, true);

      // allow localhost on any port (vite dev server changes ports)
      const ok = /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
      return cb(null, ok);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  };

  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
  app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));

  // ✅ preflight handler (IMPORTANT)
  app.options(/.*/, cors(corsOptions));

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
  app.use("/transactions", transactionsRoutes);

  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    return res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
