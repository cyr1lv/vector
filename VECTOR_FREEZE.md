# Vector Pipeline Freeze & Activation Gate

Vectors are inactive and must not influence system behavior until explicitly activated.

---

## 1. Current state (MUST BE TRUE)

- Raw text and signals may be stored
- No embedding calls are executed
- No vector retrieval occurs
- No ranking or ordering uses vectors
- No learning or explainability uses vectors

---

## 2. Explicit freeze

Vectors are inactive. Until explicitly activated, the vector layer must not influence:

- matching
- ordering
- learning
- explanations

Runtime guards enforce this: `embedContext` and `findSimilarContext` throw unless activated.

---

## 3. Activation gate

Vectors may only be activated when at least one of the following is true:

- vectors influence read-paths
- vectors influence ordering/ranking
- vectors are used for learning
- vectors are referenced in explanations

Activation requires:

- explicit decision
- documented scope
- tests proving non-destructive behavior

**Activation mechanism:** Set `VECTORS_ACTIVE=true` in the environment. Without this, all vector operations throw.

---

## 4. Forbidden behavior

- No silent activation
- No partial activation
- No "just store embeddings already"

---

## 5. Acceptance criteria

- [ ] Vector usage is fully frozen
- [ ] No code path depends on vectors
- [ ] Activation requires explicit decision
