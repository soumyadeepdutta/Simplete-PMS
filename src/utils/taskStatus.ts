/** Matches default board column "Done" and server/MCP heuristics. */
export function isDoneColumnTitle(title: string): boolean {
  return /done/i.test(title);
}

/** Matches default board column "In Progress" and server/MCP heuristics. */
export function isInProgressColumnTitle(title: string): boolean {
  return /progress/i.test(title);
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

export function assigneeRequiredForInProgressMessage(): string {
  return 'Cannot move to In Progress: task must have at least one assigned member';
}
