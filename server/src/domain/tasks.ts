import { cols } from '../db/client.js';
import type { ActivityDoc, TaskDoc } from '../db/types.js';
import type { AuthContext } from '../auth/rbac.js';
import { can, requirePerm } from '../auth/rbac.js';
import { writeAudit } from './audit.js';
import { getProjectDoc } from './projects.js';
import { hydrateTask, loadUsersByIds } from './hydrate.js';
import { needsReindex, orderBetween, reindexOrders } from './ordering.js';
import { newId } from '../shared/id.js';
import { badRequest, notFound } from '../shared/errors.js';
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  MoveTaskInputSchema,
  FilterStateSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type MoveTaskInput,
  type FilterState,
  type Subtask,
} from '../shared/schemas.js';

function priorityWeight(p: string): number {
  switch (p) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function dueStatus(dueDate?: string): 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'none' {
  if (!dueDate) return 'none';
  const due = new Date(dueDate);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000);
  const tomorrowEnd = new Date(end.getTime() + 86400000);
  if (due < start) return 'overdue';
  if (due < end) return 'today';
  if (due < tomorrowEnd) return 'tomorrow';
  return 'upcoming';
}

function assertValidTagIds(availableTags: { id: string }[], tagIds: string[]): void {
  if (!tagIds.length) return;
  const known = new Set(availableTags.map((t) => t.id));
  const unknown = tagIds.filter((id) => !known.has(id));
  if (unknown.length) {
    throw badRequest(`Unknown tag id(s): ${unknown.join(', ')}`);
  }
}

async function appendActivity(
  taskId: string,
  projectId: string,
  authorId: string,
  type: ActivityDoc['type'],
  content: string
): Promise<ActivityDoc> {
  const doc: ActivityDoc = {
    _id: newId('act'),
    taskId,
    projectId,
    type,
    content,
    authorId,
    createdAt: new Date().toISOString(),
  };
  await cols().activities.insertOne(doc);
  return doc;
}

async function reindexColumn(projectId: string, columnId: string): Promise<void> {
  const tasks = await cols()
    .tasks.find({ projectId, columnId })
    .sort({ order: 1 })
    .toArray();
  const orders = reindexOrders(tasks.length);
  await Promise.all(
    tasks.map((t, i) =>
      cols().tasks.updateOne({ _id: t._id }, { $set: { order: orders[i] } })
    )
  );
}

