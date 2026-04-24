import axios from 'axios'

export async function fetchProjects() {
  const { data } = await axios.get('/api/projects')
  return data
}

export async function fetchProject(id) {
  const { data } = await axios.get(`/api/projects/${id}`)
  return data
}

export async function analyzeProject(id) {
  const { data } = await axios.post(`/api/projects/${id}/analyze`)
  return data
}

export async function improveProject(id) {
  const { data } = await axios.post(`/api/projects/${id}/improve`)
  return data
}

export async function fetchProjectStats(id) {
  const { data } = await axios.get(`/api/projects/${id}/stats`)
  return data
}

export async function fetchAnalysisHistory(id) {
  const { data } = await axios.get(`/api/projects/${id}/history`)
  return data
}

export async function fetchCommits(id, { limit = 50, branch = 'HEAD' } = {}) {
  const { data } = await axios.get(`/api/projects/${id}/commits`, { params: { limit, branch } })
  return data
}

export async function fetchCommitDiff(id, hash) {
  const { data } = await axios.get(`/api/projects/${id}/commits/${hash}/diff`)
  return data
}

export async function fetchBranches(id) {
  const { data } = await axios.get(`/api/projects/${id}/branches`)
  return data
}

export async function togglePin(id, pinned) {
  const { data } = await axios.patch(`/api/projects/${id}/pin`, { pinned })
  return data
}

export async function updateNotes(id, notes) {
  const { data } = await axios.patch(`/api/projects/${id}/notes`, { notes })
  return data
}
