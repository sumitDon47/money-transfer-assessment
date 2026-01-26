import { redis } from "../config/redis.js";

// helper function to count requests
async function hit(key, limit, windowSec) {
  const count = await redis.incr(key);

  // if first hit, set expiry
  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  return count <= limit;
}

// Limit OTP REQUEST (email submit)
export async function otpRequestRedisLimiter(req, res, next) {
  try {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const email = String(req.body?.email || "").trim().toLowerCase();

    // limits
    const ipLimit = await hit(`otp:req:ip:${ip}`, 5, 600);       // 5 per 10 min
    const emailLimit = email
      ? await hit(`otp:req:email:${email}`, 3, 600)              // 3 per 10 min
      : true;

    if (!ipLimit || !emailLimit) {
      return res
        .status(429)
        .json({ message: "Too many OTP requests. Try again later." });
    }

    next();
  } catch (err) {
    console.error("Redis limiter error:", err);
    // If Redis fails, don't block user completely
    next();
  }
}

// Limit OTP VERIFY (OTP guessing protection)
export async function otpVerifyRedisLimiter(req, res, next) {
  try {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const email = String(req.body?.email || "").trim().toLowerCase();

    const ipLimit = await hit(`otp:verify:ip:${ip}`, 10, 600);     // 10 tries
    const emailLimit = email
      ? await hit(`otp:verify:email:${email}`, 6, 600)             // 6 tries
      : true;

    if (!ipLimit || !emailLimit) {
      return res
        .status(429)
        .json({ message: "Too many OTP attempts. Try again later." });
    }

    next();
  } catch (err) {
    console.error("Redis verify limiter error:", err);
    next();
  }
}
