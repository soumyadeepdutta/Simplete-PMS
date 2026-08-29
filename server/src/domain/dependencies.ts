import { cols } from '../db/client.js';
import { badRequest } from '../shared/errors.js';

/**
 * Validate blockedBy ids: same project, no self-reference, acyclic.
 * Returns the normalized unique list.
 */
export async function assertValidBlockedBy(
  projectId: string,
  taskId: string | undefined,
  blockedBy: string[]
): Promise<string[]> {
  const unique = [...new Set(blockedBy.filter(Boolean))];
  if (unique.length === 0) return [];

  if (taskId && unique.includes(taskId)) {
    throw badRequest('A task cannot block itself');
  }

  const docs = await cols()
    .tasks.find({ projectId, _id: { $in: unique } })
    .project({ _id: 1 })
    .toArray();
  const found = new Set(docs.map((d) => d._id));
  const missing = unique.filter((id) => !found.has(id));
  if (missing.length) {
    throw badRequest(`Unknown or cross-project blocker id(s): ${missing.join(', ')}`);
  }

  const cycle = await findDependencyCycle(projectId, taskId, unique);
  if (cycle) {
    throw badRequest(`Dependency cycle: ${cycle.join(' → ')}`);
  }

  return unique;
}

async function findDependencyCycle(
  projectId: string,
  taskId: string | undefined,
  nextBlockedBy: string[]
): Promise<string[] | null> {
  const all = await cols()
    .tasks.find({ projectId })
    .project({ _id: 1, blockedBy: 1 })
    .toArray();

  const graph = new Map<string, string[]>();
  for (const t of all) {
    graph.set(t._id, t.blockedBy ?? []);
  }
  if (taskId) {
    graph.set(taskId, nextBlockedBy);
  } else {
    // Creating a new task: only check that proposed blockers do not already
    // form a cycle among themselves (they shouldn't unless data is corrupt).
    const phantom = '__new__';
    graph.set(phantom, nextBlockedBy);
    return dfsCycle(graph, phantom);
  }

  return dfsCycle(graph, taskId);
}

function dfsCycle(graph: Map<string, string[]>, start: string): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (node: string): string[] | null => {
    if (visited.has(node)) return null;
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      return [...stack.slice(idx), node];
    }
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  };

  return visit(start);
}
