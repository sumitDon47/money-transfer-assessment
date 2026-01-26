import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import {
  createTransaction,
  listTransactions,
  getTransactionById,
  updateTransactionStatus,
} from "./transactions.controller.js";

import {
  createTransactionSchema,
  idParamSchema,
  listSchema,
  updateStatusSchema,
} from "./transactions.schema.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", validate(createTransactionSchema), createTransaction);
router.get("/", validate(listSchema), listTransactions);
router.get("/:id", validate(idParamSchema), getTransactionById);
router.patch("/:id/status", validate(updateStatusSchema), updateTransactionStatus);

export default router;
