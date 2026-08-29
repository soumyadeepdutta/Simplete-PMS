import { badRequest } from '../shared/errors.js';

/** Matches default board column "Done" and MCP standup heuristics. */
export function isDoneColumnTitle(title: string): boolean {
  return /done/i.test(title);
}

/** Matches default board column "In Progress" and MCP standup heuristics. */
export function isInProgressColumnTitle(title: string): boolean {
  return /progress/i.test(title);
}

/**
 * When moving/creating into an In Progress column, require at least one assignee.
 */
export function assertAssigneeAllowsInProgress(assigneeIds: string[]): void {
  if (!assigneeIds || assigneeIds.length === 0) {
    throw badRequest('Cannot move to In Progress: task must have at least one assigned member');
  }
}

/**
 * When moving/creating into a Done column, block if any deliverables exist and are incomplete.
 * Tasks with no deliverables are allowed.
 */
export function assertDeliverablesAllowDone(subtasks: { completed: boolean }[]): void {
  const incomplete = subtasks.filter((s) => !s.completed).length;
  if (subtasks.length > 0 && incomplete > 0) {
    throw badRequest(`Cannot move to Done: ${incomplete} deliverable(s) still incomplete`);
  }
}

/**
 * Block moving into a Done column while any blocker sits outside a Done column.
 */
export function assertBlockersAllowDone(blockers: { id: string; title: string; done: boolean }[]): void {
  const unfinished = blockers.filter((b) => !b.done);
  if (unfinished.length) {
    const names = unfinished.map((b) => `"${b.title}"`).join(', ');
    throw badRequest(`Cannot move to Done: blocked by ${names}`);
  }
}
