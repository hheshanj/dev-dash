import { useState, useEffect } from 'react'
import {
  RefreshCw, CheckCircle2, Circle, AlertTriangle,
  Lightbulb, Calendar, Activity, X, Copy, Check,
  BarChart3, GitBranch, Wrench, Star, GitPullRequest, AlertCircle, ExternalLink, Download, LayoutList
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatusBadge from './StatusBadge'
import { analyzeProject, improveProject, fetchProjectStats, updateNotes } from '../api/projects'

function ProgressRing({ percentage }) {
  const radius = 36
  const stroke = 6
  const normalizedRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const offset = circumference - (percentage / 100) * circumference
  const color = percentage >= 75 ? '#34d399' : percentage >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[-90deg]">
        <circle cx="48" cy="48" r={normalizedRadius} fill="none" stroke="#2a2d3a" strokeWidth={stroke} />
        <circle cx="48" cy="48" r={normalizedRadius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <span className="absolute text-xl font-bold text-slate-100">{percentage}%</span>
    </div>
  )
}

function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton h-4 rounded ${className}`} />
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-[#2a2d3a]" />
        <div className="flex-1 space-y-2"><SkeletonBlock className="w-3/4" /><SkeletonBlock className="w-1/2" /></div>
      </div>
      <div className="space-y-2"><SkeletonBlock className="w-full" /><SkeletonBlock className="w-5/6" /><SkeletonBlock className="w-4/6" /></div>
      <div className="space-y-2"><SkeletonBlock className="w-1/3" /><SkeletonBlock className="w-full" /><SkeletonBlock className="w-5/6" /></div>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-[#2a2d3a] transition-colors text-slate-500 hover:text-slate-300">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']

function AnalyticsTab({ stats, loading }) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <SkeletonBlock className="w-1/3" />
        <div className="h-48 bg-[#2a2d3a] rounded-lg" />
        <SkeletonBlock className="w-1/4" />
        <div className="h-48 bg-[#2a2d3a] rounded-lg" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 size={40} className="text-slate-600 mb-3" />
        <p className="text-slate-500 text-sm">No statistics available</p>
      </div>
    )
  }

  const { local, github, pullRequests } = stats

  return (
    <div className="space-y-6">
      {github && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[#2a2d3a]">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><Star size={12} /> Stars</div>
            <div className="text-xl font-bold text-slate-100">{github.stars}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#2a2d3a]">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><GitBranch size={12} /> Forks</div>
            <div className="text-xl font-bold text-slate-100">{github.forks}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#2a2d3a]">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><AlertCircle size={12} /> Open Issues</div>
            <div className="text-xl font-bold text-slate-100">{github.openIssues}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#2a2d3a]">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><GitPullRequest size={12} /> Open PRs</div>
            <div className="text-xl font-bold text-slate-100">{pullRequests?.length || 0}</div>
          </div>
        </div>
      )}

      {local?.timeSeries?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Commits Over Time</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={local.timeSeries.slice(-30)}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#4b5563" tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} stroke="#4b5563" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} />
                <Line type="monotone" dataKey="commits" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {local?.languageBreakdown?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Languages</h3>
          <div className="h-40 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={local.languageBreakdown.slice(0, 5)} dataKey="bytes" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                  {local.languageBreakdown.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {local.languageBreakdown.slice(0, 5).map((lang, i) => (
              <span key={lang.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {lang.name} ({lang.percentage}%)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">
        <div>Total Files: {local?.totalFiles || 0}</div>
        <div>Total Commits: {local?.totalCommits || 0}</div>
        {github?.language && <div>Primary Language: {github.language}</div>}
      </div>
    </div>
  )
}

function ImprovementsTab({ improvements, loading, onCheck }) {
  const [isChecking, setIsChecking] = useState(false)

  const handleCheck = async () => {
    setIsChecking(true)
    try { await onCheck() } finally { setIsChecking(false) }
  }

  return (
    <div className="space-y-4">
      <button onClick={handleCheck} disabled={isChecking} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
        <Wrench size={14} className={isChecking ? 'animate-spin' : ''} />
        {isChecking ? 'Analyzing...' : 'Check for Improvements'}
      </button>

      {loading && <SkeletonBlock className="w-full h-32" />}

      {improvements && (
        <>
          {improvements.overall_assessment && (
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-sm text-slate-300">{improvements.overall_assessment}</p>
            </div>
          )}

          {improvements.issues?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Issues Found ({improvements.issues.length})</h3>
              <div className="space-y-2">
                {improvements.issues.map((issue, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#2a2d3a]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${issue.severity === 'high' ? 'bg-red-500/20 text-red-400' : issue.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600/30 text-slate-400'}`}>{issue.severity}</span>
                      <span className="text-xs text-slate-500">{issue.category}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200">{issue.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{issue.description}</p>
                    {issue.suggestion && <p className="text-xs text-indigo-400 mt-2">{issue.suggestion}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {improvements.quick_wins?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Wins</h3>
              <ul className="space-y-1">
                {improvements.quick_wins.map((win, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" /><span>{win}</span></li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ProjectDetail({ project, onClose, onAnalysisComplete }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [localAnalysis, setLocalAnalysis] = useState(project.analysis?.analysis_json || null)
  const [activeTab, setActiveTab] = useState('analysis')
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [improvements, setImprovements] = useState(null)
  const [improvementsLoading, setImprovementsLoading] = useState(false)
  
  const [notes, setNotes] = useState(project.notes || '')
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    setNotes(project.notes || '')
    setSaveStatus('')
  }, [project.id, project.notes])

  useEffect(() => {
    if (notes === (project.notes || '')) return;
    const handler = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await updateNotes(project.id, notes)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(''), 2000)
      } catch (err) {
        setSaveStatus('error')
      }
    }, 1000)
    return () => clearTimeout(handler)
  }, [notes, project.id, project.notes])

  useEffect(() => {
    if (activeTab === 'analytics' && !stats) {
      setStatsLoading(true)
      fetchProjectStats(project.id).then(setStats).catch(console.error).finally(() => setStatsLoading(false))
    }
  }, [activeTab, project.id, stats])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const result = await analyzeProject(project.id)
      setLocalAnalysis(result.analysis)
      if (onAnalysisComplete) onAnalysisComplete(project.id, result.analysis)
    } catch (err) {
      setError(err.response?.data?.details || err.message || 'Analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleImprove = async () => {
    setImprovementsLoading(true)
    try {
      const result = await improveProject(project.id)
      setImprovements(result.improvements)
    } catch (err) {
      setError(err.response?.data?.details || err.message || 'Improvement analysis failed.')
    } finally {
      setImprovementsLoading(false)
    }
  }

  const exportHandover = () => {
    if (!localAnalysis) return;
    const md = `# ${project.name} — Handover Document

## Summary
${localAnalysis.summary || ''}

## Status: ${localAnalysis.status} (${localAnalysis.completion_percentage}% complete)

## Completed
${localAnalysis.completed_features?.map(f => `- ${f}`).join('\n') || 'None'}

## In Progress
${localAnalysis.in_progress?.map(f => `- ${f}`).join('\n') || 'None'}

## Stalled / Abandoned
${localAnalysis.abandoned_or_stalled?.map(f => `- ${f}`).join('\n') || 'None'}

## Suggested Next Step
${localAnalysis.next_suggested_step || 'None'}

## Resumability: ${localAnalysis.resumability_score}/10
## Last Meaningful Activity: ${localAnalysis.last_meaningful_activity || 'Unknown'}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-')}-handover.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs = [
    { id: 'analysis', label: 'Analysis', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'improvements', label: 'Improve', icon: Wrench }
  ]

  return (
    <div className="h-full flex flex-col bg-[#1a1d27] border-l border-[#2a2d3a]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3a] shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-100 truncate">{project.name}</h2>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-slate-500 truncate font-mono">{project.path}</span>
            <CopyButton text={project.path} />
            <a href={`vscode://file/${encodeURIComponent(project.path)}`} className="p-1 rounded hover:bg-[#2a2d3a] text-slate-500 hover:text-indigo-400 transition-colors" title="Open in VS Code">
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors">
            <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            {isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2a2d3a] text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
        </div>
      </div>

      <div className="flex border-b border-[#2a2d3a] shrink-0">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${activeTab === tab.id ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 relative">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {project._fetchError && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4">{project._fetchError}</div>}

        {activeTab === 'analysis' && (
          <>
            {isAnalyzing && !localAnalysis && <DetailSkeleton />}
            {!isAnalyzing && !localAnalysis && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity size={40} className="text-indigo-400/40 mb-4" /><p className="text-slate-400 text-sm font-medium">No analysis yet</p>
                <p className="text-slate-600 text-xs mt-1">Click "Re-Analyze" to generate AI insights.</p>
              </div>
            )}
            {localAnalysis && (
              <>
                <div className="flex items-center gap-5 mb-6">
                  <ProgressRing percentage={localAnalysis.completion_percentage ?? 0} />
                  <div className="space-y-2">
                    <StatusBadge status={localAnalysis.status} />
                    <div className="flex items-center gap-1.5 text-xs text-slate-400"><Calendar size={12} /> Last activity: <span className="text-slate-300">{localAnalysis.last_meaningful_activity || '—'}</span></div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400" title="Resumability: How easy it is to pick this project back up (1 = very hard, 10 = trivial)"><Activity size={12} /> Resumability: <span className="text-slate-300">{localAnalysis.resumability_score ?? '—'}/10</span></div>
                  </div>
                </div>
                {localAnalysis.summary && <div className="mb-4"><h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary</h3><p className="text-sm text-slate-300 leading-relaxed">{localAnalysis.summary}</p></div>}
                {localAnalysis.next_suggested_step && (
                  <div className="flex gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-4">
                    <Lightbulb size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div><p className="text-xs font-semibold text-indigo-400 mb-1">Suggested Next Step</p><p className="text-sm text-slate-300">{localAnalysis.next_suggested_step}</p></div>
                  </div>
                )}
                {localAnalysis.completed_features?.length > 0 && <div className="mb-4"><h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Completed</h3><ul className="space-y-1.5">{localAnalysis.completed_features.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" /><span>{item}</span></li>)}</ul></div>}
                {localAnalysis.in_progress?.length > 0 && <div className="mb-4"><h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">In Progress</h3><ul className="space-y-1.5">{localAnalysis.in_progress.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-300"><Circle size={14} className="text-amber-400 shrink-0 mt-0.5" /><span>{item}</span></li>)}</ul></div>}
                {localAnalysis.abandoned_or_stalled?.length > 0 && <div className="mb-4"><h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stalled / Abandoned</h3><ul className="space-y-1.5">{localAnalysis.abandoned_or_stalled.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-400"><AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" /><span>{item}</span></li>)}</ul></div>}
                
                {/* Developer Notes Block */}
                <div className="pt-6 mt-6 border-t border-[#2a2d3a]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2"><LayoutList size={14} /> Quick Notes</h3>
                    {saveStatus === 'saving' && <span className="text-xs text-slate-500 flex items-center gap-1.5"><RefreshCw size={11} className="animate-spin" /> Saving...</span>}
                    {saveStatus === 'saved' && <span className="text-xs text-emerald-400 flex items-center gap-1.5"><Check size={11} /> Saved</span>}
                    {saveStatus === 'error' && <span className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle size={11} /> Failed</span>}
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Jot down context, blockers, or future plans for this repository here... (Auto-saves)"
                    className="w-full min-h-[140px] bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-y transition-all"
                  />
                </div>

                <div className="pt-4 border-t border-[#2a2d3a] mt-6">
                  <button onClick={exportHandover} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2d3a] hover:bg-[#343746] text-sm font-medium text-slate-300 transition-colors">
                    <Download size={14} /> Export Handover Document
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'analytics' && <AnalyticsTab stats={stats} loading={statsLoading} />}

        {activeTab === 'improvements' && <ImprovementsTab improvements={improvements} loading={improvementsLoading} onCheck={handleImprove} />}

        {isAnalyzing && localAnalysis && (
          <div className="absolute inset-0 bg-[#1a1d27]/60 backdrop-blur-sm flex items-center justify-center rounded">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={28} className="text-indigo-400 animate-spin" /><p className="text-sm text-slate-400">Analyzing with AI...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
