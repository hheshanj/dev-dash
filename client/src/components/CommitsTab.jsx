import { useState, useEffect, useCallback } from 'react'
import {
  GitCommitHorizontal, GitBranch, ChevronDown, ChevronRight,
  Plus, Minus, RefreshCw, AlertTriangle, Copy, Check,
  FileCode, FilePlus, FileX, FilePen, User, Clock
} from 'lucide-react'
import { fetchCommits, fetchCommitDiff, fetchBranches } from '../api/projects'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function HashBadge({ hash }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(hash); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded transition-colors"
      title="Copy full hash"
    >
      {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
      {hash.substring(0, 7)}
    </button>
  )
}

function FileStatusIcon({ status }) {
  const map = {
    added:    <FilePlus size={13} className="text-emerald-500" />,
    deleted:  <FileX size={13} className="text-red-500" />,
    modified: <FilePen size={13} className="text-amber-500" />,
    renamed:  <FileCode size={13} className="text-blue-500" />
  }
  return map[status] || <FileCode size={13} className="text-slate-400" />
}

function FileStatusBadge({ status }) {
  const map = {
    added:    'bg-emerald-100 text-emerald-700',
    deleted:  'bg-red-100 text-red-700',
    modified: 'bg-amber-100 text-amber-700',
    renamed:  'bg-blue-100 text-blue-700'
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

// ─── Diff viewer ──────────────────────────────────────────────────────────────

function DiffHunk({ hunk }) {
  return (
    <div className="font-mono text-[11px] leading-relaxed">
      <div className="px-3 py-1 bg-blue-50 text-blue-500 border-y border-blue-100 text-[10px]">
        {hunk.header}
        {hunk.context && <span className="text-slate-400 ml-2">{hunk.context}</span>}
      </div>
      {hunk.lines.map((line, i) => {
        const cls =
          line.type === 'add' ? 'bg-emerald-50 text-emerald-800 border-l-2 border-emerald-400' :
          line.type === 'del' ? 'bg-red-50 text-red-800 border-l-2 border-red-400' :
          'text-slate-500'
        const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '
        return (
          <div key={i} className={`flex px-3 py-[1px] ${cls}`}>
            <span className="w-4 shrink-0 text-slate-300 select-none">{prefix}</span>
            <span className="whitespace-pre-wrap break-all">{line.content || ' '}</span>
          </div>
        )
      })}
    </div>
  )
}

function FileDiff({ file }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {open ? <ChevronDown size={13} className="text-slate-400 shrink-0" /> : <ChevronRight size={13} className="text-slate-400 shrink-0" />}
        <FileStatusIcon status={file.status} />
        <span className="text-xs font-mono text-slate-700 truncate flex-1">
          {file.newPath ? `${file.path} → ${file.newPath}` : file.path}
        </span>
        <FileStatusBadge status={file.status} />
      </button>

      {open && (
        <div className="overflow-x-auto">
          {file.hunks.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400 italic">No visible changes (binary or empty)</p>
          ) : (
            file.hunks.map((hunk, i) => <DiffHunk key={i} hunk={hunk} />)
          )}
        </div>
      )}
    </div>
  )
}

// ─── Commit row ───────────────────────────────────────────────────────────────

