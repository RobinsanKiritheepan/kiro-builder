/**
 * Auth-aware fetch wrapper.
 * Reads JWT from localStorage and attaches Authorization header.
 * Works outside React components (no hooks needed).
 */
export default function authFetch(url, opts = {}) {
  const token = localStorage.getItem('kiro-auth-token')
  const headers = { ...(opts.headers || {}) }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(url, { ...opts, headers })
}
