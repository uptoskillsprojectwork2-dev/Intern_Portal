import rateLimit from "express-rate-limit";

const createRateLimiter = ({ windowMs, max, message, keyGenerator }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    keyGenerator: keyGenerator || ((req) => req.ip || req.socket?.remoteAddress || "unknown"),
    handler: (req, res, next, options) => {
      const resetTime = req.rateLimit?.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(options.windowMs / 1000);

      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        message: options.message || "Too many requests. Please try again later."
      });
    },
    message
  });
};

// 1. Login: 5 attempts per 15 minutes per IP and email
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again after 15 minutes.",
  keyGenerator: (req) => {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : "";
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    return `${ip}:${email}`;
  }
});

// 2. Forgot password: 3 per hour per IP and email
export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many password reset requests. Please try again after an hour.",
  keyGenerator: (req) => {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : "";
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    return `${ip}:${email}`;
  }
});

// 3. Reset password & set password: 5 per 15 minutes
export const resetPasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please try again after 15 minutes."
});
