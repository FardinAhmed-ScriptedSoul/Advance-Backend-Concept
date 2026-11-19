import "dotenv/config";
import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URI || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  retryStrategy: (retries) => Math.min(retries * 1000, 30000),
});
const emailQueue = new Queue("emailQueue", { connection });

emailQueue.on("error", (error) => {
  console.error("Email queue error:", error.code || error.message || error);
});

export default emailQueue;