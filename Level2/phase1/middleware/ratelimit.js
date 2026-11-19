import { redis } from "../lib/redis.js";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 5;
const INCREMENT_FIXED_WINDOW = `
  local count = redis.call("INCR", KEYS[1])
  if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end
  return count
`;

export const createRateLimiter = (
  client,
  { windowSeconds = WINDOW_SECONDS, maxRequests = MAX_REQUESTS } = {},
) => async (req, res, next) => {
  if (!client.isReady) {
    return res.status(503).json({
      success: false,
      message: "Rate limiting is temporarily unavailable",
    });
  }

  const key = `rate-limit:${req.ip}`;
  const requests = await client.eval(INCREMENT_FIXED_WINDOW, {
    keys: [key],
    arguments: [String(windowSeconds)],
  });

  if (Number(requests) > maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  }

  return next();
};

export default createRateLimiter(redis);