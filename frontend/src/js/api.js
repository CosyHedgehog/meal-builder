async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* empty / non-JSON body */
  }
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`)
  return body
}

export const authApi = {
  me: () => request('/api/me'),
  login: (username, password) => request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  signup: (username, password) => request('/api/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/logout', { method: 'POST', body: '{}' }),
}

export const dataApi = {
  load: () => request('/api/data'),
  save: (data) => request('/api/data', { method: 'PUT', body: JSON.stringify(data) }),
}