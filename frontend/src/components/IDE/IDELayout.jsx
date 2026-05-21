import { useState, useRef, useCallback, useLayoutEffect } from 'react'
import { IDEProvider, useIDE } from './IDEContext.jsx'
import FileExplorer from './FileExplorer.jsx'
import CodeEditor from './CodeEditor.jsx'
import GitPanel from './GitPanel.jsx'

const ACTIVITY = [
  {
    id: 'explorer', title: 'Explorer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'search', title: 'Search',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    id: 'git', title: 'Source Control',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="18" cy="18" r="3"/>
        <circle cx="6" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <line x1="6" y1="9" x2="6" y2="15"/>
        <path d="M18 9a9 9 0 0 0-9 9"/>
      </svg>
    ),
  },
  {
    id: 'settings', title: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

function Divider({ onMouseDown, horizontal = false }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: horizontal ? '100%' : 4,
        height: horizontal ? 4 : '100%',
        flexShrink: 0,
        cursor: horizontal ? 'row-resize' : 'col-resize',
        background: hover ? '#6366f140' : 'transparent',
        transition: 'background 0.15s',
        zIndex: 10,
      }}
    />
  )
}

function IDEInner({ onGitPush, ghStatus, onPushChanges }) {
  const { gitChanges, saveNow } = useIDE()
  const [activePanel, setActivePanel] = useState('explorer')
  const [leftOpen, setLeftOpen]       = useState(true)
  const [rightOpen, setRightOpen]     = useState(false)
  const [leftW, setLeftW]             = useState(220)
  const [rightW, setRightW]           = useState(260)
  const containerRef = useRef(null)

  // Auto-collapse left panel when IDE is narrow
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([{ contentRect: { width } }]) => {
      if (width < 700) setLeftOpen(false)
      else if (width >= 700) setLeftOpen(prev => prev === false ? false : true)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handleActivityClick = (id) => {
    if (id === 'explorer' || id === 'search') {
      if (activePanel === id && leftOpen) setLeftOpen(false)
      else { setActivePanel(id); setLeftOpen(true) }
    } else if (id === 'git') {
      if (activePanel === 'git' && rightOpen) setRightOpen(false)
      else { setActivePanel('git'); setRightOpen(true) }
    } else {
      setActivePanel(id)
    }
  }

  const startLeftResize = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftW
    const onMove = (ev) => setLeftW(Math.max(160, Math.min(450, startW + ev.clientX - startX)))
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [leftW])

  const startRightResize = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = rightW
    const onMove = (ev) => setRightW(Math.max(200, Math.min(450, startW - (ev.clientX - startX))))
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [rightW])

  const changesCount = gitChanges.size

  return (
    <div ref={containerRef} style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* Activity bar */}
      <div style={{
        width: 40, flexShrink: 0,
        background: 'var(--kpanel)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: 4, gap: 1,
        borderRight: '1px solid var(--kborder)',
      }}>
        {ACTIVITY.map(item => {
          const isActive = activePanel === item.id
          const isLeft   = item.id === 'explorer' || item.id === 'search'
          const isRight  = item.id === 'git'
          const panelOpen = isLeft ? leftOpen : isRight ? rightOpen : false
          const badge    = item.id === 'git' && changesCount > 0 ? changesCount : null

          return (
            <button
              key={item.id}
              title={item.title}
              onClick={() => handleActivityClick(item.id)}
              style={{
                width: 36, height: 36, border: 'none',
                borderLeft: (isActive && panelOpen) ? '2px solid var(--kaccent)' : '2px solid transparent',
                background: (isActive && panelOpen) ? 'rgba(225,29,72,0.08)' : 'transparent',
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                color: (isActive && panelOpen) ? 'var(--kaccent)' : 'var(--ksubtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!(isActive && panelOpen)) e.currentTarget.style.color = 'var(--kmuted)' }}
              onMouseLeave={e => { if (!(isActive && panelOpen)) e.currentTarget.style.color = 'var(--ksubtle)' }}
            >
              {item.icon}
              {badge && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  background: 'var(--kaccent)', color: 'var(--kbg)',
                  fontSize: 8, fontWeight: 700, borderRadius: 10,
                  padding: '0 3px', minWidth: 13, textAlign: 'center',
                  fontFamily: 'sans-serif', lineHeight: '13px',
                }}>{badge}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Left panel */}
      {leftOpen && (activePanel === 'explorer' || activePanel === 'search') && (
        <>
          <div style={{ width: leftW, flexShrink: 0, overflow: 'hidden', borderRight: '1px solid var(--kborder)' }}>
            <FileExplorer />
          </div>
          <Divider onMouseDown={startLeftResize} />
        </>
      )}

      {/* Center — code editor */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minWidth: 0 }}>
        <CodeEditor onPushChanges={onPushChanges} onSaveNow={saveNow} />
      </div>

      {/* Right panel — git */}
      {rightOpen && activePanel === 'git' && (
        <>
          <Divider onMouseDown={startRightResize} />
          <div style={{ width: rightW, flexShrink: 0, overflow: 'hidden', borderLeft: '1px solid var(--kborder)' }}>
            <GitPanel onPush={onGitPush} ghStatus={ghStatus} />
          </div>
        </>
      )}
    </div>
  )
}

export default function IDELayout({ files, onFilesChange, onGitPush, ghStatus, onPushChanges, projectId, onSaveSignal }) {
  return (
    <IDEProvider files={files} onFilesChange={onFilesChange} projectId={projectId} onSaveSignal={onSaveSignal}>
      <IDEInner onGitPush={onGitPush} ghStatus={ghStatus} onPushChanges={onPushChanges} />
    </IDEProvider>
  )
}
