import type { Project, Task, PublicUser } from '../shared/schemas.js';

export function paginate<T>(
  items: T[],
  limit = 25,
  offset = 0
): {
  total: number;
  count: number;
  offset: number;
  limit: number;
  has_more: boolean;
  next_offset: number | null;
  items: T[];
} {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  const slice = items.slice(safeOffset, safeOffset + safeLimit);
  const hasMore = safeOffset + slice.length < items.length;
  return {
    total: items.length,
    count: slice.length,
    offset: safeOffset,
    limit: safeLimit,
    has_more: hasMore,
    next_offset: hasMore ? safeOffset + slice.length : null,
    items: slice,
  };
}

export function slimProject(p: Project) {
  return {
    id: p.id,
    name: p.name,
    key: p.key,
    description: p.description,
    color: p.color,
    columnCount: p.columns.length,
    taskCount: p.tasks.length || p.badgeCount || 0,
    memberCount: p.members.length,
    columns: p.columns.map((c) => ({
      id: c.id,
      title: c.title,
      order: c.order,
      wipLimit: c.wipLimit,
      color: c.color,
    })),
    updatedAt: p.updatedAt,
  };
}

export type SlimTaskInput = Task & {
  projectId?: string;
  projectName?: string;
  projectKey?: string;
  startDate?: string;
};

export function slimTask(t: SlimTaskInput) {
  return {
    id: t.id,
    title: t.title,
    columnId: t.columnId,
    priority: t.priority,
    order: t.order,
    dueDate: t.dueDate,
    startDate: t.startDate,
    assigneeIds: t.assignees.map((a) => a.id),
    assigneeNames: t.assignees.map((a) => a.name),
    tagNames: t.tags.map((tag) => tag.name),
    milestoneId: t.milestoneId,
    milestoneName: t.milestone?.name,
    blockedBy: t.blockedBy ?? [],
    blockerTitles: (t.blockers ?? []).map((b) => b.title),
    subtaskProgress: `${t.subtasks.filter((s) => s.completed).length}/${t.subtasks.length}`,
    commentsCount: t.commentsCount ?? t.activities.filter((a) => a.type === 'comment').length,
    projectId: t.projectId,
    projectName: t.projectName,
    projectKey: t.projectKey,
    updatedAt: t.updatedAt,
  };
}

export function slimMember(u: PublicUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title,
  };
}

export function formatProjectsMarkdown(
  page: ReturnType<typeof paginate<ReturnType<typeof slimProject>>>
): string {
  const lines = [
    `# Projects (${page.count} of ${page.total})`,
    '',
    ...page.items.map(
      (p) =>
        `- **${p.name}** (\`${p.key}\`, id \`${p.id}\`) — ${p.taskCount} tasks, ${p.columnCount} columns`
    ),
  ];
  if (page.has_more) {
    lines.push('', `_More available — next_offset=${page.next_offset}_`);
  }
  return lines.join('\n');
}

export function formatTasksMarkdown(
  page: ReturnType<typeof paginate<ReturnType<typeof slimTask>>>,
  heading = 'Tasks'
): string {
  const lines = [
    `# ${heading} (${page.count} of ${page.total})`,
    '',
    ...page.items.map((t) => {
      const due = t.dueDate ? ` due ${t.dueDate.slice(0, 10)}` : '';
      const proj = t.projectKey ? ` [${t.projectKey}]` : '';
      return `- **${t.title}** (\`${t.id}\`)${proj} — ${t.priority}${due}`;
    }),
  ];
  if (page.has_more) {
    lines.push('', `_More available — next_offset=${page.next_offset}_`);
  }
  return lines.join('\n');
}

export function formatMembersMarkdown(members: ReturnType<typeof slimMember>[]): string {
  return [
    `# Members (${members.length})`,
    '',
    ...members.map(
      (m) => `- **${m.name}** (\`${m.id}\`) — ${m.role}${m.title ? `, ${m.title}` : ''}`
    ),
  ].join('\n');
}

export function formatTaskDetailMarkdown(t: Task): string {
  return [
    `# ${t.title}`,
    '',
    `- **id:** \`${t.id}\``,
    `- **column:** \`${t.columnId}\``,
    `- **priority:** ${t.priority}`,
    `- **assignees:** ${t.assignees.map((a) => a.name).join(', ') || 'none'}`,
    `- **tags:** ${t.tags.map((tag) => tag.name).join(', ') || 'none'}`,
    `- **milestone:** ${t.milestone?.name ?? t.milestoneId ?? 'none'}`,
    `- **blocked by:** ${
      t.blockers?.length
        ? t.blockers.map((b) => `${b.title}${b.done ? ' (done)' : ''}`).join(', ')
        : 'none'
    }`,
    `- **start:** ${t.startDate ?? 'none'}`,
    `- **due/end:** ${t.dueDate ?? 'none'}`,
    '',
    '## Description',
    t.description || '_(empty)_',
    '',
    `## Subtasks (${t.subtasks.filter((s) => s.completed).length}/${t.subtasks.length})`,
    ...t.subtasks.map((s) => `- [${s.completed ? 'x' : ' '}] ${s.title} (\`${s.id}\`)`),
    '',
    `## Recent activity (${Math.min(t.activities.length, 5)})`,
    ...t.activities
      .slice(0, 5)
      .map((a) => {
        const edited = a.editedAt ? ' _(edited)_' : '';
        return `- ${a.type}: ${a.content}${edited} — ${a.author.name} (\`${a.id}\`)`;
      }),
  ].join('\n');
}
