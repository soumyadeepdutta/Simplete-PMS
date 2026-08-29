import React from 'react';
import { useKanban } from '../../context/KanbanContext';
import { Avatar } from '../ui/Avatar';
import { Layers, Activity } from 'lucide-react';
import { getDueStatus } from '../../utils/dateUtils';

export const MetricsView: React.FC = () => {
 const { activeProject } = useKanban();

 if (!activeProject) return null;

 const totalTasks = activeProject.tasks.length;
 const doneTasks = activeProject.tasks.filter((t) => {
 const col = activeProject.columns.find((c) => c.id === t.columnId);
 return col?.title.toLowerCase().includes('done') || col?.title.toLowerCase().includes('shipped');
 }).length;

 const inProgressTasks = activeProject.tasks.filter((t) => {
 const col = activeProject.columns.find((c) => c.id === t.columnId);
 return (
 col?.title.toLowerCase().includes('progress') ||
 col?.title.toLowerCase().includes('craft') ||
 col?.title.toLowerCase().includes('review')
 );
 }).length;

 const overdueTasks = activeProject.tasks.filter(
 (t) => getDueStatus(t.dueDate) === 'overdue'
 ).length;

 const completionPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

 const totalEstHours = activeProject.tasks.reduce(
 (acc, t) => acc + (t.estimatedHours || 0),
 0
 );
 const totalSpentHours = activeProject.tasks.reduce(
 (acc, t) => acc + (t.spentHours || 0),
 0
 );

 // Priority distribution
 const urgentCount = activeProject.tasks.filter((t) => t.priority === 'urgent').length;
 const highCount = activeProject.tasks.filter((t) => t.priority === 'high').length;
 const mediumCount = activeProject.tasks.filter((t) => t.priority === 'medium').length;
 const lowCount = activeProject.tasks.filter((t) => t.priority === 'low').length;

 return (
 <div className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto w-full relative z-10">
 {/* Header section */}
 <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border pb-5">
 <div>
 <span className="text-[11px] font-mono text-accent-blue uppercase tracking-widest">
 Workspace Velocity & Health
 </span>
 <h2 className="text-3xl sm:text-4xl font-bold text-ink mt-2 tracking-tight">
 Team Analytics Hub
 </h2>
 </div>
 <p className="text-sm text-ink-muted max-w-sm mt-2 sm:mt-0">
 A high-performance summary of active workload and sprint momentum.
 </p>
 </div>

 {/* Top 4 KPI Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
 {/* Card 1 */}
 <div className="p-5 bg-glass rounded-2xl border border-glass shadow-card flex flex-col justify-between relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-accent-green/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-accent-green/30 transition-colors" />
 <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted z-10">
 Delivery Rate
 </span>
 <div className="my-3 z-10">
 <div className="text-4xl font-bold text-ink drop-shadow-md">
 {completionPct}%
 </div>
 <div className="text-xs text-accent-green font-medium mt-1">
 {doneTasks} of {totalTasks} milestones shipped
 </div>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden z-10 shadow-inner">
 <div
 className="bg-gradient-to-r from-accent-blue to-accent-green h-full rounded-full transition-all duration-1000"
 style={{ width: `${completionPct}%` }}
 />
 </div>
 </div>

 {/* Card 2 */}
 <div className="p-5 bg-glass rounded-2xl border border-glass shadow-card flex flex-col justify-between relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-sky-500/30 transition-colors" />
 <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted z-10">
 Active In Flight
 </span>
 <div className="my-3 z-10">
 <div className="text-4xl font-bold text-ink drop-shadow-md">
 {inProgressTasks}
 </div>
 <div className="text-xs text-sky-400 font-medium mt-1">
 Tasks in active progression
 </div>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden z-10 shadow-inner">
 <div
 className="bg-gradient-to-r from-sky-400 to-cyan-500 h-full rounded-full transition-all duration-1000"
 style={{ width: `${totalTasks === 0 ? 0 : (inProgressTasks / totalTasks) * 100}%` }}
 />
 </div>
 </div>

 {/* Card 3 */}
 <div className="p-5 bg-glass rounded-2xl border border-glass shadow-card flex flex-col justify-between relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-accent-blue/30 transition-colors" />
 <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted z-10">
 Logged Hours
 </span>
 <div className="my-3 z-10">
 <div className="text-4xl font-bold text-ink drop-shadow-md">
 {totalSpentHours} <span className="text-lg text-ink-muted font-normal">/ {totalEstHours}h</span>
 </div>
 <div className="text-xs text-accent-blue font-medium mt-1">
 Total tracked against estimate
 </div>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden z-10 shadow-inner">
 <div
 className="bg-gradient-to-r from-accent-blue to-sky-400 h-full rounded-full transition-all duration-1000"
 style={{
 width: `${totalEstHours === 0 ? 0 : Math.min(100, (totalSpentHours / totalEstHours) * 100)}%`,
 }}
 />
 </div>
 </div>

 {/* Card 4 */}
 <div className="p-5 bg-glass rounded-2xl border border-glass shadow-card flex flex-col justify-between relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-rose-500/30 transition-colors" />
 <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted z-10">
 Attention Needed
 </span>
 <div className="my-3 z-10">
 <div className="text-4xl font-bold text-ink drop-shadow-md">
 {overdueTasks}
 </div>
 <div
 className={`text-xs font-medium mt-1 ${
 overdueTasks > 0 ? 'text-accent-red' : 'text-accent-green'
 }`}
 >
 {overdueTasks > 0 ? 'Milestones past target date' : 'All milestones on schedule'}
 </div>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden z-10 shadow-inner">
 <div
 className="bg-gradient-to-r from-rose-400 to-orange-400 h-full rounded-full transition-all duration-1000"
 style={{ width: `${totalTasks === 0 ? 0 : (overdueTasks / totalTasks) * 100}%` }}
 />
 </div>
 </div>
 </div>

 {/* Progress Breakdown & Workload Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Column Workflow Distribution */}
 <div className="p-6 bg-glass rounded-2xl border border-glass shadow-card space-y-5">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold text-ink flex items-center gap-2.5">
 <Layers className="w-4 h-4 text-accent-blue" />
 Workflow Distribution
 </h3>
 <span className="text-[11px] font-mono text-ink-muted bg-canvas px-2 py-1 rounded border border-border">
 {activeProject.columns.length} STAGES
 </span>
 </div>

 <div className="space-y-4 pt-1">
 {activeProject.columns.map((col) => {
 const colTasks = activeProject.tasks.filter((t) => t.columnId === col.id).length;
 const pct = totalTasks === 0 ? 0 : Math.round((colTasks / totalTasks) * 100);

 return (
 <div key={col.id} className="space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-medium text-ink flex items-center gap-2">
 <span
 className="w-2.5 h-2.5 rounded-full"
 style={{ backgroundColor: col.color, color: col.color }}
 />
 {col.title}
 </span>
 <span className="text-ink-muted font-mono text-[11px]">
 {colTasks} tasks ({pct}%)
 </span>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden shadow-inner">
 <div
 className="h-full rounded-full transition-all duration-700"
 style={{ width: `${pct}%`, backgroundColor: col.color, color: col.color }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Priority Breakdown */}
 <div className="p-6 bg-glass rounded-2xl border border-glass shadow-card space-y-5">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold text-ink flex items-center gap-2.5">
 <Activity className="w-4 h-4 text-accent-red" />
 Priority Matrix
 </h3>
 <span className="text-[11px] font-mono text-ink-muted bg-canvas px-2 py-1 rounded border border-border">
 {totalTasks} TOTAL
 </span>
 </div>

 <div className="space-y-4 pt-1">
 {/* Urgent */}
 <div className="space-y-2">
 <div className="flex justify-between text-xs">
 <span className="font-medium text-accent-red flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Urgent
 </span>
 <span className="text-ink-muted font-mono text-[11px]">{urgentCount}</span>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden shadow-inner">
 <div
 className="bg-rose-500 h-full rounded-full"
 style={{ width: `${totalTasks === 0 ? 0 : (urgentCount / totalTasks) * 100}%` }}
 />
 </div>
 </div>

 {/* High */}
 <div className="space-y-2">
 <div className="flex justify-between text-xs">
 <span className="font-medium text-amber-400 flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High
 </span>
 <span className="text-ink-muted font-mono text-[11px]">{highCount}</span>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden shadow-inner">
 <div
 className="bg-amber-500 h-full rounded-full"
 style={{ width: `${totalTasks === 0 ? 0 : (highCount / totalTasks) * 100}%` }}
 />
 </div>
 </div>

 {/* Medium */}
 <div className="space-y-2">
 <div className="flex justify-between text-xs">
 <span className="font-medium text-sky-400 flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Medium
 </span>
 <span className="text-ink-muted font-mono text-[11px]">{mediumCount}</span>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden shadow-inner">
 <div
 className="bg-sky-500 h-full rounded-full"
 style={{ width: `${totalTasks === 0 ? 0 : (mediumCount / totalTasks) * 100}%` }}
 />
 </div>
 </div>

 {/* Low */}
 <div className="space-y-2">
 <div className="flex justify-between text-xs">
 <span className="font-medium text-ink-muted flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Low
 </span>
 <span className="text-ink-muted font-mono text-[11px]">{lowCount}</span>
 </div>
 <div className="w-full bg-canvas h-2 rounded-full overflow-hidden shadow-inner">
 <div
 className="bg-slate-400 h-full rounded-full"
 style={{ width: `${totalTasks === 0 ? 0 : (lowCount / totalTasks) * 100}%` }}
 />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Team Member Workload */}
 <div className="p-6 bg-glass rounded-2xl border border-glass shadow-card space-y-5">
 <h3 className="text-sm font-semibold text-ink">
 Team Capacity
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {activeProject.members.map((member) => {
 const memberTasks = activeProject.tasks.filter((t) =>
 t.assignees.some((a) => a.id === member.id)
 );
 const memberDone = memberTasks.filter((t) => {
 const col = activeProject.columns.find((c) => c.id === t.columnId);
 return col?.title.toLowerCase().includes('done') || col?.title.toLowerCase().includes('shipped');
 }).length;

 return (
 <div
 key={member.id}
 className="p-4 rounded-xl bg-surface-muted border border-border flex items-center gap-4 hover:bg-surface-muted transition-colors group cursor-default"
 >
 <Avatar user={member} size="md" className="ring-border group-hover:ring-accent-blue/40 transition-all" />
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-semibold text-ink truncate">
 {member.name}
 </h4>
 <p className="text-[10px] text-ink-muted truncate tracking-wide">{member.title || member.role}</p>
 <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted font-mono">
 <span>{memberTasks.length} active</span>
 <span className="text-accent-green font-medium">{memberDone} done</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
};
