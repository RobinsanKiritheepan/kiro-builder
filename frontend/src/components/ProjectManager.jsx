import { useState, useEffect, useCallback } from 'react'
import authFetch from '../utils/authFetch.js'

/* ── Stack options ──────────────────────────────────────────────── */
const STACK_OPTIONS = [
  { id: 'react',      label: 'React'      },
  { id: 'vue',        label: 'Vue'        },
  { id: 'svelte',     label: 'Svelte'     },
  { id: 'html',       label: 'HTML/CSS'   },
  { id: 'nextjs',     label: 'Next.js'    },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'tailwind',   label: 'Tailwind'   },
  { id: 'python',     label: 'Python'     },
  { id: 'fastapi',    label: 'FastAPI'    },
  { id: 'node',       label: 'Node.js'    },
]

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

/* ── SVG icons ───────────────────────────────────────────────────── */
function FolderIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function PlusIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

/* ── Project card ────────────────────────────────────────────────── */
function ProjectCard({ project, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
      style={{
        border:       `1px solid ${hovered ? 'rgba(225,29,72,0.4)' : 'var(--kborder)'}`,
        borderRadius: 12,
        padding:      '16px',
        background:   hovered ? 'rgba(225,29,72,0.05)' : 'var(--kpanel)',
        cursor:       'pointer',
        transition:   'all 0.15s',
        display:      'flex',
        flexDirection: 'column',
        gap:          10,
        position:     'relative',
      }}
      onClick={() => !confirmDelete && onOpen(project)}
    >
      {/* Icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(225,29,72,0.25), rgba(6,182,212,0.2))',
          border: '1px solid rgba(225,29,72,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <FolderIcon size={16} color="rgba(167,139,250,0.9)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontWeight: 700, fontSize: 13,
            color: 'var(--ktext)', fontFamily: "'Syne', system-ui, sans-serif",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {project.name}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'system-ui' }}>
            {formatDate(project.updated_at)}
          </p>
        </div>
      </div>

      {/* Stack chips */}
      {project.stack?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {project.stack.slice(0, 4).map(s => {
            const opt = STACK_OPTIONS.find(o => o.id === s)
            return (
              <span key={s} style={{
                padding: '2px 8px', borderRadius: 99, fontSize: 10,
                background: 'rgba(225,29,72,0.1)',
                border: '1px solid rgba(225,29,72,0.22)',
                color: '#FB7185', fontFamily: 'system-ui', fontWeight: 500,
              }}>
                {opt ? opt.label : s}
              </span>
            )
          })}
          {project.stack.length > 4 && (
            <span style={{ fontSize: 10, color: 'var(--ksubtle)', alignSelf: 'center' }}>
              +{project.stack.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Action buttons (appear on hover) */}
      {hovered && (
        <div
          style={{
            position: 'absolute', bottom: 12, right: 12,
            display: 'flex', gap: 6,
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onOpen(project)}
            style={{
              padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: 'var(--kaccent)', color: '#fff', border: 'none',
              cursor: 'pointer', fontFamily: 'system-ui',
            }}
          >
            Ouvrir
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 11,
                background: 'rgba(239,68,68,0.1)', color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)',
                cursor: 'pointer', fontFamily: 'system-ui',
              }}
            >
              Supprimer
            </button>
          ) : (
            <button
              onClick={() => onDelete(project.id)}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: '#ef4444', color: '#fff', border: 'none',
                cursor: 'pointer', fontFamily: 'system-ui',
              }}
            >
              Confirmer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────── */
export default function ProjectManager({ isOpen, onClose, onOpen, activeProject }) {
  const [view, setView]         = useState('list')      // 'list' | 'create'
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm]         = useState({ name: '', stack: [] })
  const [error, setError]       = useState(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/projects')
      if (r.ok) {
        const data = await r.json()
        setProjects(data.projects || [])
      }
    } catch (e) {
      console.error('[ProjectManager] fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setView('list')
      setForm({ name: '', stack: [] })
      setError(null)
      fetchProjects()
    }
  }, [isOpen, fetchProjects])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Le nom du projet est requis.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const r = await fetch('/api/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: form.name.trim(), stack: form.stack }),
      })
      if (!r.ok) {
        const detail = await r.json().catch(() => ({}))
        setError(detail.detail || 'Erreur lors de la création.')
        return
      }
      const project = await r.json()
      onOpen(project)
      onClose()
    } catch (e) {
      setError('Backend hors ligne. Vérifie uvicorn.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await authFetch(`/api/projects/${id}`, { method: 'DELETE' })
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      console.error('[ProjectManager] delete error:', e)
    }
  }

  const toggleStack = (id) => {
    setForm(f => ({
      ...f,
      stack: f.stack.includes(id) ? f.stack.filter(s => s !== id) : [...f.stack, id],
    }))
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(680px, 96vw)',
          maxHeight: 'min(720px, 92vh)',
          borderRadius: 18,
          background: 'var(--kbg)',
          border: '1px solid var(--kborder)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '18px 24px', borderBottom: '1px solid var(--kborder)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--kaccent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C12 2 9 7 9 10c0 1.5.8 2.5 2 3-.8-2 0-5 1-7 1 2 1.8 5 1 7 1.2-.5 2-1.5 2-3 0-3-3-8-3-8z"/><path d="M6 8c0 0-1 5 1 7.5 1 1.2 2.2 1.5 3.2 1-2-.5-3.5-2.5-2.8-5 .5 2 2 3.8 4 3.8-1-1-2.5-2.5-2-4.5C8.5 8 6 8 6 8z" opacity=".85"/><path d="M18 8c0 0 1 5-1 7.5-1 1.2-2.2 1.5-3.2 1 2-.5 3.5-2.5 2.8-5-.5 2-2 3.8-4 3.8 1-1 2.5-2.5 2-4.5C15.5 8 18 8 18 8z" opacity=".85"/>
            </svg>
          </div>
          <div>
            <h2 style={{
              margin: 0, fontSize: 15, fontWeight: 700,
              color: 'var(--ktext)', fontFamily: "'Syne', system-ui, sans-serif",
            }}>
              Projets Kiro
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'system-ui' }}>
              {projects.length} projet{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ flex: 1 }} />

          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'var(--kpanel2)', borderRadius: 8, padding: 3, gap: 2,
          }}>
            {[
              { id: 'list',   label: 'Mes projets' },
              { id: 'create', label: 'Nouveau'     },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', fontFamily: 'system-ui',
                  background: view === id ? 'var(--kaccent)' : 'transparent',
                  color:      view === id ? '#fff' : 'var(--ksubtle)',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {id === 'create' && <PlusIcon size={11} />}
                {label}
              </button>
            ))}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: '1px solid var(--kborder)',
              borderRadius: 8, background: 'var(--kpanel2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ksubtle)',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── List view ── */}
          {view === 'list' && (
            <>
              {loading && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ksubtle)', fontSize: 13, fontFamily: 'system-ui' }}>
                  Chargement…
                </div>
              )}
              {!loading && projects.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                    background: 'var(--kpanel2)', border: '1px solid var(--kborder)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FolderIcon size={24} color="var(--ksubtle)" />
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--kmuted)', fontFamily: 'system-ui', margin: '0 0 16px' }}>
                    Aucun projet pour l'instant.
                  </p>
                  <button
                    onClick={() => setView('create')}
                    style={{
                      padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: 'var(--kaccent)', color: '#fff', border: 'none',
                      cursor: 'pointer', fontFamily: 'system-ui',
                    }}
                  >
                    Créer mon premier projet
                  </button>
                </div>
              )}
              {!loading && projects.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 12,
                }}>
                  {projects.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onOpen={proj => { onOpen(proj); onClose() }}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Create view ── */}
          {view === 'create' && (
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              {/* Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui',
                  color: 'var(--ksubtle)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: 8,
                }}>
                  Nom du projet
                </label>
                <input
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Mon super projet…"
                  style={{
                    width: '100%', padding: '10px 14px',
                    borderRadius: 10, fontSize: 14,
                    border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'var(--kborder)'}`,
                    background: 'var(--kpanel)', color: 'var(--ktext)',
                    fontFamily: 'system-ui', outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--kaccent)' }}
                  onBlur={e  => { e.target.style.borderColor = error ? 'rgba(239,68,68,0.6)' : 'var(--kborder)' }}
                />
                {error && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#f87171', fontFamily: 'system-ui' }}>
                    {error}
                  </p>
                )}
              </div>

              {/* Stack */}
              <div style={{ marginBottom: 28 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui',
                  color: 'var(--ksubtle)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: 10,
                }}>
                  Stack technique
                  <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ksubtle)', fontSize: 10 }}>
                    (optionnel)
                  </span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STACK_OPTIONS.map(opt => {
                    const selected = form.stack.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleStack(opt.id)}
                        style={{
                          padding: '6px 13px', borderRadius: 99, fontSize: 12,
                          fontWeight: selected ? 600 : 400, fontFamily: 'system-ui',
                          cursor: 'pointer', transition: 'all 0.15s',
                          border:      selected ? '1px solid rgba(225,29,72,0.6)' : '1px solid var(--kborder)',
                          background:  selected ? 'rgba(225,29,72,0.15)'           : 'var(--kpanel2)',
                          color:       selected ? '#FB7185'                          : 'var(--kmuted)',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 14,
                  fontWeight: 700, fontFamily: "'Syne', system-ui, sans-serif",
                  background: creating ? 'var(--kpanel2)' : 'var(--kaccent)',
                  color: creating ? 'var(--ksubtle)' : '#fff',
                  border: 'none', cursor: creating ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: creating ? 'none' : '0 4px 16px rgba(225,29,72,0.35)',
                }}
              >
                {creating ? 'Création…' : 'Créer le projet'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
