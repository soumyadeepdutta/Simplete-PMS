import React, { useState } from 'react';
import {
  Kanban,
  Sparkles,
  Bot,
  Calendar,
  BarChart3,
  ShieldCheck,
  Terminal,
  Sun,
  Moon,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Layers,
  Zap,
  Lock,
  Cpu,
  Table,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

interface LandingPageProps {
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const { isDark, setTheme } = useTheme();
  const { user, needsSetup } = useAuth();
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'timeline' | 'metrics' | 'mcp'>('board');

  const cliCommand = 'npx simplete-pms --mongodb-uri "mongodb://127.0.0.1:27017/simplete"';

  const mcpConfigJson = `{
  "mcpServers": {
    "simplete": {
      "url": "http://localhost:4000/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_ACCESS_TOKEN>"
      }
    }
  }
}`;

  const copyToClipboard = (text: string, isMcp: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isMcp) {
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full bg-page-atmosphere text-ink selection:bg-accent-blue/20 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden">
      {/* ── Top Navigation Bar ── */}
      <header className="fixed top-0 inset-x-0 z-40 bg-surface/75 dark:bg-surface/60 backdrop-blur-xl border-b border-border/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-blue/15 flex items-center justify-center text-accent-blue border border-accent-blue/30 shadow-sm">
              <Kanban className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-ink">Simplete PMS</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-blue-soft text-accent-blue border border-accent-blue/20">
                v0.1 Self-Hosted
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-muted">
            <a href="#features" className="hover:text-ink transition-colors">
              Features
            </a>
            <a href="#views" className="hover:text-ink transition-colors">
              Views
            </a>
            <a href="#mcp" className="hover:text-ink transition-colors">
              MCP & AI
            </a>
            <a href="#quickstart" className="hover:text-ink transition-colors">
              Quickstart
            </a>
            <a
              href="https://github.com/soumyadeepdutta/Simplete-PMS"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink transition-colors flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors border border-border/50"
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={onSignIn}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent-blue text-white hover:opacity-95 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {needsSetup ? (
                <>
                  <span>Create Owner</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                </>
              ) : user ? (
                <>
                  <span>Open Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 pt-24 pb-16">
        {/* Onboarding Alert when instance needs initial setup */}
        {needsSetup && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8">
            <div className="bg-glass-strong border border-accent-blue/30 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-xl bg-accent-blue/15 text-accent-blue">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">First-time Setup Detected</p>
                  <p className="text-ink-muted text-xs">
                    No administrator account exists yet. Create your owner account to initialize your instance.
                  </p>
                </div>
              </div>
              <button
                onClick={onSignIn}
                className="whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-xl bg-accent-blue text-white hover:opacity-90 shadow-sm transition-all"
              >
                Set Up Instance →
              </button>
            </div>
          </div>
        )}

        {/* ── Hero Section ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-surface/80 border border-border/80 shadow-subtle mb-6 text-ink-muted backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-accent-blue" />
            <span>Single command, self-hosted PMS • Zero Docker required</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink max-w-4xl mx-auto leading-[1.15]">
            Project Management, Streamlined for{' '}
            <span className="bg-gradient-to-r from-accent-blue via-indigo-500 to-accent-purple bg-clip-text text-transparent">
              Teams & AI Agents
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed">
            Fast, self-hosted Kanban boards, Gantt timelines, metrics, and native{' '}
            <strong className="font-semibold text-ink">Model Context Protocol (MCP)</strong> integrations for Claude,
            Cursor, and autonomous agents.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onSignIn}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-accent-blue text-white shadow-elevated hover:opacity-95 transition-all flex items-center gap-2 group hover:scale-[1.02]"
            >
              <span>{needsSetup ? 'Set Up Your Instance' : 'Launch Workspace'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <a
              href="#features"
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-surface/70 hover:bg-surface border border-border text-ink transition-all backdrop-blur-md"
            >
              Explore Features
            </a>
          </div>

          {/* Quick CLI copy snippet */}
          <div className="mt-8 max-w-xl mx-auto">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-canvas border border-border font-mono text-xs text-ink-muted shadow-card backdrop-blur-md">
              <div className="flex items-center gap-2 truncate pr-2">
                <Terminal className="w-4 h-4 text-accent-blue shrink-0" />
                <span className="truncate">{cliCommand}</span>
              </div>
              <button
                onClick={() => copyToClipboard(cliCommand, false)}
                className="p-1.5 rounded-lg hover:bg-surface-muted text-ink-subtle hover:text-ink transition-colors shrink-0"
                title="Copy command"
              >
                {copiedCmd ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ── Glassmorphic Board Preview Mockup ── */}
          <div className="mt-14 relative mx-auto max-w-5xl">
            {/* Ambient glow behind mockup */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-blue/20 via-indigo-500/20 to-accent-purple/20 rounded-3xl blur-2xl -z-10 opacity-70" />

            <div className="rounded-2xl border border-glass bg-glass-strong shadow-window overflow-hidden backdrop-blur-2xl text-left">
              {/* Window Header */}
              <div className="px-4 py-3 bg-surface/80 border-b border-border/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
                  <span className="ml-3 text-xs font-semibold text-ink">
                    Sprint 14: Mobile Redesign & MCP Agent Hooks
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted bg-surface-muted px-2.5 py-1 rounded-lg border border-border/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>MCP Server Live (:4000)</span>
                </div>
              </div>

              {/* Board View Switcher Bar */}
              <div className="px-4 py-2.5 bg-canvas/40 border-b border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1 bg-surface-muted/60 p-1 rounded-xl border border-border/40">
                  <button
                    onClick={() => setActiveTab('board')}
                    className={cn(
                      'px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5',
                      activeTab === 'board' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <Kanban className="w-3.5 h-3.5 text-accent-blue" />
                    <span>Board</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={cn(
                      'px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5',
                      activeTab === 'timeline' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 text-accent-green" />
                    <span>Timeline</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('metrics')}
                    className={cn(
                      'px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5',
                      activeTab === 'metrics' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-accent-purple" />
                    <span>Metrics</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('mcp')}
                    className={cn(
                      'px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5',
                      activeTab === 'mcp' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <Bot className="w-3.5 h-3.5 text-accent-orange" />
                    <span>MCP Agent</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-subtle">4 Columns • 18 Tasks</span>
                </div>
              </div>

              {/* Tab Content Display */}
              {activeTab === 'board' && (
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-canvas/30">
                  {/* Column 1: Backlog / To Do */}
                  <div className="flex flex-col gap-3 bg-surface/50 rounded-xl p-3 border border-border/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Backlog
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-surface-muted text-ink-muted text-[10px]">2</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border/60 shadow-card">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent-blue-soft text-accent-blue">
                          PROJ-102
                        </span>
                        <span className="text-[10px] text-accent-orange font-medium">Medium</span>
                      </div>
                      <p className="text-xs font-medium text-ink">Implement rate limiting for MCP tools</p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted pt-2 border-t border-border/30">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 2h
                        </span>
                        <span className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue text-[10px] font-bold flex items-center justify-center">
                          SD
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: In Progress */}
                  <div className="flex flex-col gap-3 bg-surface/50 rounded-xl p-3 border border-border/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-accent-blue" />
                        In Progress
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-surface-muted text-ink-muted text-[10px]">2</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-accent-blue/40 shadow-card ring-1 ring-accent-blue/20">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent-purple-soft text-accent-purple">
                          PROJ-105
                        </span>
                        <span className="text-[10px] text-accent-red font-medium">Urgent</span>
                      </div>
                      <p className="text-xs font-medium text-ink">Claude & Cursor autonomous task syncing</p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted pt-2 border-t border-border/30">
                        <span className="flex items-center gap-1 text-accent-blue">
                          <Bot className="w-3 h-3" /> via MCP
                        </span>
                        <span className="w-5 h-5 rounded-full bg-accent-purple/20 text-accent-purple text-[10px] font-bold flex items-center justify-center">
                          AI
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Completed */}
                  <div className="flex flex-col gap-3 bg-surface/50 rounded-xl p-3 border border-border/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-accent-green" />
                        Done
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-surface-muted text-ink-muted text-[10px]">3</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border/60 shadow-card opacity-90">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent-green-soft text-accent-green">
                          PROJ-98
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                      </div>
                      <p className="text-xs font-medium text-ink line-through text-ink-muted">
                        Single-binary release packaging
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="p-6 bg-canvas/30 text-xs">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="w-32 truncate font-medium text-ink">Mobile Redesign</span>
                      <div className="flex-1 bg-surface-muted rounded-full h-4 overflow-hidden relative border border-border/40">
                        <div className="bg-accent-blue h-full rounded-full w-2/3 flex items-center px-2 text-[10px] text-white">
                          Aug 18 – Sep 02
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-32 truncate font-medium text-ink">MCP Integration</span>
                      <div className="flex-1 bg-surface-muted rounded-full h-4 overflow-hidden relative border border-border/40">
                        <div className="bg-accent-purple h-full rounded-full w-4/5 flex items-center px-2 text-[10px] text-white">
                          Aug 25 – Sep 08
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-32 truncate font-medium text-ink">Security Audit</span>
                      <div className="flex-1 bg-surface-muted rounded-full h-4 overflow-hidden relative border border-border/40">
                        <div className="bg-accent-green h-full rounded-full w-1/2 flex items-center px-2 text-[10px] text-white">
                          Sep 01 – Sep 15
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'metrics' && (
                <div className="p-6 bg-canvas/30 grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-surface border border-border/60">
                    <p className="text-2xl font-bold text-accent-blue">84%</p>
                    <p className="text-xs text-ink-muted mt-1">Sprint Completion</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-border/60">
                    <p className="text-2xl font-bold text-accent-green">14.2h</p>
                    <p className="text-xs text-ink-muted mt-1">Avg Cycle Time</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-border/60">
                    <p className="text-2xl font-bold text-accent-purple">99.8%</p>
                    <p className="text-xs text-ink-muted mt-1">MCP Sync Uptime</p>
                  </div>
                </div>
              )}

              {activeTab === 'mcp' && (
                <div className="p-6 bg-canvas/40 font-mono text-xs space-y-2">
                  <div className="flex items-center gap-2 text-accent-blue">
                    <Bot className="w-4 h-4" />
                    <span>Agent Connected: Claude Sonnet 3.7 (MCP Client)</span>
                  </div>
                  <p className="text-ink-muted text-[11px]">
                    &gt; Executed <code className="text-accent-purple">tasks_create</code>: &quot;Update OpenAPI documentation&quot;
                  </p>
                  <p className="text-ink-muted text-[11px]">
                    &gt; Executed <code className="text-accent-green">tasks_update</code>: Set column to &quot;In Review&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-accent-blue mb-2">Capabilities</h2>
            <p className="text-3xl sm:text-4xl font-bold text-ink">Engineered for Developer Velocity</p>
            <p className="text-ink-muted mt-3 text-sm sm:text-base">
              Everything modern teams need to plan, track, and ship high-impact software without the SaaS bloat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-glass-strong border border-glass shadow-card hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center mb-4">
                <Kanban className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">Fluid Multi-View Workspaces</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Switch instantly between drag-and-drop Kanban boards, tabular data views, task lists, and workload
                analytics.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-glass-strong border border-glass shadow-card hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-accent-purple/15 text-accent-purple flex items-center justify-center mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">Native Model Context Protocol (MCP)</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                First-class MCP server support. Let Cursor, Claude Desktop, or Antigravity inspect tasks, create tickets,
                and update milestones autonomously.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-glass-strong border border-glass shadow-card hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-accent-green/15 text-accent-green flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">Interactive Gantt Timelines</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Visualize multi-sprint milestones, start and due dates, task dependencies, and blocked items in an
                intuitive timeline view.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-glass-strong border border-glass shadow-card hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-accent-orange/15 text-accent-orange flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">Granular Role-Based Access (RBAC)</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Owner, Admin, Member, and Viewer permissions with full audit trail logging and scoped personal access
                tokens.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-glass-strong border border-glass shadow-card hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">Zero-Bloat Self Hosting</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                A single command launches both backend and web SPA. Store all data in your private MongoDB without
                external telemetry or cloud lock-in.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-glass-strong border border-glass shadow-card hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-500 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">Adaptive Glass Atmosphere</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Frosted glass surfaces, custom theme palettes, light/dark modes, and crisp typography designed for deep
                focus.
              </p>
            </div>
          </div>
        </section>

        {/* ── MCP Section ── */}
        <section id="mcp" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
          <div className="bg-glass-strong border border-glass rounded-3xl p-8 sm:p-12 shadow-elevated">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent-purple-soft text-accent-purple mb-4">
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI Agent Ready</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-ink">
                  Empower AI Agents with Full Project Context
                </h2>
                <p className="mt-4 text-sm text-ink-muted leading-relaxed">
                  Simplete PMS ships with a native Model Context Protocol (MCP) server. Point Cursor, Claude, or any MCP
                  client to your Simplete PMS instance to let AI assistants list tasks, append comments, or create project
                  milestones without leaving your editor.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs text-ink font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent-green" /> Scoped access tokens with granular permissions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent-green" /> Built-in DNS rebinding and host security
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent-green" /> Zero external middleware required
                  </li>
                </ul>
              </div>

              {/* MCP Configuration snippet */}
              <div className="bg-surface rounded-2xl border border-border/80 shadow-card p-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/60 text-xs font-medium text-ink-muted">
                  <span className="font-mono">claude_desktop_config.json</span>
                  <button
                    onClick={() => copyToClipboard(mcpConfigJson, true)}
                    className="flex items-center gap-1 text-[11px] hover:text-ink transition-colors"
                  >
                    {copiedMcp ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="mt-3 text-[11px] font-mono text-ink-muted overflow-x-auto p-2 bg-canvas/60 rounded-xl leading-relaxed">
                  {mcpConfigJson}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* ── Quickstart Section ── */}
        <section id="quickstart" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20 text-center">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-accent-blue mb-2">Get Started in 60s</h2>
          <p className="text-3xl font-bold text-ink">Run Anywhere with One Command</p>
          <p className="text-ink-muted mt-3 text-sm max-w-xl mx-auto">
            Simplete PMS requires only a MongoDB database connection. No complex docker stacks or multi-service setups.
          </p>

          <div className="mt-8 text-left max-w-2xl mx-auto space-y-4">
            <div className="p-4 rounded-xl bg-glass-strong border border-glass shadow-card">
              <p className="text-xs font-semibold text-ink mb-1">1. Launch with NPX</p>
              <div className="flex items-center justify-between bg-canvas/80 p-3 rounded-lg border border-border font-mono text-xs text-ink-muted mt-2">
                <span>npx simplete-pms --mongodb-uri &quot;mongodb://127.0.0.1:27017/simplete&quot;</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-glass-strong border border-glass shadow-card">
              <p className="text-xs font-semibold text-ink mb-1">2. Open in Browser</p>
              <p className="text-xs text-ink-muted mt-1">
                Navigate to <code className="text-accent-blue font-mono">http://localhost:4000</code> and complete first-time
                owner setup.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <button
              onClick={onSignIn}
              className="px-8 py-3.5 rounded-xl text-sm font-semibold bg-accent-blue text-white shadow-elevated hover:opacity-95 transition-all inline-flex items-center gap-2 hover:scale-[1.02]"
            >
              <span>{needsSetup ? 'Begin Owner Setup' : 'Enter Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-surface/50 backdrop-blur-md py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <Kanban className="w-4 h-4 text-accent-blue" />
            <span className="font-semibold text-ink">Simplete PMS</span>
            <span>— Open-source & Self-hosted</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="/docs" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              API Docs
            </a>
            <a
              href="https://github.com/soumyadeepdutta/Simplete-PMS"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink transition-colors"
            >
              GitHub
            </a>
            <button onClick={onSignIn} className="text-accent-blue font-medium hover:underline">
              {needsSetup ? 'Set Up Instance' : 'Sign In'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

