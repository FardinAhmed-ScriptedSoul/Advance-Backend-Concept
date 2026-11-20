import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "../middleware/ratelimit.js";

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("returns 503 when Redis is unavailable", async () => {
  const middleware = createRateLimiter({ isReady: false });
  const response = createResponse();
  let nextCalled = false;

  await middleware({ ip: "127.0.0.1" }, response, () => {
    nextCalled = true;
  });

  assert.equal(response.statusCode, 503);
  assert.equal(nextCalled, false);
});

test("increments and sets the window expiry atomically", async () => {
  const calls = [];
  const client = {
    isReady: true,
    async eval(script, options) {
      calls.push([script, options]);
      return 5;
    },
  };
  const middleware = createRateLimiter(client);
  const response = createResponse();
  let nextCalled = false;

  await middleware({ ip: "127.0.0.1" }, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /INCR/);
  assert.match(calls[0][0], /EXPIRE/);
  assert.deepEqual(calls[0][1], {
    keys: ["rate-limit:127.0.0.1"],
    arguments: ["60"],
  });
});

test("rejects requests over the configured limit", async () => {
  const client = {
    isReady: true,
    async eval() {
      return 6;
    },
  };
  const middleware = createRateLimiter(client);
  const response = createResponse();
  let nextCalled = false;

  await middleware({ ip: "127.0.0.1" }, response, () => {
    nextCalled = true;
  });

  assert.equal(response.statusCode, 429);
  assert.equal(nextCalled, false);
});
