import { useState } from 'react'
import { useIDE } from './IDEContext.jsx'
import { fileKey } from './utils.jsx'

const IND_COLOR = { M: '#f59e0b', A: '#10b981', D: '#ef4444' }

function ChangeItem({ fileKey: k, files, indicator, staged, onStage, onUnstage, onDiscard }) {
  const [hover, setHover] = useState(false)
  const f = files.find(f => fileKey(f) === k)
  if (!f) return null
  const color = IND_COLOR[indicator] || '#9ca3af'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', padding: '4px 12px',
        fontSize: 12, gap: 6,
        background: hover ? 'var(--kpanel2)' : 'transparent',
        borderRadius: 4, transition: 'background 0.1s',
      }}
    >
      <span style={{ color, fontWeight: 700, width: 12, flexShrink: 0, fontFamily: 'monospace', fontSize: 11 }}>
        {indicator || '?'}
      </span>
      <span style={{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: 'var(--ktext)', fontFamily: 'Inter, sans-serif',
      }}>
        {f.name}
      </span>
      <span style={{ color: 'var(--ksubtle)', fontSize: 10, flexShrink: 0 }}>{f.path}</span>
      {hover && (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {!staged && onStage && (
            <button
              title="Stage change" onClick={() => onStage(k)}
              style={smallBtn('#10b981')}
            >+</button>
          )}
          {staged && onUnstage && (
            <button
              title="Unstage" onClick={() => onUnstage(k)}
              style={smallBtn('#f59e0b')}
            >−</button>
          )}
          {onDiscard && !staged && (
            <button
              title="Discard change" onClick={() => onDiscard(k)}
              style={smallBtn('#ef4444')}
            >↺</button>
          )}
        </div>
      )}
    </div>
  )
}

function smallBtn(color) {
  return {
    width: 18, height: 18,
    border: `1px solid ${color}40`,
    background: `${color}12`,
    borderRadius: 3, cursor: 'pointer',
    color, fontSize: 13, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 1,
  }
}

