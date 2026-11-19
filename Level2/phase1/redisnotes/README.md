# Redis notes: beginner to system design

Use this as a short learning path:

1. [Redis fundamentals](./01-fundamentals.md) — data model, commands, memory, persistence, and HA.
2. [Caching](./02-caching.md) — cache-aside, invalidation, stampedes, and consistency.
3. [OTP and temporary data](./03-otp.md) — secure generation, expiry, and one-time verification.
4. [Rate limiting](./04-rate-limiting.md) — algorithms and atomic Redis implementations.
5. [Queues with BullMQ](./05-queues-bullmq.md) — producers, workers, retries, and operations.
6. [System design](./06-system-design.md) — choosing Redis topology and designing for failure.
7. [Interview questions](./interviewquestions.md) — concise answers and trade-offs.

Examples assume Redis 6+ and Node.js. BullMQ uses `ioredis`; the app examples use the `redis` Node client. Never put real credentials in examples or commit a populated `.env`.

To run the sample app, copy `../.env.example` to `../.env`, start MongoDB and Redis, then run `npm install` and `npm run dev` from `Level2/phase1`.
