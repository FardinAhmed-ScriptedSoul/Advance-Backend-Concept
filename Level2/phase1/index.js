import "dotenv/config";
import express from "express";
import connectDB from "./lib/db.js";
import User from "./models/user.model.js";
import { redis } from "./lib/redis.js";
import rateLimiter from "./middleware/ratelimit.js";
import emailQueue from "./queue.js";

const port = process.env.PORT || 3000;
const userCacheKey = "user:all:public:v1";
const app = express();
app.use(express.json());
app.get("/health", (req, res) => {
  return res.status(200).json({
    message: "Hello World",
    success: true,
  });
});

app.post("/create", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (![name, email, password].every((value) => typeof value === "string" && value.trim())) {
    return res.status(400).json({
      success: false,
      message: "name, email, and password are required",
    });
  }

  const user = await User.create({ name, email, password });

  if (redis.isReady) {
    try {
      await redis.del(userCacheKey);
    } catch (error) {
      console.error("Redis cache invalidation failed:", error.message);
    }
  }

  let emailQueued = false;
  if (redis.isReady) {
    try {
      await emailQueue.add(
        "sendEmail",
        { email: user.email },
        {
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
      emailQueued = true;
    } catch (error) {
      console.error("Failed to enqueue welcome email:", error.message);
    }
  } else {
    console.error("Welcome email was not queued because Redis is unavailable.");
  }

  const userResponse = user.toObject();
  delete userResponse.password;

  return res.status(201).json({
    success: true,
    code: 201,
    emailQueued,
    user: userResponse,
  });
});

app.get("/users", rateLimiter, async (req, res) => {
  const users = await User.find().select("-password");
  return res.json({
    success: true,
    code: 200,
    users,
  });
});

app.get("/get-with-redis", async (req, res) => {
  if (redis.isReady) {
    try {
      const cached = await redis.get(userCacheKey);
      if (cached) {
        return res.json({
          success: true,
          code: 200,
          users: JSON.parse(cached),
        });
      }
    } catch (error) {
      console.error("Redis cache read failed:", error.message);
    }
  }

  const users = await User.find().select("-password");
  if (redis.isReady) {
    try {
      await redis.set(userCacheKey, JSON.stringify(users), { EX: 60 });
    } catch (error) {
      console.error("Redis cache write failed:", error.message);
    }
  }

  return res.json({
    success: true,
    code: 200,
    users,
  });
});

(async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }

  redis.connect().catch((error) => {
    console.error("Failed to connect to Redis:", error.code || error.message);
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})();