function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, width: '100%',
          padding: '5px 10px', border: 'none', background: 'none',
          cursor: 'pointer', textAlign: 'left',
          fontSize: 11, fontWeight: 600, color: 'var(--kmuted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--kpanel2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <svg
          width="8" height="8" viewBox="0 0 10 10" fill="currentColor"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M3 2l4 3-4 3V2z"/>
        </svg>
        <span style={{ flex: 1 }}>{title}</span>
        {count > 0 && (
          <span style={{
            background: '#6366f1', color: 'white',
            fontSize: 10, borderRadius: 10, padding: '0 5px',
            fontWeight: 700, minWidth: 16, textAlign: 'center',
          }}>{count}</span>
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

export default function GitPanel({ onPush, ghStatus }) {
  const {
    files, gitChanges, stagedFiles,
    stageFile, unstageFile, stageAll, discardChange,
    commit, commitHistory, branchName,
  } = useIDE()

  const [commitMsg, setCommitMsg] = useState('')
  const [showGH, setShowGH]       = useState(false)
  const [ghRepo, setGhRepo]       = useState('')
  const [ghToken, setGhToken]     = useState('')

  const changedKeys = [...gitChanges].filter(k => !stagedFiles.has(k))
  const stagedKeys  = [...stagedFiles]

  const handleCommit = () => {
    if (!commitMsg.trim() || !stagedKeys.length) return
    commit(commitMsg.trim())
    setCommitMsg('')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--kbg)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 10px', borderBottom: '1px solid var(--kborder)',
        fontSize: 11, fontWeight: 600, color: 'var(--kmuted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="18" r="3"/>
            <circle cx="6" cy="6" r="3"/>
            <circle cx="6" cy="18" r="3"/>
            <line x1="6" y1="9" x2="6" y2="15"/>
            <path d="M18 9a9 9 0 0 0-9 9"/>
          </svg>
          Source Control
        </div>
        <span style={{
          background: 'var(--kpanel2)', borderRadius: 10,
          padding: '1px 7px', fontSize: 10, color: 'var(--ktext)',
          fontFamily: 'monospace', letterSpacing: 0,
        }}>
          ⎇ {branchName}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }} className="cv-scrollbar">

        {/* Commit area */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--kborder)' }}>
          <textarea
            value={commitMsg}
            onChange={e => setCommitMsg(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleCommit() }}
            placeholder="Commit message…"
            rows={2}
            style={{
              width: '100%', padding: '6px 8px', fontSize: 12,
              border: '1px solid var(--kborder)', borderRadius: 6,
              fontFamily: 'Inter, sans-serif', resize: 'none',
              outline: 'none', color: 'var(--ktext)', lineHeight: 1.5,
              background: 'var(--kpanel2)',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e  => e.target.style.borderColor = 'var(--kborder)'}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button
              onClick={stageAll}
              disabled={!changedKeys.length}
              style={{
                flex: 1, padding: '5px 0', fontSize: 11,
                border: '1px solid var(--kborder)', borderRadius: 6,
                cursor: changedKeys.length ? 'pointer' : 'not-allowed',
                background: 'var(--kbg)', color: 'var(--kmuted)',
                fontFamily: 'Inter, sans-serif',
                opacity: changedKeys.length ? 1 : 0.4,
              }}
            >
              Stage All
            </button>
            <button
              onClick={handleCommit}
              disabled={!commitMsg.trim() || !stagedKeys.length}
              style={{
                flex: 1, padding: '5px 0', fontSize: 11, border: 'none',
                borderRadius: 6,
                cursor: (commitMsg.trim() && stagedKeys.length) ? 'pointer' : 'not-allowed',
                background: (commitMsg.trim() && stagedKeys.length) ? '#6366f1' : 'var(--kpanel2)',
                color: (commitMsg.trim() && stagedKeys.length) ? 'white' : 'var(--ksubtle)',
                fontFamily: 'Inter, sans-serif', fontWeight: 600,
              }}
            >
              Commit
            </button>
          </div>
        </div>

        {/* Staged changes */}
        <Section title="Staged" count={stagedKeys.length}>
          {stagedKeys.length === 0 ? (
            <p style={{ color: 'var(--ksubtle)', fontSize: 11, padding: '4px 14px 8px', fontFamily: 'Inter, sans-serif' }}>
              No staged changes
            </p>
          ) : (
            stagedKeys.map(k => (
              <ChangeItem
                key={k} fileKey={k} files={files} indicator="M"
                staged onUnstage={unstageFile}
              />
            ))
          )}
        </Section>

        {/* Unstaged changes */}
        <Section title="Changes" count={changedKeys.length}>
          {changedKeys.length === 0 ? (
            <p style={{ color: 'var(--ksubtle)', fontSize: 11, padding: '4px 14px 8px', fontFamily: 'Inter, sans-serif' }}>
              No changes
            </p>
          ) : (
            changedKeys.map(k => (
              <ChangeItem
                key={k} fileKey={k} files={files} indicator="M"
                onStage={stageFile} onDiscard={discardChange}
              />
            ))
          )}
        </Section>

        {/* Recent commits */}
        <Section title="Commits" count={0}>
          {commitHistory.length === 0 ? (
            <p style={{ color: 'var(--ksubtle)', fontSize: 11, padding: '4px 14px 8px', fontFamily: 'Inter, sans-serif' }}>
              No commits yet
            </p>
          ) : (
            commitHistory.slice(0, 12).map(c => (
              <div
                key={c.id}
                style={{ padding: '5px 14px 4px', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--kpanel2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  color: 'var(--ktext)', fontWeight: 500, fontSize: 12,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {c.message}
                </div>
                <div style={{ color: 'var(--ksubtle)', fontSize: 10, marginTop: 1, fontFamily: 'Inter, sans-serif' }}>
                  {new Date(c.timestamp).toLocaleString()} · {(c.files || []).slice(0, 2).join(', ')}
                </div>
              </div>
            ))
          )}
        </Section>

        {/* GitHub */}
        <Section title="GitHub" count={0} defaultOpen={false}>
          {!showGH ? (
            <div style={{ padding: '4px 14px 10px' }}>
              <button
                onClick={() => setShowGH(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', fontSize: 11,
                  border: '1px solid var(--kborder)', borderRadius: 6,
                  cursor: 'pointer', background: 'var(--kbg)',
                  color: 'var(--ktext)', fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--kborder)'}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                Connect GitHub
              </button>
            </div>
          ) : (
            <div style={{ padding: '4px 14px 10px' }}>
              {[
                { label: 'Repository', val: ghRepo, set: setGhRepo, placeholder: 'user/repo' },
                { label: 'Token',      val: ghToken, set: setGhToken, placeholder: 'ghp_…', type: 'password' },
              ].map(({ label, val, set, placeholder, type }) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <div style={{
                    fontSize: 10, color: 'var(--ksubtle)', marginBottom: 3,
                    fontFamily: 'Inter, sans-serif', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{label}</div>
                  <input
                    type={type || 'text'} value={val}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '4px 8px', fontSize: 11,
                      border: '1px solid var(--kborder)', borderRadius: 5,
                      fontFamily: 'monospace', outline: 'none', color: 'var(--ktext)',
                      background: 'var(--kpanel2)',
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e  => e.target.style.borderColor = 'var(--kborder)'}
                  />
                </div>
              ))}
              <button
                onClick={() => onPush?.({ repo: ghRepo, token: ghToken })}
                style={{
                  width: '100%', padding: '6px 0', fontSize: 11,
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: '#6366f1', color: 'white',
                  fontFamily: 'Inter, sans-serif', fontWeight: 600,
                  marginTop: 4,
                }}
              >
                {ghStatus === 'pushing' ? 'Pushing…' : ghStatus === 'ok' ? '✓ Pushed' : 'Push to GitHub'}
              </button>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
