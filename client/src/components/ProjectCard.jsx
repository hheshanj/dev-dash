import { FolderGit2, Clock, Star } from 'lucide-react'
import StatusBadge from './StatusBadge'

function ResumabilityDots({ score }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            i < score ? 'bg-accent' : 'bg-[border]'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-500">{score}/10</span>
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

function HighlightedText({ text, query }) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-accent rounded">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

export default function ProjectCard({ project, isSelected, onSelect, onTogglePin, searchQuery }) {
  const analysis = project.analysis?.analysis_json || null
  const status = analysis?.status || 'unknown'
  const score = analysis?.resumability_score || null

  return (
    <button
      onClick={() => onSelect(project)}
      className={`
        w-full text-left p-4 rounded-xl border transition-all duration-200 group
        bg-white hover:bg-slate-50 hover:border-accent/50 hover:shadow-md
        ${isSelected
          ? 'border-accent shadow-md shadow-accent/10'
          : 'border-slate-200'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <FolderGit2 size={15} className="text-accent shrink-0" />
          <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-900">
            <HighlightedText text={project.name} query={searchQuery} />
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(project.id, !project.pinned);
            }}
            className={`p-1 rounded transition-colors ${project.pinned ? 'text-amber-500 hover:text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-accent hover:bg-slate-100'}`}
            title={project.pinned ? "Unpin project" : "Pin project"}
          >
            <Star size={13} fill={project.pinned ? 'currentColor' : 'none'} />
          </button>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Summary or empty state */}
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 min-h-[2.5rem]">
        {analysis?.summary || 'No analysis yet. Click to analyze this project.'}
      </p>

      {/* Footer metadata */}
      <div className="flex items-center justify-between">
        {score !== null ? (
          <ResumabilityDots score={score} />
        ) : (
          <span className="text-xs text-slate-400">Not analyzed</span>
        )}
        <div className="flex items-center gap-1 text-xs">
          <Clock size={11} className={!project.last_analyzed ? 'text-slate-400' : 'text-slate-500'} />
          <span className={!project.last_analyzed ? 'text-slate-400 italic' : 'text-slate-500'}>{timeAgo(project.last_analyzed)}</span>
        </div>
      </div>
    </button>
  )
}
