import sql from "mssql";
import { env } from "./env.js";

const config = {
  server: env.db.server,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  options: {
    encrypt: env.db.encrypt,
    trustServerCertificate: true,
  },
};

let pool;

export async function getPool() {
  if (pool) return pool;
  pool = await sql.connect(config);
  return pool;
}
