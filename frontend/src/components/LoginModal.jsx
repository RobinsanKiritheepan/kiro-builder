import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const { googleClientId, authEnabled, login } = useAuth()
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [devLoading, setDevLoading] = useState(false)

  if (!isOpen) return null

  const redirectUri = window.location.origin + '/auth/callback'

  const startGoogleLogin = () => {
    if (!googleClientId) {
      setError('Google OAuth non configuré — utilise le login par email ci-dessous')
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

  const handleDevLogin = async () => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Entre une adresse email valide')
      return
    }
    setError('')
    setDevLoading(true)
    try {
      const r = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: 'Login failed' }))
        throw new Error(err.detail || 'Login failed')
      }
      const data = await r.json()
      login(data.token, data.user)
      sessionStorage.removeItem('kiro-pending-prompt')
      onSuccess?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setDevLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleDevLogin()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'lmFadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, maxWidth: '92vw', padding: '36px 32px',
          background: 'var(--kbg)',
          border: '1px solid var(--kborder)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(225,29,72,0.08)',
          animation: 'lmSlideUp 0.25s ease',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid var(--kborder)',
            background: 'var(--kpanel2)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--ksubtle)',
          }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #E11D48, #D97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(225,29,72,0.40)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C12 2 9 7 9 10c0 1.5.8 2.5 2 3-.8-2 0-5 1-7 1 2 1.8 5 1 7 1.2-.5 2-1.5 2-3 0-3-3-8-3-8z"/>
                <path d="M6 8c0 0-1 5 1 7.5 1 1.2 2.2 1.5 3.2 1-2-.5-3.5-2.5-2.8-5 .5 2 2 3.8 4 3.8-1-1-2.5-2.5-2-4.5C8.5 8 6 8 6 8z" opacity=".85"/>
                <path d="M18 8c0 0 1 5-1 7.5-1 1.2-2.2 1.5-3.2 1 2-.5 3.5-2.5 2.8-5-.5 2-2 3.8-4 3.8 1-1 2.5-2.5 2-4.5C15.5 8 18 8 18 8z" opacity=".85"/>
              </svg>
            </div>
            <span style={{
              fontSize: 22, fontWeight: 800,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: '0.06em',
              background: 'linear-gradient(90deg, #E11D48, #D97706)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>KIRO</span>
          </div>
          <p style={{
            color: 'var(--ktext)', fontSize: 15, fontWeight: 600,
            margin: '14px 0 0', lineHeight: 1.4,
            fontFamily: "'Syne', sans-serif",
          }}>
            Connecte-toi pour générer
          </p>
          <p style={{
            color: 'var(--ksubtle)', fontSize: 12,
            margin: '6px 0 0', lineHeight: 1.4, fontFamily: 'system-ui',
          }}>
            Tes projets seront sauvegardés dans ton espace
          </p>
        </div>

        {/* Google Sign-in (primary) */}
        {authEnabled && (
          <>
            <button
              onClick={startGoogleLogin}
              style={{
                width: '100%', padding: '13px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: 'linear-gradient(135deg, #E11D48, #D97706)',
                color: '#fff', fontWeight: 700,
                border: 'none', borderRadius: 12, cursor: 'pointer',
                fontSize: 13, fontFamily: "'Syne', system-ui, sans-serif",
                transition: 'all 0.2s',
                boxShadow: '0 4px 18px rgba(225,29,72,0.35)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(225,29,72,0.50)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(225,29,72,0.35)'; e.currentTarget.style.transform = 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="rgba(255,255,255,0.9)"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="rgba(255,255,255,0.85)"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="rgba(255,255,255,0.8)"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="rgba(255,255,255,0.9)"/>
              </svg>
              Se connecter avec Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--kborder)' }} />
              <span style={{ fontSize: 10, color: 'var(--ksubtle)', fontFamily: 'system-ui', fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'var(--kborder)' }} />
            </div>
          </>
        )}

        {/* Email login (dev mode or fallback) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ton@email.com"
            autoFocus={!authEnabled}
            style={{
              flex: 1, padding: '12px 14px',
              background: 'var(--kpanel2)',
              border: '1px solid var(--kborder)',
              borderRadius: 10, color: 'var(--ktext)',
              fontSize: 13, fontFamily: 'system-ui',
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(225,29,72,0.4)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--kborder)'}
          />
          <button
            onClick={handleDevLogin}
            disabled={devLoading}
            style={{
              padding: '12px 18px',
              background: 'linear-gradient(135deg, #E11D48, #D97706)',
              color: '#fff', fontWeight: 700,
              border: 'none', borderRadius: 10, cursor: 'pointer',
              fontSize: 12, fontFamily: "'Syne', system-ui, sans-serif",
              transition: 'all 0.2s', flexShrink: 0,
              opacity: devLoading ? 0.6 : 1,
              boxShadow: '0 2px 10px rgba(225,29,72,0.30)',
            }}
            onMouseEnter={e => { if (!devLoading) e.currentTarget.style.boxShadow = '0 4px 18px rgba(225,29,72,0.45)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(225,29,72,0.30)' }}
          >
            {devLoading ? '...' : 'Go'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(225,29,72,0.06)',
            border: '1px solid rgba(225,29,72,0.2)',
            borderRadius: 10, color: '#E11D48',
            fontSize: 12, lineHeight: 1.5, fontFamily: 'system-ui',
          }}>
            {error}
          </div>
        )}

        <p style={{
          textAlign: 'center',
          color: 'var(--ksubtle)', fontSize: 11, margin: '16px 0 0',
          fontFamily: 'system-ui',
        }}>
          Gratuit · Tes projets restent privés
        </p>
      </div>

      <style>{`
        @keyframes lmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lmSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  )
}
