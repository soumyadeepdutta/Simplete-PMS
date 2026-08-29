import { cols } from '../db/client.js';
import type { ActivityDoc, ProjectDoc, TaskDoc, UserDoc } from '../db/types.js';
import type { Project, PublicUser, Task, TaskActivity, Tag } from '../shared/schemas.js';
import { toPublicUser } from '../auth/context.js';

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
    };
  });
}

export async function hydrateTask(
  task: TaskDoc,
  project: ProjectDoc,
  userMap?: Map<string, UserDoc>,
  activities?: ActivityDoc[]
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
        hydrateTask(t, project, userMap, includeActivities ? activitiesByTask.get(t._id) ?? [] : [])
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
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
