-- Manual validation (run with psql after applying migrations). DO NOT auto-deploy.
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/vector_pgvector_validate.sql
--
-- z = single-row 1536-dim zero vector for repeatable plans

SELECT '=== EXPLAIN ANALYZE (default) LIMIT 10 ===' AS section;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ve.id
FROM public.vector_embeddings ve
CROSS JOIN (
  SELECT ('[' || string_agg('0', ',' ORDER BY n) || ']')::vector(1536) AS v
  FROM generate_series(1, 1536) n
) z
ORDER BY ve.embedding <=> z.v
LIMIT 10;

SELECT '=== EXPLAIN (seqscan off → index if present) ===' AS section;
SET enable_seqscan = off;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ve.id
FROM public.vector_embeddings ve
CROSS JOIN (
  SELECT ('[' || string_agg('0', ',' ORDER BY n) || ']')::vector(1536) AS v
  FROM generate_series(1, 1536) n
) z
ORDER BY ve.embedding <=> z.v
LIMIT 10;
RESET enable_seqscan;

-- Recall: exact vs approximate (same planner knobs)
SELECT '=== Recall exact top-5 ===' AS section;
BEGIN;
SET LOCAL enable_indexscan = off;
SET LOCAL enable_bitmapscan = off;
CREATE TEMP TABLE _exact5 AS
SELECT ve.id
FROM public.vector_embeddings ve
CROSS JOIN (
  SELECT ('[' || string_agg('0', ',' ORDER BY n) || ']')::vector(1536) AS v
  FROM generate_series(1, 1536) n
) z
ORDER BY ve.embedding <=> z.v
LIMIT 5;
COMMIT;

SELECT '=== Recall IVFFLAT top-5 (seqscan off) ===' AS section;
SET enable_seqscan = off;
CREATE TEMP TABLE _idx5 AS
SELECT ve.id
FROM public.vector_embeddings ve
CROSS JOIN (
  SELECT ('[' || string_agg('0', ',' ORDER BY n) || ']')::vector(1536) AS v
  FROM generate_series(1, 1536) n
) z
ORDER BY ve.embedding <=> z.v
LIMIT 5;
RESET enable_seqscan;

SELECT '=== Overlap (target ≥80%) ===' AS section;
SELECT
  COUNT(*) FILTER (WHERE e.id = i.id) AS overlap_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE e.id = i.id) / GREATEST((SELECT COUNT(*) FROM _exact5), 1), 1) AS overlap_pct
FROM _exact5 e
FULL OUTER JOIN _idx5 i ON e.id = i.id;

DROP TABLE _exact5;
DROP TABLE _idx5;

SELECT '=== Benchmark 1 ===' AS section;
EXPLAIN (ANALYZE, FORMAT TEXT)
SELECT ve.id FROM public.vector_embeddings ve
CROSS JOIN (
  SELECT ('[' || string_agg('0', ',' ORDER BY n) || ']')::vector(1536) AS v
  FROM generate_series(1, 1536) n
) z
ORDER BY ve.embedding <=> z.v LIMIT 10;
SELECT '=== Benchmark 2 ===' AS section;
EXPLAIN (ANALYZE, FORMAT TEXT)
SELECT ve.id FROM public.vector_embeddings ve
CROSS JOIN (
  SELECT ('[' || string_agg('0', ',' ORDER BY n) || ']')::vector(1536) AS v
  FROM generate_series(1, 1536) n
) z
ORDER BY ve.embedding <=> z.v LIMIT 10;
SELECT '=== Benchmark 3 ===' AS section;
EXPLAIN (ANALYZE, FORMAT TEXT)
SELECT ve.id FROM public.vector_embeddings ve
CROSS JOIN (
  SELECT ('[' || string_agg('0', ',' ORDER BY n) || ']')::vector(1536) AS v
  FROM generate_series(1, 1536) n
) z
ORDER BY ve.embedding <=> z.v LIMIT 10;