function CommitRow({ commit, projectId, isExpanded, onToggle }) {
  const [diff, setDiff] = useState(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffError, setDiffError] = useState(null)

  const loadDiff = useCallback(async () => {
    if (diff || diffLoading) return
    setDiffLoading(true)
    setDiffError(null)
    try {
      const data = await fetchCommitDiff(projectId, commit.hash)
      setDiff(data)
    } catch (err) {
      setDiffError('Failed to load diff')
    } finally {
      setDiffLoading(false)
    }
  }, [projectId, commit.hash, diff, diffLoading])

  const handleToggle = () => {
    if (!isExpanded) loadDiff()
    onToggle(commit.hash)
  }

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Commit summary row */}
      <button
        onClick={handleToggle}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
      >
        <div className="shrink-0 mt-0.5 text-slate-300 group-hover:text-slate-400 transition-colors">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {/* Left: icon + connector line */}
        <div className="flex flex-col items-center shrink-0 mt-0.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${commit.isMerge ? 'bg-purple-100' : 'bg-slate-100'}`}>
            <GitCommitHorizontal size={14} className={commit.isMerge ? 'text-purple-500' : 'text-slate-400'} />
          </div>
        </div>

        {/* Right: message + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{commit.message}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <User size={10} /> {commit.author}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400" title={formatDate(commit.date)}>
              <Clock size={10} /> {timeAgo(commit.date)}
            </span>
            <HashBadge hash={commit.hash} />
            {commit.isMerge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium">merge</span>
            )}
          </div>
        </div>

        {/* Right: stat pills */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {commit.filesChanged > 0 && (
            <span className="text-[11px] text-slate-400">{commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}</span>
          )}
          {commit.linesAdded > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 font-mono">
              <Plus size={10} />{commit.linesAdded}
            </span>
          )}
          {commit.linesDeleted > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-red-500 font-mono">
              <Minus size={10} />{commit.linesDeleted}
            </span>
          )}
        </div>
      </button>

      {/* Expanded diff panel */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-white border-t border-slate-100">
          {diffLoading && (
            <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
              <RefreshCw size={13} className="animate-spin" /> Loading diff…
            </div>
          )}
          {diffError && (
            <div className="flex items-center gap-2 py-3 text-xs text-red-500">
              <AlertTriangle size={13} /> {diffError}
            </div>
          )}
          {diff && diff.files.length === 0 && !diffLoading && (
            <p className="py-4 text-xs text-slate-400 italic">No file changes recorded for this commit.</p>
          )}
          {diff && diff.files.length > 0 && (
            <div className="mt-3">
              {/* File list summary */}
              <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
                {diff.files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                    <FileStatusIcon status={f.status} />
                    {f.path.split('/').pop()}
                  </span>
                ))}
              </div>
              {/* Per-file diffs */}
              {diff.files.map((file, i) => (
                <FileDiff key={i} file={file} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main CommitsTab ───────────────────────────────────────────────────────────

export default function CommitsTab({ projectId }) {
  const [commits, setCommits] = useState([])
  const [branches, setBranches] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState('HEAD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedHash, setExpandedHash] = useState(null)
  const [limit, setLimit] = useState(50)

  const load = useCallback(async (branch = selectedBranch, lim = limit) => {
    setLoading(true)
    setError(null)
    try {
      const [commitsData, branchesData] = await Promise.all([
        fetchCommits(projectId, { limit: lim, branch }),
        branches ? Promise.resolve(null) : fetchBranches(projectId)
      ])
      setCommits(commitsData)
      if (branchesData) setBranches(branchesData)
    } catch (err) {
      setError('Failed to load commits')
    } finally {
      setLoading(false)
    }
  }, [projectId, selectedBranch, limit, branches])

  useEffect(() => { load() }, [projectId])

  const handleBranchChange = (branch) => {
    setSelectedBranch(branch)
    setExpandedHash(null)
    load(branch, limit)
  }

  const handleToggle = (hash) => {
    setExpandedHash(prev => prev === hash ? null : hash)
  }

  // Group commits by date
  const grouped = commits.reduce((acc, commit) => {
    const day = commit.date.substring(0, 10)
    if (!acc[day]) acc[day] = []
    acc[day].push(commit)
    return acc
  }, {})

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 pb-4 mb-1 border-b border-slate-100 shrink-0">
        {/* Branch selector */}
        <div className="flex items-center gap-1.5 min-w-0">
          <GitBranch size={13} className="text-slate-400 shrink-0" />
          <select
            value={selectedBranch}
            onChange={e => handleBranchChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-md px-2 py-1.5 focus:outline-none focus:border-accent max-w-[160px] truncate"
          >
            <option value="HEAD">HEAD (current)</option>
            {branches?.branches.map(b => (
              <option key={b.name} value={b.name}>
                {b.isRemote ? '↑ ' : ''}{b.name}
                {b.isCurrent ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Current branch pill */}
        {branches?.current && (
          <span className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            <GitBranch size={10} /> {branches.current}
          </span>
        )}

        <div className="flex-1" />

        {/* Limit selector */}
        <select
          value={limit}
          onChange={e => { const l = parseInt(e.target.value); setLimit(l); load(selectedBranch, l) }}
          className="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded-md px-2 py-1.5 focus:outline-none focus:border-accent"
        >
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
        </select>

        {/* Refresh */}
        <button
          onClick={() => load()}
          disabled={loading}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary bar */}
      {!loading && commits.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-400 pb-3 shrink-0">
          <span><strong className="text-slate-600">{commits.length}</strong> commits</span>
          <span>
            <strong className="text-emerald-600">
              +{commits.reduce((s, c) => s + c.linesAdded, 0).toLocaleString()}
            </strong>
            {' / '}
            <strong className="text-red-500">
              -{commits.reduce((s, c) => s + c.linesDeleted, 0).toLocaleString()}
            </strong>
            {' lines'}
          </span>
          <span>
            <strong className="text-slate-600">
              {[...new Set(commits.map(c => c.author))].length}
            </strong> contributor{[...new Set(commits.map(c => c.author))].length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Commit list */}
      <div className="flex-1 overflow-y-auto -mx-6 px-0">
        {loading && (
          <div className="flex items-center justify-center py-12 text-xs text-slate-400 gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading commits…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
            <AlertTriangle size={13} /> {error}
          </div>
        )}
        {!loading && !error && commits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <GitCommitHorizontal size={36} className="text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">No commits found</p>
          </div>
        )}

        {!loading && days.map(day => (
          <div key={day}>
            {/* Day separator */}
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-y border-slate-100 sticky top-0 z-10">
              <span className="text-[11px] font-semibold text-slate-500">
                {new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[10px] text-slate-400">
                {grouped[day].length} commit{grouped[day].length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Commits for this day */}
            <div>
              {grouped[day].map(commit => (
                <CommitRow
                  key={commit.hash}
                  commit={commit}
                  projectId={projectId}
                  isExpanded={expandedHash === commit.hash}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
