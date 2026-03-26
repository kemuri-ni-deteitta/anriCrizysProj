import { CONFIG } from './config'

// Generic fetch wrapper
async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body !== null) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || 'API error')
  }
  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path)
}
