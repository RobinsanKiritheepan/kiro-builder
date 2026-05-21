import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

const VIEWS = [
  {
    id: 'preview',
    label: 'Preview',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    id: 'code',
    label: 'Code',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    id: 'cloud',
    label: 'Cloud',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
]

const DEVICE_ICONS = {
  desktop: (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  tablet: (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  mobile: (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
}
const DEVICE_MODES = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet',  label: 'Tablet'  },
  { id: 'mobile',  label: 'Mobile'  },
]

export default function TopBar({ mainView, onMainView, projectName, onProjectName, apiOnline, onGitHub, ghStatus, darkMode, onDarkMode, onMenuOpen, branchName, changesCount, isMobile = false, previewDevice = 'desktop', onPreviewDevice, onGoHome, hasCode = false, onOpenProjectManager, activeProject }) {
  const { user, logout, isAuthenticated } = useAuth()
  const [editing, setEditing]   = useState(false)
  const [ghOpen, setGhOpen]     = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [repo, setRepo]         = useState('')
  const [token, setToken]       = useState('')
  const [msg, setMsg]           = useState('feat: Kiro Builder update')
  const [confirmHome, setConfirmHome] = useState(false)

  const handleGoHome = () => {
    if (hasCode) {
      setConfirmHome(true)
    } else {
      onGoHome?.()
    }
  }

  const handlePush = () => {
    if (!repo || !token) return
    onGitHub({ repo, token, message: msg })
    setGhOpen(false)
  }

  return (
    <>
      <header className="flex items-center h-[52px] px-4 flex-shrink-0 bg-kiro-bg border-b border-kiro-border kiro-header-shadow">

        {/* ── Left: hamburger (mobile) + logo + project ── */}
        <div className="flex items-center gap-3 flex-shrink-0 md:w-[380px]">
          {/* Hamburger — visible sur mobile seulement */}
          {isMobile && <button
            onClick={onMenuOpen}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-kiro-subtle hover:text-kiro-muted hover:bg-kiro-panel2 border border-kiro-border transition-all"
            title="Open sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>}

          {/* Home button */}
          <button
            onClick={handleGoHome}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-kiro-muted hover:text-kiro-text hover:bg-kiro-panel2 transition-all flex-shrink-0"
            title="Back to Home"
            style={{ fontSize: 12, fontFamily: 'system-ui, sans-serif', fontWeight: 500, border: 'none', cursor: 'pointer', background: 'transparent' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            {!isMobile && <span>Home</span>}
          </button>

          {/* Separator */}
          <div className="w-px h-4 bg-kiro-border flex-shrink-0" />

          {/* Logo mark */}
          <div className="w-7 h-7 rounded-lg bg-kiro-accent flex items-center justify-center text-white flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 2 9 7 9 10c0 1.5.8 2.5 2 3-.8-2 0-5 1-7 1 2 1.8 5 1 7 1.2-.5 2-1.5 2-3 0-3-3-8-3-8z"/><path d="M6 8c0 0-1 5 1 7.5 1 1.2 2.2 1.5 3.2 1-2-.5-3.5-2.5-2.8-5 .5 2 2 3.8 4 3.8-1-1-2.5-2.5-2-4.5C8.5 8 6 8 6 8z" opacity=".85"/><path d="M18 8c0 0 1 5-1 7.5-1 1.2-2.2 1.5-3.2 1 2-.5 3.5-2.5 2.8-5-.5 2-2 3.8-4 3.8 1-1 2.5-2.5 2-4.5C15.5 8 18 8 18 8z" opacity=".85"/></svg>
          </div>
          <span className="font-semibold text-[13px] text-kiro-text tracking-tight">
            KIRO
          </span>

          {/* Project name / Project button */}
          <div className="flex items-center gap-3">
            <div className="w-px h-4 bg-kiro-border flex-shrink-0" />
            {activeProject ? (
              /* Active project — click to open manager */
              <button
                onClick={() => onOpenProjectManager?.()}
                className="flex items-center gap-1.5 text-[13px] font-sans font-medium text-kiro-muted hover:text-kiro-text transition-colors max-w-[200px]"
                title="Gérer les projets"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span className="truncate">{projectName}</span>
                <svg
                  className="w-2.5 h-2.5 opacity-50 flex-shrink-0"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            ) : editing ? (
              <input
                autoFocus
                value={projectName}
                onChange={e => onProjectName(e.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={e => e.key === 'Enter' && setEditing(false)}
                className="bg-transparent border-b border-kiro-accent text-[13px] text-kiro-text outline-none font-sans max-w-[200px] pb-0.5"
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-[13px] text-kiro-muted hover:text-kiro-text transition-colors font-sans truncate max-w-[200px] flex items-center gap-1.5 group"
              >
                {projectName}
                <svg
                  className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-all flex-shrink-0"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}

            {/* Nouveau projet button */}
            {onOpenProjectManager && (
              <button
                onClick={() => onOpenProjectManager()}
                title="Gérer les projets"
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-kiro-border bg-kiro-panel2 text-kiro-subtle hover:text-kiro-muted hover:border-kiro-border2 transition-all font-sans"
                style={{ flexShrink: 0 }}
              >
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                {!isMobile && <span>Projets</span>}
              </button>
            )}
          </div>
        </div>

        {/* ── Center: tabs + Stack button — masqué sur mobile ── */}
        {!isMobile && (
          <div className="flex-1 flex justify-center items-center gap-2">
            {/* View tabs pill */}
            <div className="flex items-center bg-kiro-panel2 rounded-pill p-1 gap-0.5">
              {VIEWS.map(v => {
                const active = mainView === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => onMainView(v.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-[12px] font-medium font-sans transition-all duration-150 ${
                      active
                        ? 'bg-kiro-accent text-white'
                        : 'text-kiro-muted hover:text-kiro-text'
                    }`}
                  >
                    {v.icon}
                    {v.label}
                  </button>
                )
              })}
            </div>

          </div>
        )}

        {/* ── Mobile center: flex spacer ── */}
        {isMobile && <div className="flex-1" />}

        {/* ── Right: status + publish ── */}
        <div className="flex items-center gap-2.5">
          {/* Branch indicator — code view only */}
          {mainView === 'code' && (
            <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-pill border border-kiro-border bg-kiro-panel2 text-kiro-muted font-mono">
              <span>⎇</span>
              <span>{branchName || 'main'}</span>
              {changesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {changesCount}
                </span>
              )}
            </div>
          )}
          {/* Device mode badge — preview view, desktop layout only */}
          {!isMobile && mainView === 'preview' && onPreviewDevice && (
            <button
              onClick={() => {
                const idx = DEVICE_MODES.findIndex(d => d.id === previewDevice)
                onPreviewDevice(DEVICE_MODES[(idx + 1) % DEVICE_MODES.length].id)
              }}
              title="Cycle preview device (D/T/M)"
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-pill border border-kiro-border bg-kiro-panel2 text-kiro-muted hover:text-kiro-text hover:border-kiro-border2 transition-all font-sans"
            >
              {DEVICE_ICONS[previewDevice]}
              <span className="font-medium capitalize">{previewDevice}</span>
            </button>
          )}
          {/* API status */}
          <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-pill border font-sans ${
            apiOnline
              ? 'bg-kiro-panel2 border-kiro-border text-kiro-green'
              : 'bg-kiro-panel2 border-kiro-border text-kiro-red'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              apiOnline ? 'bg-kiro-green' : 'bg-kiro-red'
            }`} />
            {apiOnline ? 'API' : 'Offline'}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={() => onDarkMode(d => !d)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-kiro-subtle hover:text-kiro-muted hover:bg-kiro-panel2 border border-kiro-border transition-all"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              /* Sun icon — click to go light */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4"/>
                <line x1="12" y1="2" x2="12" y2="4"/>
                <line x1="12" y1="20" x2="12" y2="22"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="2" y1="12" x2="4" y2="12"/>
                <line x1="20" y1="12" x2="22" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              /* Moon icon — click to go dark */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* User avatar */}
          {isAuthenticated && user && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-kiro-panel2 transition-all"
                title={user.email}
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="w-6 h-6 rounded-full border border-kiro-border"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-kiro-accent flex items-center justify-center text-white text-[10px] font-bold">
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] text-kiro-muted font-medium hidden md:inline max-w-[80px] truncate">
                  {user.name || user.email?.split('@')[0]}
                </span>
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-kiro-panel border border-kiro-border rounded-lg shadow-lg py-1 text-[12px]">
                    <div className="px-3 py-2 border-b border-kiro-border">
                      <div className="font-semibold text-kiro-text truncate">{user.name}</div>
                      <div className="text-kiro-muted truncate text-[11px]">{user.email}</div>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); logout() }}
                      className="w-full text-left px-3 py-2 text-red-400 hover:bg-kiro-panel2 flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Se deconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Publish */}
          <button
            onClick={() => setGhOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] rounded-pill border border-kiro-border text-kiro-muted hover:border-kiro-border2 hover:text-kiro-text bg-kiro-bg font-sans font-medium transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Publish
            {ghStatus === 'pushing' && <span className="text-kiro-yellow animate-pulse ml-0.5">…</span>}
            {ghStatus === 'ok'      && <span className="text-kiro-green ml-0.5">✓</span>}
          </button>
        </div>
      </header>


      {/* ── GitHub modal ── */}
      {ghOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
          onClick={() => setGhOpen(false)}
        >
          <div
            className="w-[400px] rounded-2xl p-6 bg-kiro-bg border border-kiro-border"
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-kiro-accent flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-[14px] text-kiro-text font-sans">Push to GitHub</h3>
            </div>

            {[
              { label: 'Repository', val: repo,  set: setRepo,  placeholder: 'username/repo-name' },
              { label: 'Personal Access Token', val: token, set: setToken, placeholder: 'ghp_…', type: 'password' },
              { label: 'Commit message', val: msg, set: setMsg, placeholder: 'feat: …' },
            ].map(({ label, val, set, placeholder, type }) => (
              <div key={label} className="mb-4">
                <label className="text-[11px] text-kiro-muted font-sans mb-1.5 block font-medium uppercase tracking-wide">{label}</label>
                <input
                  type={type || 'text'}
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-kiro-text outline-none font-mono transition-all bg-kiro-bg border border-kiro-border focus:border-kiro-accent"
                />
              </div>
            ))}

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setGhOpen(false)}
                className="flex-1 py-2.5 rounded-pill text-[12px] text-kiro-muted hover:text-kiro-text font-sans border border-kiro-border hover:border-kiro-border2 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePush}
                className="flex-1 py-2.5 rounded-pill bg-kiro-accent text-white text-[12px] font-medium font-sans hover:bg-kiro-accent2 transition-all"
              >
                Push to GitHub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm go home dialog ── */}
      {confirmHome && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 250,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setConfirmHome(false)}
        >
          <div
            className="modal-animate"
            style={{
              width: 'min(400px, 92vw)', borderRadius: 16, padding: '24px',
              background: 'var(--kbg)', border: '1px solid var(--kborder)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ktext)', margin: '0 0 8px', fontFamily: "'Syne', sans-serif" }}>
              Retourner à l'accueil ?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--kmuted)', margin: '0 0 20px', fontFamily: 'system-ui', lineHeight: 1.6 }}>
              Ton projet sera sauvegardé automatiquement.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmHome(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  fontSize: 12, fontWeight: 500, fontFamily: 'system-ui',
                  border: '1px solid var(--kborder)', background: 'transparent',
                  color: 'var(--kmuted)', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => { setConfirmHome(false); onGoHome?.() }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  fontSize: 12, fontWeight: 600, fontFamily: 'system-ui',
                  border: 'none', background: 'var(--kaccent)', color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Retourner
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
