
import { useState, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal, LayoutDashboard, RefreshCw, Settings } from 'lucide-react'
import { fetchProjects, fetchProject, togglePin } from '../api/projects'
import ProjectCard from '../components/ProjectCard'
import ProjectDetail from '../components/ProjectDetail'
import ErrorBoundary from '../components/ErrorBoundary'
import SettingsModal from '../components/SettingsModal'

const STATUS_FILTERS = ['all', 'active', 'stalled', 'completed', 'unknown']

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [listError, setListError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)

  // Load all projects on mount
  useEffect(() => {
    loadProjects()
  }, [])

  // Escape key handler to close detail panel
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedProject(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function loadProjects() {
    setIsLoadingList(true)
    setListError(null)
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (err) {
      setListError('Failed to load projects. Is the server running?')
    } finally {
      setIsLoadingList(false)
    }
  }

  async function handleSelectProject(project) {
    setIsLoadingDetail(true)
    setSelectedProject({ ...project, analysis: null })
    try {
      const detail = await fetchProject(project.id)
      setSelectedProject(detail)
    } catch (err) {
      setSelectedProject({ ...project, _fetchError: 'Failed to load project details.' })
    } finally {
      setIsLoadingDetail(false)
    }
  }

  function handleAnalysisComplete(projectId, newAnalysis) {
    // Update the card in the grid list so it reflects new status immediately
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? { ...p, last_analyzed: new Date().toISOString(), analysis: { analysis_json: newAnalysis } }
          : p
      )
    )
  }

  async function handleTogglePin(projectId, pinned) {
    setProjects(prev => {
      const updated = prev.map(p => p.id === projectId ? { ...p, pinned: pinned ? 1 : 0 } : p);
      return updated.sort((a, b) => {
        if (b.pinned !== a.pinned) return (b.pinned || 0) - (a.pinned || 0);
        return new Date(b.last_analyzed || 0) - new Date(a.last_analyzed || 0);
      });
    });
    try {
      await togglePin(projectId, pinned);
    } catch (e) {
      loadProjects();
    }
  }

  const globalStats = useMemo(() => {
    let active = 0, stalled = 0, completed = 0, sumScore = 0, scoredCount = 0;
    projects.forEach(p => {
      const status = p.analysis?.analysis_json?.status;
      if (status === 'active') active++;
      if (status === 'stalled' || status === 'abandoned_or_stalled') stalled++;
      if (status === 'completed') completed++;
      const score = p.analysis?.analysis_json?.resumability_score;
      if (score != null) {
        sumScore += score;
        scoredCount++;
      }
    });
    const avgScore = scoredCount > 0 ? (sumScore / scoredCount).toFixed(1) : '-';
    return { active, stalled, completed, avgScore };
  }, [projects]);

  // Filtered + searched list
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase())
      const analysisStatus = p.analysis?.analysis_json?.status || 'unknown'
      const matchesStatus = statusFilter === 'all' || analysisStatus === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [projects, searchQuery, statusFilter])

  return (
    <div className="flex flex-col h-screen bg-[#0f1117]">
      {/* Top Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3a] shrink-0">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard size={20} className="text-indigo-400" />
          <h1 className="text-base font-bold text-white tracking-tight">devdash</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#2a2d3a] text-slate-400 font-medium">
            {filteredProjects.length}{filteredProjects.length !== projects.length ? ` / ${projects.length}` : ''} repos
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search repos…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-lg bg-[#1a1d27] border border-[#2a2d3a] text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-52 transition-colors"
            />
          </div>
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <SlidersHorizontal size={14} className="text-slate-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#1a1d27] border border-[#2a2d3a] text-sm text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors capitalize"
            >
              {STATUS_FILTERS.map(s => (
                <option key={s} value={s} className="capitalize">{s === 'all' ? 'All statuses' : s}</option>
              ))}
            </select>
          </div>
          {/* Refresh */}
          <button
            onClick={loadProjects}
            disabled={isLoadingList}
            className="p-1.5 rounded-lg hover:bg-[#2a2d3a] text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            title="Refresh project list"
          >
            <RefreshCw size={15} className={isLoadingList ? 'animate-spin' : ''} />
          </button>
          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg hover:bg-[#2a2d3a] text-slate-500 hover:text-slate-300 transition-colors"
            title="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>
      
      {/* Global Stats Bar */}
      <div className="flex items-center justify-center gap-4 py-2 bg-[#1a1d27] border-b border-[#2a2d3a] shrink-0 text-xs text-slate-400">
        <span><strong className="text-white">{projects.length}</strong> repos</span>
        <span className="w-1 h-1 rounded-full bg-[#2a2d3a]" />
        <span><strong className="text-emerald-400">{globalStats.active}</strong> active</span>
        <span className="w-1 h-1 rounded-full bg-[#2a2d3a]" />
        <span><strong className="text-amber-400">{globalStats.stalled}</strong> stalled</span>
        <span className="w-1 h-1 rounded-full bg-[#2a2d3a]" />
        <span><strong className="text-indigo-400">{globalStats.completed}</strong> completed</span>
        <span className="w-1 h-1 rounded-full bg-[#2a2d3a]" />
        <span>Avg resumability: <strong className="text-white">{globalStats.avgScore}</strong>/10</span>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Project Grid (Left Panel) */}
        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${selectedProject ? 'w-[420px]' : 'flex-1'}`}>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Error state */}
            {listError && (
              <div className="m-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {listError}
              </div>
            )}

            {/* Loading skeleton grid */}
            {isLoadingList && (
              <div className={`grid gap-3 ${selectedProject ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-xl bg-[#1a1d27] border border-[#2a2d3a] animate-pulse" />
                ))}
              </div>
            )}

            {/* First-run empty state */}
            {!isLoadingList && projects.length === 0 && !listError && (
              <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                <div className="max-w-md w-full p-6 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl text-left shadow-lg">
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
                    <span className="text-2xl">📁</span> No repositories found
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Make sure your <code className="bg-[#0f1117] px-1.5 py-0.5 rounded text-indigo-300">.env</code> is properly configured:
                  </p>
                  <ul className="text-sm text-slate-300 space-y-2 mb-6">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span><code className="text-indigo-300">REPOS_PATH</code> points to your main development folder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span>The folder contains actual <code className="text-emerald-400">.git</code> directories</span>
                    </li>
                  </ul>
                  <div className="flex justify-end gap-3">
                    <button onClick={loadProjects} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                      <RefreshCw size={14} className={isLoadingList ? 'animate-spin' : ''} /> Retry Scan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty filtered state */}
            {!isLoadingList && projects.length > 0 && filteredProjects.length === 0 && !listError && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search size={36} className="text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">No repos match your filter.</p>
              </div>
            )}

            {/* Project cards */}
            {!isLoadingList && filteredProjects.length > 0 && (
              <div className={`grid gap-3 ${selectedProject ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {filteredProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isSelected={selectedProject?.id === project.id}
                    onSelect={handleSelectProject}
                    onTogglePin={handleTogglePin}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel (Right) */}
        {selectedProject && (
          <div className="flex-1 relative overflow-hidden">
            {isLoadingDetail ? (
              <div className="h-full flex items-center justify-center bg-[#1a1d27] border-l border-[#2a2d3a]">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw size={24} className="text-indigo-400 animate-spin" />
                  <p className="text-sm text-slate-500">Loading project…</p>
                </div>
              </div>
            ) : (
              <ErrorBoundary key={selectedProject.id}>
                <ProjectDetail
                  project={selectedProject}
                  onClose={() => setSelectedProject(null)}
                  onAnalysisComplete={handleAnalysisComplete}
                />
              </ErrorBoundary>
            )}
          </div>
        )}
      </div>

      {showSettings && <SettingsModal onClose={() => { setShowSettings(false); loadProjects() }} />}
    </div>
  )
}
