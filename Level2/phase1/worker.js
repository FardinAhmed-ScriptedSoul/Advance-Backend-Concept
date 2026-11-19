import "dotenv/config";
import { Worker } from "bullmq";
import Redis from "ioredis";
import sendEmail from "./lib/sendmail.js";

const connection = new Redis(process.env.REDIS_URI || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  retryStrategy: (retries) => Math.min(retries * 1000, 30000),
});
const worker = new Worker(
  "emailQueue",
  async (job) => {
    const email = job.data.email;
    if (typeof email !== "string" || !email) {
      throw new Error("Email job is missing a valid email address");
    }

    await sendEmail(email);
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed.`);
});
worker.on("failed", (job, error) => {
  console.error(`Email job ${job?.id ?? "unknown"} failed:`, error.message);
});
worker.on("error", (error) => {
  console.error("Email worker error:", error.code || error.message || error);
});