export async function listTasks(
  ctx: AuthContext,
  projectId: string,
  rawFilter: Partial<FilterState> = {}
) {
  requirePerm(ctx, 'task:read', projectId);
  const project = await getProjectDoc(projectId);
  const filters = FilterStateSchema.parse(rawFilter);
  let taskDocs = await cols().tasks.find({ projectId }).toArray();

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    const tagNames = new Map(project.availableTags.map((t) => [t.id, t.name.toLowerCase()]));
    taskDocs = taskDocs.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tagIds.some((id) => tagNames.get(id)?.includes(q))
    );
  }
  if (filters.priorities.length) {
    taskDocs = taskDocs.filter((t) => filters.priorities.includes(t.priority));
  }
  if (filters.assigneeIds.length) {
    taskDocs = taskDocs.filter((t) => t.assigneeIds.some((id) => filters.assigneeIds.includes(id)));
  }
  if (filters.tagIds.length) {
    taskDocs = taskDocs.filter((t) => t.tagIds.some((id) => filters.tagIds.includes(id)));
  }
  if (filters.columnIds.length) {
    taskDocs = taskDocs.filter((t) => filters.columnIds.includes(t.columnId));
  }
  if (filters.dueFilter !== 'all') {
    taskDocs = taskDocs.filter((t) => {
      const status = dueStatus(t.dueDate);
      if (filters.dueFilter === 'overdue') return status === 'overdue';
      if (filters.dueFilter === 'due-today') return status === 'today';
      if (filters.dueFilter === 'upcoming') return status === 'upcoming' || status === 'tomorrow';
      if (filters.dueFilter === 'no-date') return !t.dueDate;
      return true;
    });
  }

  taskDocs.sort((a, b) => {
    let valA: number | string = a.order;
    let valB: number | string = b.order;
    if (filters.sortBy === 'priority') {
      valA = priorityWeight(a.priority);
      valB = priorityWeight(b.priority);
    } else if (filters.sortBy === 'dueDate') {
      valA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      valB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    } else if (filters.sortBy === 'title') {
      valA = a.title.toLowerCase();
      valB = b.title.toLowerCase();
    }
    if (valA < valB) return filters.sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return filters.sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const acts = await cols()
    .activities.find({ projectId, taskId: { $in: taskDocs.map((t) => t._id) } })
    .sort({ createdAt: -1 })
    .toArray();
  const byTask = acts.reduce((m, a) => {
    const list = m.get(a.taskId) ?? [];
    list.push(a);
    m.set(a.taskId, list);
    return m;
  }, new Map<string, ActivityDoc[]>());

  const userMap = await loadUsersByIds(taskDocs.flatMap((t) => t.assigneeIds));
  return Promise.all(
    taskDocs.map((t) => hydrateTask(t, project, userMap, byTask.get(t._id) ?? []))
  );
}

export async function getTask(ctx: AuthContext, projectId: string, taskId: string) {
  requirePerm(ctx, 'task:read', projectId);
  const project = await getProjectDoc(projectId);
  const task = await cols().tasks.findOne({ _id: taskId, projectId });
  if (!task) throw notFound('Task not found');
  const acts = await cols()
    .activities.find({ taskId })
    .sort({ createdAt: -1 })
    .toArray();
  return hydrateTask(task, project, undefined, acts);
}

export async function listMyTasks(ctx: AuthContext) {
  requirePerm(ctx, 'task:read');

  const query: Record<string, unknown> = { assigneeIds: ctx.userId };
  if (ctx.projectIds && ctx.projectIds.length > 0) {
    query.projectId = { $in: ctx.projectIds };
  }

  const taskDocs = await cols().tasks.find(query).toArray();
  if (taskDocs.length === 0) return { tasks: [] };

  const projectIds = [...new Set(taskDocs.map((t) => t.projectId))];
  const projectDocs = await cols()
    .projects.find({ _id: { $in: projectIds } })
    .toArray();
  const projectMap = new Map(projectDocs.map((p) => [p._id, p]));

  // Drop tasks whose project is missing or not readable under PAT/session perms
  const readableDocs = taskDocs.filter((t) => {
    if (!projectMap.has(t.projectId)) return false;
    return can(ctx, 'task:read', t.projectId);
  });

  const userMap = await loadUsersByIds(readableDocs.flatMap((t) => t.assigneeIds));
  const taskIds = readableDocs.map((t) => t._id);
  const activities = await cols()
    .activities.find({ taskId: { $in: taskIds } })
    .sort({ createdAt: -1 })
    .toArray();
  const byTask = activities.reduce((m, a) => {
    const list = m.get(a.taskId) ?? [];
    list.push(a);
    m.set(a.taskId, list);
    return m;
  }, new Map<string, ActivityDoc[]>());

  const hydrated = await Promise.all(
    readableDocs.map(async (t) => {
      const project = projectMap.get(t.projectId)!;
      const task = await hydrateTask(t, project, userMap, byTask.get(t._id) ?? []);
      return {
        ...task,
        projectId: project._id,
        projectName: project.name,
        projectKey: project.key,
        projectColor: project.color,
      };
    })
  );

  hydrated.sort((a, b) => {
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return { tasks: hydrated };
}

export async function createTask(ctx: AuthContext, projectId: string, raw: CreateTaskInput) {
  requirePerm(ctx, 'task:create', projectId);
  const input = CreateTaskInputSchema.parse(raw);
  const project = await getProjectDoc(projectId);
  if (!project.columns.some((c) => c.id === input.columnId)) {
    throw badRequest('Invalid columnId');
  }
  assertValidTagIds(project.availableTags, input.tagIds);

  const siblings = await cols()
    .tasks.find({ projectId, columnId: input.columnId })
    .sort({ order: -1 })
    .limit(1)
    .toArray();
  const maxOrder = siblings[0]?.order ?? 0;
  const now = new Date().toISOString();
  const subtasks: Subtask[] = (input.subtasks ?? []).map((s) => ({
    id: newId('sub'),
    title: s.title,
    completed: false,
  }));

  const doc: TaskDoc = {
    _id: newId('task'),
    projectId,
    title: input.title,
    description: input.description,
    columnId: input.columnId,
    priority: input.priority,
    assigneeIds: input.assigneeIds,
    tagIds: input.tagIds,
    startDate: input.startDate,
    dueDate: input.dueDate,
    estimatedHours: input.estimatedHours,
    spentHours: 0,
    subtasks,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };
  await cols().tasks.insertOne(doc);
  await appendActivity(doc._id, projectId, ctx.userId, 'created', 'Task created');
  await writeAudit(ctx, {
    action: 'task.create',
    resourceType: 'task',
    resourceId: doc._id,
    projectId,
  });
  return getTask(ctx, projectId, doc._id);
}

export async function updateTask(
  ctx: AuthContext,
  projectId: string,
  taskId: string,
  raw: UpdateTaskInput
) {
  requirePerm(ctx, 'task:update', projectId);
  const input = UpdateTaskInputSchema.parse(raw);
  const existing = await cols().tasks.findOne({ _id: taskId, projectId });
  if (!existing) throw notFound('Task not found');

  if (input.tagIds !== undefined) {
    const project = await getProjectDoc(projectId);
    assertValidTagIds(project.availableTags, input.tagIds);
  }

  const $set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (input.title !== undefined) $set.title = input.title;
  if (input.description !== undefined) $set.description = input.description;
  if (input.priority !== undefined) $set.priority = input.priority;
  if (input.assigneeIds !== undefined) $set.assigneeIds = input.assigneeIds;
  if (input.tagIds !== undefined) $set.tagIds = input.tagIds;
  if (input.startDate !== undefined && input.startDate !== null) $set.startDate = input.startDate;
  if (input.dueDate !== undefined && input.dueDate !== null) $set.dueDate = input.dueDate;
  if (input.estimatedHours !== undefined && input.estimatedHours !== null) {
    $set.estimatedHours = input.estimatedHours;
  }
  if (input.spentHours !== undefined) $set.spentHours = input.spentHours;
  if (input.subtasks !== undefined) $set.subtasks = input.subtasks;
  if (input.attachments !== undefined) $set.attachments = input.attachments;

  const $unset: Record<string, ''> = {};
  if (input.startDate === null) $unset.startDate = '';
  if (input.dueDate === null) $unset.dueDate = '';
  if (input.estimatedHours === null) $unset.estimatedHours = '';

  await cols().tasks.updateOne(
    { _id: taskId },
    Object.keys($unset).length ? { $set, $unset } : { $set }
  );

  if (input.assigneeIds !== undefined) {
    await appendActivity(taskId, projectId, ctx.userId, 'assignee_change', 'Assignees updated');
  }
  await writeAudit(ctx, {
    action: 'task.update',
    resourceType: 'task',
    resourceId: taskId,
    projectId,
  });
  return getTask(ctx, projectId, taskId);
}

export async function moveTask(
  ctx: AuthContext,
  projectId: string,
  taskId: string,
  raw: MoveTaskInput
) {
  requirePerm(ctx, 'task:move', projectId);
  const input = MoveTaskInputSchema.parse(raw);
  const project = await getProjectDoc(projectId);
  if (!project.columns.some((c) => c.id === input.columnId)) {
    throw badRequest('Invalid columnId');
  }

  const task = await cols().tasks.findOne({ _id: taskId, projectId });
  if (!task) throw notFound('Task not found');

  const destTasks = await cols()
    .tasks.find({ projectId, columnId: input.columnId, _id: { $ne: taskId } })
    .sort({ order: 1 })
    .toArray();

  const before = input.index > 0 ? destTasks[input.index - 1]?.order ?? null : null;
  const after = destTasks[input.index]?.order ?? null;
  let nextOrder = orderBetween(before, after);

  if (needsReindex(before, after, nextOrder)) {
    await reindexColumn(projectId, input.columnId);
    const refreshed = await cols()
      .tasks.find({ projectId, columnId: input.columnId, _id: { $ne: taskId } })
      .sort({ order: 1 })
      .toArray();
    const b2 = input.index > 0 ? refreshed[input.index - 1]?.order ?? null : null;
    const a2 = refreshed[input.index]?.order ?? null;
    nextOrder = orderBetween(b2, a2);
  }

  const fromCol = task.columnId;
  await cols().tasks.updateOne(
    { _id: taskId },
    {
      $set: {
        columnId: input.columnId,
        order: nextOrder,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  if (fromCol !== input.columnId) {
    const fromTitle = project.columns.find((c) => c.id === fromCol)?.title ?? fromCol;
    const toTitle = project.columns.find((c) => c.id === input.columnId)?.title ?? input.columnId;
    await appendActivity(
      taskId,
      projectId,
      ctx.userId,
      'status_change',
      `Moved from ${fromTitle} to ${toTitle}`
    );
  }

  await writeAudit(ctx, {
    action: 'task.move',
    resourceType: 'task',
    resourceId: taskId,
    projectId,
    meta: { fromCol, toCol: input.columnId, index: input.index },
  });
  return getTask(ctx, projectId, taskId);
}

export async function deleteTask(ctx: AuthContext, projectId: string, taskId: string) {
  requirePerm(ctx, 'task:delete', projectId);
  const result = await cols().tasks.deleteOne({ _id: taskId, projectId });
  if (result.deletedCount === 0) throw notFound('Task not found');
  await cols().activities.deleteMany({ taskId });
  await writeAudit(ctx, {
    action: 'task.delete',
    resourceType: 'task',
    resourceId: taskId,
    projectId,
  });
}

export async function addComment(
  ctx: AuthContext,
  projectId: string,
  taskId: string,
  content: string
) {
  requirePerm(ctx, 'comment:create', projectId);
  const task = await cols().tasks.findOne({ _id: taskId, projectId });
  if (!task) throw notFound('Task not found');
  if (!content.trim()) throw badRequest('Comment cannot be empty');
  await appendActivity(taskId, projectId, ctx.userId, 'comment', content.trim());
  await writeAudit(ctx, {
    action: 'comment.create',
    resourceType: 'task',
    resourceId: taskId,
    projectId,
  });
  return getTask(ctx, projectId, taskId);
}

export async function addSubtask(
  ctx: AuthContext,
  projectId: string,
  taskId: string,
  title: string
) {
  requirePerm(ctx, 'task:update', projectId);
  const task = await cols().tasks.findOne({ _id: taskId, projectId });
  if (!task) throw notFound('Task not found');
  if (!title.trim()) throw badRequest('Subtask title required');
  const sub: Subtask = { id: newId('sub'), title: title.trim(), completed: false };
  await cols().tasks.updateOne(
    { _id: taskId },
    { $push: { subtasks: sub }, $set: { updatedAt: new Date().toISOString() } }
  );
  await writeAudit(ctx, {
    action: 'subtask.create',
    resourceType: 'task',
    resourceId: taskId,
    projectId,
  });
  return getTask(ctx, projectId, taskId);
}

export async function toggleSubtask(
  ctx: AuthContext,
  projectId: string,
  taskId: string,
  subtaskId: string
) {
  requirePerm(ctx, 'task:update', projectId);
  const task = await cols().tasks.findOne({ _id: taskId, projectId });
  if (!task) throw notFound('Task not found');
  const subtasks = task.subtasks.map((s) =>
    s.id === subtaskId ? { ...s, completed: !s.completed } : s
  );
  if (!task.subtasks.some((s) => s.id === subtaskId)) throw notFound('Subtask not found');
  await cols().tasks.updateOne(
    { _id: taskId },
    { $set: { subtasks, updatedAt: new Date().toISOString() } }
  );
  return getTask(ctx, projectId, taskId);
}

export async function deleteSubtask(
  ctx: AuthContext,
  projectId: string,
  taskId: string,
  subtaskId: string
) {
  requirePerm(ctx, 'task:update', projectId);
  const result = await cols().tasks.updateOne(
    { _id: taskId, projectId },
    {
      $pull: { subtasks: { id: subtaskId } },
      $set: { updatedAt: new Date().toISOString() },
    }
  );
  if (result.matchedCount === 0) throw notFound('Task not found');
  return getTask(ctx, projectId, taskId);
}

export async function searchTasks(ctx: AuthContext, projectId: string, query: string) {
  return listTasks(ctx, projectId, { search: query });
}
