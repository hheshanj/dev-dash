import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Onboarding from './components/Onboarding'
import { fetchSettings } from './api/settings'
import { Loader2 } from 'lucide-react'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [isSetup, setIsSetup] = useState(false)

  const checkSetup = async () => {
    try {
      const data = await fetchSettings()
      setIsSetup(data.isSetup)
    } catch (err) {
      console.error('Failed to fetch settings status', err)
      setIsSetup(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSetup()
  }, [])

  if (loading) {
    return (
      <div className="h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    )
  }

  if (!isSetup) {
    return <Onboarding onComplete={() => checkSetup()} />
  }

  return <Dashboard />
}
