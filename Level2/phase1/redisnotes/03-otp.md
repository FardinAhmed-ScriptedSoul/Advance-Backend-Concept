# 3. OTPs and temporary data

Redis TTLs make it useful for short-lived challenges, but an OTP flow still needs cryptographic randomness, abuse controls, and atomic one-time consumption.

## Issuing a code

1. Generate with a cryptographically secure RNG, never `Math.random()`.
2. Bind the challenge to a user/contact, purpose, and opaque challenge ID.
3. Store a verifier (prefer a keyed HMAC with a server-side secret) with a short TTL; do not log the code.
4. Send it through a trusted delivery provider. Return a generic response to avoid account enumeration.
5. Limit resend frequency and total attempts per account, IP, and challenge.

Six decimal digits have only about 20 bits of entropy. Short TTLs and strict online attempt limits are essential. A salted hash alone is weak against offline guessing because the code space is small; use a server-held pepper/HMAC and protect the pepper.

Example key layout:

```text
otp:{challenge-id}:verifier   -> HMAC(server-secret, challenge-id || code), TTL 5m
otp:{challenge-id}:attempts   -> integer, TTL 5m
otp-send:{account-hash}       -> resend counter/window
```

Do not put the raw phone number, email, code, or password in key names. A Redis key is not a secret store.

## Verify exactly once

Reading, comparing, and deleting in separate round trips permits two concurrent requests to both succeed. Compare and consume atomically with a Lua script:

```lua
local stored = redis.call("GET", KEYS[1])
if not stored then return 0 end
if stored ~= ARGV[1] then return -1 end
redis.call("DEL", KEYS[1])
return 1
```

Call with the expected HMAC as `ARGV[1]`; increment and expire an attempt counter atomically on failure. Lock the challenge or expire it after a small maximum number of attempts. Ensure the script's keys share a hash slot when using Redis Cluster (use a common `{challenge-id}` hash tag).

```mermaid
sequenceDiagram
  participant U as User
  participant API
  participant R as Redis
  U->>API: request OTP
  API->>R: store verifier + TTL; set resend limit
  API-->>U: generic accepted response
  U->>API: submit challenge ID + code
  API->>R: atomic compare / consume
  alt valid and unused
    R-->>API: success
    API-->>U: continue verification
  else expired, wrong, or already used
    R-->>API: failure
    API-->>U: generic invalid/expired response
  end
```

## Security checklist

- Use TLS to Redis, ACLs, network isolation, and secret management.
- Enforce expiry, resend cooldown, account/IP limits, and a maximum number of guesses.
- Return indistinguishable responses for unknown accounts and wrong codes.
- Avoid OTPs in logs, analytics, URLs, and error messages.
- Consume once; make downstream verification idempotent.
- Treat Redis loss as a flow failure or explicitly design a durable fallback; do not silently accept a code.
