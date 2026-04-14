import { useState, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal, LayoutDashboard, RefreshCw } from 'lucide-react'
import { fetchProjects, fetchProject } from '../api/projects'
import ProjectCard from '../components/ProjectCard'
import ProjectDetail from '../components/ProjectDetail'
import ErrorBoundary from '../components/ErrorBoundary'

const STATUS_FILTERS = ['all', 'active', 'stalled', 'completed', 'unknown']

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [listError, setListError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Load all projects on mount
  useEffect(() => {
    loadProjects()
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
      setSelectedProject(project)
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
            {projects.length} repos
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
        </div>
      </header>

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

            {/* Empty filtered state */}
            {!isLoadingList && filteredProjects.length === 0 && !listError && (
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
    </div>
  )
}
