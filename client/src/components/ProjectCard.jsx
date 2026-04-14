import { FolderGit2, Clock } from 'lucide-react'
import StatusBadge from './StatusBadge'

function ResumabilityDots({ score }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            i < score ? 'bg-indigo-400' : 'bg-[#2a2d3a]'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">{score}/10</span>
    </div>
  )
}

function timeAgo(dateString) {
  if (!dateString) return 'Never'
  const now = new Date()
  const then = new Date(dateString)
  const diffMs = now - then
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export default function ProjectCard({ project, isSelected, onSelect }) {
  const analysis = project.analysis?.analysis_json || null
  const status = analysis?.status || 'unknown'
  const score = analysis?.resumability_score || null

  return (
    <button
      onClick={() => onSelect(project)}
      className={`
        w-full text-left p-4 rounded-xl border transition-all duration-200 group
        bg-[#1a1d27] hover:bg-[#1f2235] hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5
        ${isSelected
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
          : 'border-[#2a2d3a]'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <FolderGit2 size={15} className="text-indigo-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-100 truncate group-hover:text-white">
            {project.name}
          </h3>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Summary or empty state */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3 min-h-[2.5rem]">
        {analysis?.summary || 'No analysis yet. Click to analyze this project.'}
      </p>

      {/* Footer metadata */}
      <div className="flex items-center justify-between">
        {score !== null ? (
          <ResumabilityDots score={score} />
        ) : (
          <span className="text-xs text-slate-600">Not analyzed</span>
        )}
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={11} />
          <span>{timeAgo(project.last_analyzed)}</span>
        </div>
      </div>
    </button>
  )
}
