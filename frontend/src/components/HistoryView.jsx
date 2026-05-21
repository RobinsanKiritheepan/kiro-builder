import { useState } from 'react'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function modelLabel(m = '') {
  if (m === 'edit')                        return { text: 'Édition', cls: 'text-kiro-muted bg-kiro-panel2 border-kiro-border' }
  if (m.toLowerCase().includes('claude'))  return { text: 'Claude', cls: 'text-kiro-cyan bg-kiro-panel2 border-kiro-border' }
  if (m.toLowerCase().includes('ollama'))  return { text: 'Ollama', cls: 'text-kiro-green bg-kiro-panel2 border-kiro-border' }
  return { text: 'Demo', cls: 'text-kiro-subtle bg-kiro-panel2 border-kiro-border' }
}

/* ── Backup card ──────────────────────────────────────────── */
function BackupCard({ backup, onRestore, onDelete }) {
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      style={{
        border: '1px solid var(--kborder)',
        borderRadius: 12,
        background: 'var(--kbg)',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 99,
            background: 'rgba(225,29,72,0.12)', color: '#E11D48',
            border: '1px solid rgba(225,29,72,0.25)',
            fontFamily: 'system-ui', fontWeight: 600,
          }}>
            Backup
          </span>
          <span style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'system-ui' }}>
            {timeAgo(backup.created_at)}
          </span>
        </div>
        <p style={{
          fontSize: 13, color: 'var(--ktext)', margin: 0,
          fontFamily: 'system-ui', lineHeight: 1.4,
        }}>
          {backup.label || backup.id}
        </p>
      </div>
      <div style={{
        borderTop: '1px solid var(--kborder)',
        display: 'flex',
      }}>
        <button
          onClick={() => {
            if (confirmRestore) { onRestore(backup.id); setConfirmRestore(false) }
            else { setConfirmRestore(true); setTimeout(() => setConfirmRestore(false), 3000) }
          }}
          style={{
            flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 500, fontFamily: 'system-ui',
            background: 'transparent',
            color: confirmRestore ? '#E11D48' : 'var(--ksubtle)',
            transition: 'all 0.15s',
          }}
        >
          {confirmRestore ? 'Confirmer restauration' : 'Restaurer'}
        </button>
        <div style={{ width: 1, background: 'var(--kborder)' }} />
        <button
          onClick={() => {
            if (confirmDelete) { onDelete(backup.id); setConfirmDelete(false) }
            else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000) }
          }}
          style={{
            padding: '8px 14px', border: 'none', cursor: 'pointer',
            fontSize: 11, fontFamily: 'system-ui',
            background: 'transparent',
            color: confirmDelete ? '#ef4444' : 'var(--ksubtle)',
            transition: 'all 0.15s',
          }}
        >
          {confirmDelete ? 'Supprimer ?' : '✕'}
        </button>
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */
export default function HistoryView({
  history, onRollback,
  backups = [], onCreateBackup, onRestoreBackup, onDeleteBackup,
  projectId,
}) {
  const [confirmId, setConfirmId] = useState(null)
  const [tab, setTab] = useState('backups') // 'backups' | 'generations'
  const [creating, setCreating] = useState(false)

  const handleRollback = (commit) => {
    if (confirmId === commit.id) { onRollback(commit); setConfirmId(null) }
    else { setConfirmId(commit.id); setTimeout(() => setConfirmId(null), 3000) }
  }

  const handleCreateBackup = async () => {
    if (!onCreateBackup || creating) return
    setCreating(true)
    await onCreateBackup('Backup manuel')
    setCreating(false)
  }

  const isEmpty = backups.length === 0 && history.length === 0

  if (isEmpty && !projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-kiro-panel">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-kiro-bg border border-kiro-border"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <svg className="w-6 h-6 text-kiro-border2" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <p className="text-[13px] font-semibold text-kiro-muted font-sans mb-1">Aucun historique</p>
        <p className="text-[11px] text-kiro-subtle font-sans">Génère du code pour voir l'historique ici.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-kiro-panel">
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--kborder)',
        background: 'var(--kbg)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ktext)', fontFamily: "'Syne', system-ui" }}>
              Historique
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'system-ui' }}>
              {backups.length} backup{backups.length !== 1 ? 's' : ''} · {history.length} génération{history.length !== 1 ? 's' : ''}
            </p>
          </div>
          {projectId && onCreateBackup && (
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                background: creating ? 'var(--kpanel2)' : 'var(--kaccent)',
                color: creating ? 'var(--ksubtle)' : '#fff',
                border: 'none', cursor: creating ? 'default' : 'pointer',
                fontFamily: 'system-ui', transition: 'all 0.15s',
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {creating ? 'Création...' : 'Créer backup'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'var(--kpanel2)', borderRadius: 8, padding: 3, gap: 2,
        }}>
          {[
            { id: 'backups',     label: `Backups (${backups.length})` },
            { id: 'generations', label: `Générations (${history.length})` },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'system-ui',
                background: tab === id ? 'var(--kaccent)' : 'transparent',
                color: tab === id ? '#fff' : 'var(--ksubtle)',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ── Backups tab ── */}
          {tab === 'backups' && (
            <>
              {backups.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <p style={{ fontSize: 12, color: 'var(--ksubtle)', fontFamily: 'system-ui', margin: 0 }}>
                    Aucun backup pour ce projet.
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'system-ui', marginTop: 6 }}>
                    Clique sur "Créer backup" pour sauvegarder l'état actuel.
                  </p>
                </div>
              )}
              {backups.map(b => (
                <BackupCard
                  key={b.id}
                  backup={b}
                  onRestore={onRestoreBackup}
                  onDelete={onDeleteBackup}
                />
              ))}
            </>
          )}

          {/* ── Generations tab ── */}
          {tab === 'generations' && (
            <>
              {history.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <p style={{ fontSize: 12, color: 'var(--ksubtle)', fontFamily: 'system-ui', margin: 0 }}>
                    Aucune génération enregistrée.
                  </p>
                </div>
              )}
              {history.map((commit, idx) => {
                const { text: mText, cls: mCls } = modelLabel(commit.model)
                return (
                  <div
                    key={commit.id}
                    style={{
                      border: '1px solid var(--kborder)',
                      borderRadius: 12,
                      background: 'var(--kbg)',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {idx === 0 && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 99,
                            background: 'rgba(225,29,72,0.15)', color: '#FB7185',
                            fontFamily: 'system-ui', fontWeight: 600,
                          }}>
                            Latest
                          </span>
                        )}
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 99,
                          background: 'var(--kpanel2)', color: 'var(--ksubtle)',
                          border: '1px solid var(--kborder)',
                          fontFamily: 'system-ui', fontWeight: 500,
                        }}>
                          {mText}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'system-ui' }}>
                          {timeAgo(commit.timestamp)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 13, color: 'var(--ktext)', margin: 0,
                        fontFamily: 'system-ui', lineHeight: 1.4,
                      }}>
                        {commit.message}
                      </p>
                      {commit.tokens > 0 && (
                        <p style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'system-ui', margin: '4px 0 0' }}>
                          {commit.tokens.toLocaleString()} tokens
                        </p>
                      )}
                    </div>
                    {idx !== 0 && (
                      <div style={{ borderTop: '1px solid var(--kborder)' }}>
                        <button
                          onClick={() => handleRollback(commit)}
                          style={{
                            width: '100%', padding: '8px 0', border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 500, fontFamily: 'system-ui',
                            background: 'transparent',
                            color: confirmId === commit.id ? '#ef4444' : 'var(--ksubtle)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {confirmId === commit.id ? 'Confirmer le rollback' : 'Rollback'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
