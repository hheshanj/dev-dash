import { useState } from 'react'
import { Server, KeySquare, GitBranch, ArrowRight, Loader2, Play } from 'lucide-react'
import { saveSettings } from '../api/settings'

export default function Onboarding({ onComplete }) {
  const [formData, setFormData] = useState({
    REPOS_PATH: '',
    NVIDIA_API_KEY: '',
    GITHUB_TOKEN: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.REPOS_PATH.trim() || !formData.NVIDIA_API_KEY.trim()) {
        throw new Error('Workspace Path and AI API Key are required.')
      }

      await saveSettings(formData)
      onComplete()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save settings.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-600">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-accent">
              <Play fill="currentColor" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome to DevDash</h1>
          </div>
          <p className="text-sm text-slate-500 mt-2">Let's configure your local environment to get started. These keys stay strictly on your machine.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <Server size={14} className="text-accent" /> Workspace Directory <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.REPOS_PATH}
                onChange={(e) => setFormData(f => ({ ...f, REPOS_PATH: e.target.value }))}
                placeholder="e.g. C:\Users\Name\Projects or /Users/Name/Code"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all font-mono"
              />
              <p className="text-xs text-slate-500 mt-1.5">Absolute path to the folder containing all your Git repositories.</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <KeySquare size={14} className="text-accent" /> AI API Key (Nvidia NIM) <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.NVIDIA_API_KEY}
                onChange={(e) => setFormData(f => ({ ...f, NVIDIA_API_KEY: e.target.value }))}
                placeholder="nvapi-..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all font-mono"
              />
              <p className="text-xs text-slate-500 mt-1.5">Your Nvidia API key for Llama 3 analysis.</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <GitBranch size={14} className="text-slate-400" /> GitHub Personal Access Token <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="password"
                value={formData.GITHUB_TOKEN}
                onChange={(e) => setFormData(f => ({ ...f, GITHUB_TOKEN: e.target.value }))}
                placeholder="ghp_..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all font-mono"
              />
              <p className="text-xs text-slate-500 mt-1.5">Required for fetching Issues and PRs. Leave blank to skip.</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={18} /> Launch DevDash</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
