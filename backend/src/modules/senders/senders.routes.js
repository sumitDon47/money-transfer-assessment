import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createSender,
  listSenders,
  getSenderById,
  updateSender,
  deleteSender,
} from "./senders.controller.js";

import {
  createSenderSchema,
  updateSenderSchema,
  idParamSchema,
  listSchema,
} from "./senders.schema.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", validate(createSenderSchema), createSender);
router.get("/", validate(listSchema), listSenders);
router.get("/:id", validate(idParamSchema), getSenderById);
router.put("/:id", validate(updateSenderSchema), updateSender);
router.delete("/:id", validate(idParamSchema), deleteSender);

export default router;
