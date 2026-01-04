import rateLimit from "express-rate-limit";

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

export const loginRateLimit = rateLimit({
  windowMs: 10 * 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
