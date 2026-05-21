import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export default function LoginPage() {
  const { googleClientId, handleGoogleAuth, authEnabled } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const processedRef = useRef(false)

  // Redirect URI — same origin + /auth/callback
  const redirectUri = window.location.origin + '/auth/callback'

  // Handle OAuth callback (code in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code && !processedRef.current) {
      processedRef.current = true
      setLoading(true)
      setError('')
      handleGoogleAuth(code, redirectUri)
        .then(() => {
          // Clear URL params
          window.history.replaceState({}, '', '/')
        })
        .catch(err => {
          setError(err.message || 'Authentication failed')
          setLoading(false)
        })
    }
  }, [])

  const startGoogleLogin = () => {
    if (!googleClientId) {
      setError('Google OAuth not configured. Add GOOGLE_CLIENT_ID to backend/.env')
      return
    }
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    })
    window.location.href = `${GOOGLE_AUTH_URL}?${params}`
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080810 0%, #0d0d1a 50%, #1a0a2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: 400, maxWidth: '90vw', padding: '48px 40px',
        background: 'rgba(13,13,26,0.95)',
        border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 100px rgba(124,58,237,0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            marginBottom: 8,
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#7c3aed"/>
              <path d="M10 22V10l6 4-6 4z" fill="white" opacity="0.9"/>
              <path d="M16 22V10l6 4-6 4z" fill="white" opacity="0.6"/>
            </svg>
            <span style={{
              fontSize: 28, fontWeight: 800, color: '#fff',
              fontFamily: 'Syne, Inter, sans-serif',
              letterSpacing: '-0.02em',
            }}>KIRO</span>
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.45)', fontSize: 13,
            margin: '8px 0 0', lineHeight: 1.5,
          }}>
            AI-powered web app builder
          </p>
        </div>

        {/* Google Sign-in */}
        <button
          onClick={startGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: '#fff', color: '#1a1a1a',
            border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
            fontSize: 14, fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
        >
          {loading ? (
            <div style={{
              width: 20, height: 20, border: '2px solid #ddd',
              borderTopColor: '#7c3aed', borderRadius: '50%',
              animation: 'kiro-spin 0.6s linear infinite',
            }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? 'Connexion en cours...' : 'Se connecter avec Google'}
        </button>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, color: '#f87171',
            fontSize: 12, lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Info */}
        {!authEnabled && !error && (
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 8, color: 'rgba(255,255,255,0.5)',
            fontSize: 11, lineHeight: 1.6,
          }}>
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Setup requis :</strong> Ajoute{' '}
            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 3 }}>
              GOOGLE_CLIENT_ID
            </code>{' '}
            et{' '}
            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 3 }}>
              GOOGLE_CLIENT_SECRET
            </code>{' '}
            dans <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 3 }}>backend/.env</code>
          </div>
        )}

        {/* Footer */}
        <p style={{
          textAlign: 'center', marginTop: 28,
          color: 'rgba(255,255,255,0.25)', fontSize: 11,
        }}>
          Tes projets sont isoles dans un dossier personnel
        </p>
      </div>

      <style>{`@keyframes kiro-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
