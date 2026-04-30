/** MCP host passes `z.literal(true)` flags; throws if missing. */

export function requireLiteralConfirm(value: unknown, message: string): asserts value is true {
  if (value !== true) {
    throw new Error(message);
  }
}

/** Semantic / rerank search cost gate (MCP + CLI). */
export function requireHighCostSearchConfirm(confirmHighCost: true | undefined, semantic: boolean | undefined, rerank: boolean | undefined): void {
  if ((semantic === true || rerank === true) && confirmHighCost !== true) {
    throw new Error("Semantic/rerank search can cost up to 250 credits. Set confirmHighCost=true or pass --yes-cost.");
  }
}
