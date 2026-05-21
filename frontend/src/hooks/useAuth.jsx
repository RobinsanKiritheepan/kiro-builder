import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'kiro-auth-token'
const USER_KEY = 'kiro-auth-user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null)
  const [loading, setLoading] = useState(true)
  const [googleClientId, setGoogleClientId] = useState('')
  const [authEnabled, setAuthEnabled] = useState(false)

  // Fetch auth config from backend
  useEffect(() => {
    fetch('/api/auth/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setGoogleClientId(data.google_client_id || '')
          setAuthEnabled(data.auth_enabled || false)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Verify token on mount
  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('invalid')
        return r.json()
      })
      .then(data => {
        setUser(data.user)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      })
      .catch(() => { logout() })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((tokenStr, userData) => {
    setToken(tokenStr)
    setUser(userData)
    localStorage.setItem(TOKEN_KEY, tokenStr)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  // Google OAuth callback handler
  const handleGoogleAuth = useCallback(async (code, redirectUri) => {
    const resp = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Auth failed' }))
      throw new Error(err.detail || 'Auth failed')
    }
    const data = await resp.json()
    login(data.token, data.user)
    return data
  }, [login])

  // Helper: get auth headers for API calls
  const authHeaders = useCallback(() => {
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }, [token])

  return (
    <AuthContext.Provider value={{
      user, token, loading, authEnabled, googleClientId,
      login, logout, handleGoogleAuth, authHeaders,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

export default AuthContext
