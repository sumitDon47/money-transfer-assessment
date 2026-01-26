import express from "express";
import { requestOtp, verifyOtp } from "./auth.controller.js";
import {
  otpRequestRedisLimiter,
  otpVerifyRedisLimiter,
} from "../../middleware/redisOtpLimit.js";

const router = express.Router();

router.post("/request-otp", otpRequestRedisLimiter, requestOtp);
router.post("/verify-otp", otpVerifyRedisLimiter, verifyOtp);

export default router;

