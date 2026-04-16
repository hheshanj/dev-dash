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

export async function togglePin(id, pinned) {
  const { data } = await axios.patch(`/api/projects/${id}/pin`, { pinned })
  return data
}

export async function updateNotes(id, notes) {
  const { data } = await axios.patch(`/api/projects/${id}/notes`, { notes })
  return data
}
