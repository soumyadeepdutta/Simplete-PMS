/** Fractional indexing helpers for concurrent-safe task ordering. */

const GAP = 1;
const MIN_GAP = 1e-9;

export function orderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return GAP;
  if (before === null) return (after as number) - GAP;
  if (after === null) return before + GAP;
  return (before + after) / 2;
}

export function needsReindex(before: number | null, after: number | null, next: number): boolean {
  if (before !== null && Math.abs(next - before) < MIN_GAP) return true;
  if (after !== null && Math.abs(after - next) < MIN_GAP) return true;
  return false;
}

export function reindexOrders(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * GAP);
}
