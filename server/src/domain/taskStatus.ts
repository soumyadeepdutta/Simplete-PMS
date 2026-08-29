import { badRequest } from '../shared/errors.js';

/** Matches default board column "Done" and MCP standup heuristics. */
export function isDoneColumnTitle(title: string): boolean {
  return /done/i.test(title);
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
