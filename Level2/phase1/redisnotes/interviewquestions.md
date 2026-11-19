# Redis interview questions

## Fundamentals

1. **What is Redis?** A networked in-memory data-structure store used for cache, counters, coordination, streams, and queues; it is not automatically a durable database.
2. **Why is Redis fast?** In-memory data, efficient data structures, and low-overhead command execution. Network and command complexity still matter.
3. **Is Redis single-threaded?** Command execution is largely serialized, while I/O threads and background work can use other threads. Avoid saying every part of Redis is single-threaded.
4. **String vs hash?** Strings store arbitrary bytes and are convenient for serialized values/counters; hashes store field-value pairs and allow field-level updates. Choose based on access pattern and object size.
5. **How do TTLs work?** A key expires after its deadline; use TTLs to bound temporary data and cache staleness. Expiration is not a precise scheduling guarantee.
6. **`DEL` vs `UNLINK`?** `DEL` frees synchronously; `UNLINK` removes the key from the keyspace and frees memory asynchronously, which can reduce latency for large values.
7. **Why avoid `KEYS *`?** It may scan the whole keyspace in one blocking operation. Use cursor-based `SCAN` for incremental maintenance.
8. **What does `MULTI/EXEC` guarantee?** Commands execute without interleaving; it does not provide rollback like a relational transaction.
9. **When use Lua?** When read/decision/write must be atomic on the server, such as a rate limiter or consume-once OTP.

## Caching

10. **Explain cache-aside.** Read cache; on miss load source, populate with TTL, return. Writes update source then invalidate or refresh cache.
11. **How handle a cache stampede?** Coalesce same-key loads, use a short lock, stale-while-revalidate, TTL jitter, and protect the source.
12. **How prevent stale data?** Invalidate after successful source writes, use versions, and define a TTL consistent with acceptable staleness.
13. **What if Redis is down?** Depends on role. A cache can fall back with source protection; security state may fail closed; queue state needs recovery. Do not use one policy for every use.
14. **What is cache penetration?** Repeated misses for absent keys; short negative caching, input validation, and rate limits can help.

## OTP and rate limiting

15. **How store OTPs safely?** Store a verifier, not the raw code; use a short TTL, random code, attempt/resend limits, and protect the HMAC pepper.
16. **How enforce one-time OTP use?** Compare and delete atomically in Lua; separate `GET` then `DEL` permits concurrent replay.
17. **Why is a six-digit OTP weak?** It has about 20 bits of entropy; short expiry and strict online guess limits are required.
18. **Compare fixed and sliding windows.** Fixed is cheap but bursts at boundaries; sliding log is precise but stores events; token bucket allows configured bursts with a steady refill.
19. **Why must rate-limit updates be atomic?** Concurrent requests can all observe the same count and exceed the limit if the client performs separate read/update steps.
20. **How handle Redis outage for a limiter?** Fail-open risks unbounded traffic; fail-closed impacts availability. Choose based on endpoint risk and communicate with `503` or a documented fallback.

## Queues and architecture

21. **What does BullMQ provide?** Redis-backed jobs, workers, delay, retry/backoff, concurrency, and job state. It does not make arbitrary side effects exactly-once.
22. **What delivery semantics should you assume?** At-least-once; make workers idempotent because a job can be retried after a side effect.
23. **How avoid lost jobs between DB and queue?** Transactional outbox: commit business data and an outbox event together, then publish/retry from a relay.
24. **What is a stalled job?** A worker lost its lock or stopped renewing it; BullMQ can recover/reprocess it, so handlers must tolerate duplication.
25. **RDB vs AOF?** RDB snapshots are compact and fast to restore but can lose changes since the snapshot. AOF records writes and can reduce loss; it costs more disk/IO and may be rewritten.
26. **Sentinel vs Cluster?** Sentinel handles failover for a primary/replica setup; Cluster shards data across hash slots and also supports replica failover.
27. **Can Redis replication lose acknowledged writes?** Yes. Replication is asynchronous by default, so failover may promote a replica missing recent writes.
28. **How does Cluster route keys?** Keys map to one of 16,384 slots. Multi-key operations need the same slot; hash tags can co-locate related keys.
29. **How choose an eviction policy?** Match data role: LRU/LFU for rebuildable cache; `noeviction` where unexpected queue/data eviction is unacceptable, with capacity alerts and write-failure handling.
30. **What metrics matter?** p95/p99 latency, memory/evictions, hit ratio, rejected commands, replication lag, connections, slow commands, and queue age/failures.

## Scenario prompts

- **A hot key causes latency:** identify it with metrics; coalesce loads, use local caching or replicas where safe, and consider sharding. Do not immediately increase TTL without checking staleness.
- **Redis memory is full:** inspect key cardinality and value sizes, TTL/eviction settings, replication and persistence headroom; do not blindly flush data.
- **Workers send duplicate emails:** use provider idempotency keys or a durable processed marker; assume at-least-once delivery.
- **Login OTP guessing increases:** atomically increment attempts with expiry, limit by account and IP, add resend cooldown, return generic errors, and alert on abuse.
- **A cluster Lua script fails with CROSSSLOT:** place all script keys in the same slot using a shared hash tag or redesign to avoid a cross-slot atomic operation.
