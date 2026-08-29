import { cols } from '../db/client.js';
import type { ActivityDoc, ProjectDoc, TaskDoc, UserDoc } from '../db/types.js';
import type { Milestone, Project, PublicUser, Task, TaskActivity, Tag, TaskBlocker } from '../shared/schemas.js';
import { toPublicUser } from '../auth/context.js';
import { isDoneColumnTitle } from './taskStatus.js';

export async function loadUsersByIds(ids: string[]): Promise<Map<string, UserDoc>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const docs = await cols()
    .users.find({ _id: { $in: unique } })
    .toArray();
  return new Map(docs.map((d) => [d._id, d]));
}

export function tagsForIds(project: ProjectDoc, tagIds: string[]): Tag[] {
  const map = new Map(project.availableTags.map((t) => [t.id, t]));
  return tagIds.map((id) => map.get(id)).filter((t): t is Tag => Boolean(t));
}

export function milestoneForId(project: ProjectDoc, milestoneId?: string): Milestone | undefined {
  if (!milestoneId) return undefined;
  return (project.milestones ?? []).find((m) => m.id === milestoneId);
}

export function blockersFromDocs(
  project: ProjectDoc,
  blockedBy: string[] | undefined,
  taskById: Map<string, TaskDoc>
): TaskBlocker[] {
  if (!blockedBy?.length) return [];
  return blockedBy.map((id) => {
    const doc = taskById.get(id);
    const col = doc ? project.columns.find((c) => c.id === doc.columnId) : undefined;
    return {
      id,
      title: doc?.title ?? id,
      done: col ? isDoneColumnTitle(col.title) : false,
    };
  });
}

export async function loadTaskDocsByIds(ids: string[]): Promise<Map<string, TaskDoc>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const docs = await cols()
    .tasks.find({ _id: { $in: unique } })
    .toArray();
  return new Map(docs.map((d) => [d._id, d]));
}

export async function hydrateActivities(
  activities: ActivityDoc[],
  userMap: Map<string, UserDoc>
): Promise<TaskActivity[]> {
  return activities.map((a) => {
    const authorDoc = userMap.get(a.authorId);
    const author: PublicUser = authorDoc
      ? toPublicUser(authorDoc)
      : {
          id: a.authorId,
          name: 'Unknown',
          email: '',
          avatar: '',
          title: '',
          role: 'viewer',
        };
    return {
      id: a._id,
      type: a.type,
      content: a.content,
      author,
      createdAt: a.createdAt,
      ...(a.editedAt ? { editedAt: a.editedAt } : {}),
    };
  });
}

export async function hydrateTask(
  task: TaskDoc,
  project: ProjectDoc,
  userMap?: Map<string, UserDoc>,
  activities?: ActivityDoc[],
  blockerDocs?: Map<string, TaskDoc>
): Promise<Task> {
  const map = userMap ?? (await loadUsersByIds(task.assigneeIds));
  const assignees = task.assigneeIds
    .map((id) => map.get(id))
    .filter((u): u is UserDoc => Boolean(u))
    .map(toPublicUser);

  let acts: TaskActivity[] = [];
  if (activities) {
    const authorIds = activities.map((a) => a.authorId);
    const actUsers = await loadUsersByIds([...authorIds, ...task.assigneeIds]);
    acts = await hydrateActivities(activities, actUsers);
  }

  const blockerMap = blockerDocs ?? (await loadTaskDocsByIds(task.blockedBy ?? []));
  const milestone = milestoneForId(project, task.milestoneId);
  const blockers = blockersFromDocs(project, task.blockedBy, blockerMap);

  return {
    id: task._id,
    title: task.title,
    description: task.description,
    columnId: task.columnId,
    priority: task.priority,
    assignees,
    tags: tagsForIds(project, task.tagIds),
    startDate: task.startDate,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    spentHours: task.spentHours,
    subtasks: task.subtasks,
    activities: acts,
    attachments: task.attachments,
    commentsCount: acts.filter((a) => a.type === 'comment').length,
    attachmentsCount: task.attachments?.length ?? 0,
    order: task.order,
    ...(task.milestoneId ? { milestoneId: task.milestoneId } : {}),
    ...(milestone ? { milestone } : {}),
    ...(task.blockedBy?.length ? { blockedBy: task.blockedBy, blockers } : {}),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function hydrateProject(
  project: ProjectDoc,
  options: { includeTasks?: boolean; includeActivities?: boolean } = {}
): Promise<Project> {
  const includeTasks = options.includeTasks !== false;
  const includeActivities = options.includeActivities !== false;

  const memberIds = project.members.map((m) => m.userId);
  const memberDocs = await loadUsersByIds(memberIds);
  const members = memberIds
    .map((id) => memberDocs.get(id))
    .filter((u): u is UserDoc => Boolean(u))
    .map(toPublicUser);

  let tasks: Task[] = [];
  if (includeTasks) {
    const taskDocs = await cols()
      .tasks.find({ projectId: project._id })
      .sort({ order: 1 })
      .toArray();

    const allAssigneeIds = taskDocs.flatMap((t) => t.assigneeIds);
    const userMap = await loadUsersByIds([...memberIds, ...allAssigneeIds]);
    const taskById = new Map(taskDocs.map((t) => [t._id, t]));

    let activitiesByTask = new Map<string, ActivityDoc[]>();
    if (includeActivities && taskDocs.length > 0) {
      const acts = await cols()
        .activities.find({ projectId: project._id })
        .sort({ createdAt: -1 })
        .toArray();
      activitiesByTask = acts.reduce((acc, a) => {
        const list = acc.get(a.taskId) ?? [];
        list.push(a);
        acc.set(a.taskId, list);
        return acc;
      }, new Map<string, ActivityDoc[]>());
    }

    tasks = await Promise.all(
      taskDocs.map((t) =>
        hydrateTask(
          t,
          project,
          userMap,
          includeActivities ? activitiesByTask.get(t._id) ?? [] : [],
          taskById
        )
      )
    );
  }

  return {
    id: project._id,
    name: project.name,
    key: project.key,
    description: project.description,
    icon: project.icon,
    color: project.color,
    category: project.category,
    columns: [...project.columns].sort((a, b) => a.order - b.order),
    tasks,
    members,
    availableTags: project.availableTags,
    milestones: [...(project.milestones ?? [])].sort((a, b) => a.order - b.order),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
