import "dotenv/config";
import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URI || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 1000, 30000),
  },
});

redis.on("error", (error) => {
  console.error("Redis client error:", error.code || error.message || error);
});
