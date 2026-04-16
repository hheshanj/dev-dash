import { useState } from 'react'
import {
  RefreshCw, CheckCircle2, Circle, AlertTriangle,
  Lightbulb, Calendar, Activity, X, Copy, Check
} from 'lucide-react'
import StatusBadge from './StatusBadge'
import { analyzeProject } from '../api/projects'

// SVG progress ring
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
        <circle
          cx="48" cy="48" r={normalizedRadius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
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
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="w-3/4" />
          <SkeletonBlock className="w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonBlock className="w-full" />
        <SkeletonBlock className="w-5/6" />
        <SkeletonBlock className="w-4/6" />
      </div>
      <div className="space-y-2">
        <SkeletonBlock className="w-1/3" />
        <SkeletonBlock className="w-full" />
        <SkeletonBlock className="w-5/6" />
      </div>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-[#2a2d3a] transition-colors text-slate-500 hover:text-slate-300">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

export default function ProjectDetail({ project, onClose, onAnalysisComplete }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [localAnalysis, setLocalAnalysis] = useState(project.analysis?.analysis_json || null)

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

  return (
    <div className="h-full flex flex-col bg-[#1a1d27] border-l border-[#2a2d3a]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3a] shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-100 truncate">{project.name}</h2>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-slate-500 truncate font-mono">{project.path}</span>
            <CopyButton text={project.path} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            {isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2a2d3a] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 relative">
        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Fetch Error */}
        {project._fetchError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {project._fetchError}
          </div>
        )}

        {/* Loading skeleton */}
        {isAnalyzing && !localAnalysis && <DetailSkeleton />}

        {/* No analysis state */}
        {!isAnalyzing && !localAnalysis && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Activity size={40} className="text-indigo-400/40 mb-4" />
            <p className="text-slate-400 text-sm font-medium">No analysis yet</p>
            <p className="text-slate-600 text-xs mt-1">Click "Re-Analyze" to generate AI insights for this project.</p>
          </div>
        )}

        {/* Analysis content */}
        {localAnalysis && (
          <>
            {/* Progress + Status */}
            <div className="flex items-center gap-5">
              <ProgressRing percentage={localAnalysis.completion_percentage ?? 0} />
              <div className="space-y-2">
                <StatusBadge status={localAnalysis.status} />
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar size={12} />
                  <span>Last activity: <span className="text-slate-300">{localAnalysis.last_meaningful_activity || '—'}</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Activity size={12} />
                  <span>Resumability: <span className="text-slate-300">{localAnalysis.resumability_score ?? '—'}/10</span></span>
                </div>
              </div>
            </div>

            {/* Summary */}
            {localAnalysis.summary && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{localAnalysis.summary}</p>
              </div>
            )}

            {/* Next Step */}
            {localAnalysis.next_suggested_step && (
              <div className="flex gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Lightbulb size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-400 mb-1">Suggested Next Step</p>
                  <p className="text-sm text-slate-300">{localAnalysis.next_suggested_step}</p>
                </div>
              </div>
            )}

            {/* Completed Features */}
            {localAnalysis.completed_features?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Completed</h3>
                <ul className="space-y-1.5">
                  {localAnalysis.completed_features.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* In Progress */}
            {localAnalysis.in_progress?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">In Progress</h3>
                <ul className="space-y-1.5">
                  {localAnalysis.in_progress.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <Circle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stalled / Abandoned */}
            {localAnalysis.abandoned_or_stalled?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stalled / Abandoned</h3>
                <ul className="space-y-1.5">
                  {localAnalysis.abandoned_or_stalled.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                      <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Skeleton overlay while re-analyzing with existing data */}
        {isAnalyzing && localAnalysis && (
          <div className="absolute inset-0 bg-[#1a1d27]/60 backdrop-blur-sm flex items-center justify-center rounded">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={28} className="text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400">Analyzing with AI...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
