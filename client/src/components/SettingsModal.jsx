import { useState, useEffect } from 'react'
import { X, Save, Server, KeySquare, GitBranch, Loader2, Check } from 'lucide-react'
import { fetchSettings, saveSettings } from '../api/settings'

export default function SettingsModal({ onClose }) {
  const [formData, setFormData] = useState({
    REPOS_PATH: '',
    NVIDIA_API_KEY: '',
    GITHUB_TOKEN: ''
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetchSettings().then(data => {
      setFormData(data.settings)
      setLoading(false)
    }).catch(err => {
      setStatus({ type: 'error', message: 'Failed to load existing settings.' })
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    try {
      if (!formData.REPOS_PATH.trim()) {
        throw new Error('Workspace Path cannot be empty.')
      }

      await saveSettings(formData)
      setStatus({ type: 'success', message: 'Settings saved successfully!' })
      // Auto close after 1s
      setTimeout(() => onClose(), 1000)
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || err.message || 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#0f1117]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3a]">
          <h2 className="text-lg font-bold text-slate-100">Global Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2a2d3a] text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={24} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {status && (
              <div className={`p-3 rounded-lg border text-sm ${status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                {status.message}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Server size={14} className="text-indigo-400" /> Workspace Directory <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.REPOS_PATH}
                onChange={(e) => setFormData({ ...formData, REPOS_PATH: e.target.value })}
                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <KeySquare size={14} className="text-indigo-400" /> AI API Key (Nvidia NIM)
              </label>
              <input
                type="password"
                value={formData.NVIDIA_API_KEY}
                onChange={(e) => setFormData({ ...formData, NVIDIA_API_KEY: e.target.value })}
                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono placeholder-slate-600"
              />
              <p className="text-xs text-slate-500 mt-1">Leave as stars to keep the existing key.</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <GitBranch size={14} className="text-slate-400" /> GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={formData.GITHUB_TOKEN}
                onChange={(e) => setFormData({ ...formData, GITHUB_TOKEN: e.target.value })}
                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono placeholder-slate-600"
              />
              <p className="text-xs text-slate-500 mt-1">Leave as stars to keep existing. Clear field completely to remove.</p>
            </div>

            <div className="pt-4 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : status?.type === 'success' ? (
                  <Check size={16} />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Saving...' : status?.type === 'success' ? 'Saved' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
