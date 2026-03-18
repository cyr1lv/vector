# pgvector mid-scale tuning (30k–100k rows)

> Vector performance depends on planner statistics, not only index presence.

**Do not deploy automatically.** Apply migration `20260315210000_vector_ivfflat_midscale_tune.sql` when ready.

## FIRST RUN AFTER BACKFILL (REQUIRED)

After loading ≥10k rows:

1. Run:

   ```sql
   ANALYZE public.vector_embeddings;
   ```

2. Execute:

   ```bash
   psql "$DATABASE_URL" -f scripts/vector_pgvector_validate.sql
   ```

3. Confirm:

   - Index Scan is used
   - Latency and recall within targets

**NOTE:** Without `ANALYZE`, Postgres may ignore the index.

## IMPORTANT: INDEX USAGE VS EXISTENCE

Index presence ≠ index usage.

Postgres query planner decides based on table statistics.

Even with a correct index:

- Planner may choose Seq Scan
- Especially after bulk inserts

**Fix:** Always run `ANALYZE` after backfill.

## EXPECTED BEHAVIOR BY SCALE

| Rows | Expected Behavior |
|------|-------------------|
| 0–1k | Seq Scan likely |
| 1k–10k | Mixed |
| 10k–30k | Index starts activating |
| 30k–100k | Index dominant |
| 100k+ | Requires tuning |

## FAILURE PLAYBOOK

If Index Scan not used:

1. Run:

   ```sql
   ANALYZE public.vector_embeddings;
   ```

2. Re-run `EXPLAIN ANALYZE`

3. If still Seq Scan:

   - Temporarily test:

     ```sql
     SET enable_seqscan = off;
     ```

4. If index works only when forced:

   → statistics issue (not index issue)

## 1. Explain plan (sample run)

**Environment note:** Plans below used `DATABASE_URL` with **0 rows** in `public.vector_embeddings`. With data, re-run validation.

| Phase | Planner choice | Notes |
|-------|----------------|--------|
| **Before** (tiny/empty) | **Seq Scan** | Cheaper than index when few/no rows |
| **After** `enable_seqscan = off` (0 rows) | Still **Seq Scan** (cost inflated) | At **30k+** rows expect **Index Scan** on `vector_embeddings_embedding_idx` |

**Actual plan (default, LIMIT 10, zero query vector):**

```
Limit → Sort → Nested Loop → Seq Scan on vector_embeddings
Planning Time: ~0.6 ms
Execution Time: ~0.2 ms
```

Re-run after loading data:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM public.vector_embeddings ve
CROSS JOIN (
  SELECT ('[' || string_agg('0', ',' ORDER BY n) || ']')::vector(1536) AS v
  FROM generate_series(1, 1536) n
) z
ORDER BY ve.embedding <=> z.v
LIMIT 10;
```

## 2. Index config (after migration)

```sql
DROP INDEX IF EXISTS public.vector_embeddings_embedding_idx;

CREATE INDEX vector_embeddings_embedding_idx
ON public.vector_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 200);

ANALYZE public.vector_embeddings;
```

## 3. `ivfflat.probes` (per-query, inside RPC)

| `match_limit` | `SET LOCAL ivfflat.probes` |
|---------------|----------------------------|
| ≤ 5           | 30                         |
| ≤ 20          | 20                         |
| > 20          | 10                         |

Implemented in `match_vector_embeddings` only (not global `SET`).

## 4. Average query latency

**Not measured** on this run (table empty). Target: **&lt; 50 ms** execution at ~30k rows.

Run 3× and average **Execution Time** and **Planning Time** from `EXPLAIN ANALYZE`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/vector_pgvector_validate.sql
```

## 5. Recall (top-5 overlap: exact vs IVFFLAT)

Script `scripts/vector_pgvector_validate.sql` compares:

- **A)** `enable_indexscan = off` + `enable_bitmapscan = off` (exact-style scan)
- **B)** `enable_seqscan = off` (force index path)

**Expect ≥ 80% overlap** (4/5 ids) once the table has enough rows for the planner to use IVFFLAT meaningfully.

With **0 rows**, overlap is not meaningful—re-run after backfill.

## 6. Recommendation status

| Scale | Status |
|-------|--------|
| **30k** | **OK** after migration + `ANALYZE`; validate latency & recall on your data |
| **100k** | **OK** with same config; monitor latency—may need more probes |
| **> 100k** | **Needs tuning** eventually—see comments in migration only: *consider `lists = 400`, `probes = 30`* (not implemented) |

## 7. RPC / schema constraints

- No schema change, no RPC signature change, embedding stays **1536**.

## GO / NO-GO CHECK (after backfill)

System is **READY** if:

- `EXPLAIN ANALYZE` shows:
  → **Index Scan** using `vector_embeddings_embedding_idx`

- Average latency (3 runs):
  → **&lt; 50 ms**

- Recall overlap (top-5):
  → **≥ 80%**

If **ANY** fail:

- Run `ANALYZE public.vector_embeddings;`
- Re-run validation script
- **Do NOT** proceed to production until passing
