/** Matches default board column "Done" and server/MCP heuristics. */
export function isDoneColumnTitle(title: string): boolean {
  return /done/i.test(title);
}

/** Count incomplete deliverables (subtasks). Empty list is allowed for Done. */
export function incompleteDeliverableCount(
  subtasks: { completed: boolean }[] | undefined
): number {
  if (!subtasks?.length) return 0;
  return subtasks.filter((s) => !s.completed).length;
}

export function deliverablesBlockDoneMessage(incomplete: number): string {
  return `Cannot move to Done: ${incomplete} deliverable(s) still incomplete`;
}
