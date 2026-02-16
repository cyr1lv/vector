const VECTORS_INACTIVE_ERROR =
  "Vectors are inactive and must not influence system behavior until explicitly activated. " +
  "Activation requires explicit decision, documented scope, and VECTORS_ACTIVE=true.";

export function isVectorsActive(): boolean {
  return process.env.VECTORS_ACTIVE === "true";
}

export function requireVectorsActive(): void {
  if (!isVectorsActive()) {
    throw new Error(VECTORS_INACTIVE_ERROR);
  }
}
