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
