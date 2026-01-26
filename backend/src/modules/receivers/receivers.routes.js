import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createReceiver,
  listReceivers,
  getReceiverById,
  updateReceiver,
  deleteReceiver,
} from "./receivers.controller.js";

import {
  createReceiverSchema,
  updateReceiverSchema,
  idParamSchema,
  listSchema,
} from "./receivers.schema.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", validate(createReceiverSchema), createReceiver);
router.get("/", validate(listSchema), listReceivers);
router.get("/:id", validate(idParamSchema), getReceiverById);
router.put("/:id", validate(updateReceiverSchema), updateReceiver);
router.delete("/:id", validate(idParamSchema), deleteReceiver);

export default router;
