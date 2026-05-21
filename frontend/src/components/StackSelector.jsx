import { useState, useEffect, useCallback } from 'react'

// ── Category definitions ──────────────────────────────────────────
export const STACK_CATEGORIES = {
  frontend: {
    title: 'Frontend',
    options: [
      { id: 'react',        label: 'React',         icon: '⚛️', color: '#61DAFB' },
      { id: 'nextjs',       label: 'Next.js',       icon: '▲',  color: '#888'    },
      { id: 'react-native', label: 'React Native',  icon: '📱', color: '#61DAFB' },
    ],
  },
  backend: {
    title: 'Backend',
    options: [
      { id: 'fastapi', label: 'FastAPI',      icon: '🐍', color: '#009688' },
      { id: 'express', label: 'Node/Express', icon: '🟢', color: '#68A063' },
      { id: 'nestjs',  label: 'NestJS',       icon: '🔴', color: '#E0234E' },
      { id: 'php',     label: 'PHP',          icon: '🐘', color: '#777BB4' },
      { id: 'none',    label: 'No backend',   icon: '⚡', color: '#777'    },
    ],
  },
}

// ── Left-nav meta ─────────────────────────────────────────────────
const NAV_META = {
  frontend: { icon: '💻', label: 'Frontend',  required: true  },
  backend:  { icon: '⚙️', label: 'Backend',   required: false },
}

export const DEFAULT_STACK = {
  frontend: ['react'],
  backend:  ['none'],
}

const LS_KEY = 'kiro-stack-selection'

export function loadStack() {
  try {
    const s = localStorage.getItem(LS_KEY)
    if (!s) return { ...DEFAULT_STACK }
    const parsed = JSON.parse(s)
    // Only keep keys that exist in DEFAULT_STACK (strip removed categories)
    const result = { ...DEFAULT_STACK }
    for (const k of Object.keys(DEFAULT_STACK)) {
      if (parsed[k]) result[k] = parsed[k]
    }
    return result
  } catch {
    return { ...DEFAULT_STACK }
  }
}

export function saveStack(stack) {
  localStorage.setItem(LS_KEY, JSON.stringify(stack))
}

export function stackToTechs(stack) {
  const labelMap = {}
  Object.values(STACK_CATEGORIES).forEach(cat =>
    cat.options.forEach(o => { labelMap[o.id] = o.label })
  )
  return Object.values(stack).flat().filter(v => v !== 'none').map(id => labelMap[id] || id)
}

export function stackSummaryChips(stack) {
  const iconMap = {}
  Object.values(STACK_CATEGORIES).forEach(cat =>
    cat.options.forEach(o => { iconMap[o.id] = { icon: o.icon, label: o.label, color: o.color } })
  )
  return Object.values(stack).flat().filter(v => v !== 'none').map(id => iconMap[id] || { icon: '?', label: id, color: '#888' })
}

// ── Component ─────────────────────────────────────────────────────
export default function StackSelector({ stack, onChange, onClose }) {
  const [local, setLocal]             = useState(() => ({ ...DEFAULT_STACK, ...stack }))
  const [activeCategory, setActiveCategory] = useState('frontend')

  useEffect(() => { setLocal({ ...DEFAULT_STACK, ...stack }) }, [stack])

  const toggle = useCallback((catKey, optId) => {
    setLocal(prev => {
      const current = prev[catKey] || []
      if (optId === 'none') return { ...prev, [catKey]: ['none'] }
      const withoutNone = current.filter(x => x !== 'none')
      if (withoutNone.includes(optId)) {
        const next = withoutNone.filter(x => x !== optId)
        const mandatory = catKey === 'frontend'
        return { ...prev, [catKey]: next.length === 0 && !mandatory ? ['none'] : next }
      }
      return { ...prev, [catKey]: [...withoutNone, optId] }
    })
  }, [])

  const handleApply = useCallback(() => {
    const validated = { ...local }
    if (!validated.frontend?.length) validated.frontend = ['react']
    onChange(validated)
    saveStack(validated)
    onClose()
  }, [local, onChange, onClose])

  const handleReset = useCallback(() => setLocal({ ...DEFAULT_STACK }), [])

  const cat     = STACK_CATEGORIES[activeCategory]
  const navMeta = NAV_META[activeCategory]
  const chips   = stackSummaryChips(local)

  return (
    // ── Backdrop ──
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* ── Modal shell ── */}
      <div
        style={{
          width: 760, maxWidth: '96vw',
          maxHeight: '88vh', borderRadius: 16,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: 'var(--kbg)', border: '1px solid var(--kborder)',
          boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
          animation: 'stackModalIn 0.18s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes stackModalIn {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);   }
          }
        `}</style>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 16px',
          borderBottom: '1px solid var(--kborder)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(225,29,72,0.12)', border: '1px solid rgba(225,29,72,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            }}>⚡</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ktext)', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em' }}>
                Tech Stack
              </div>
              <div style={{ fontSize: 11, color: 'var(--kmuted)', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>
                Configure the technologies Kiro will generate
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--kborder)', background: 'transparent',
              color: 'var(--kmuted)', cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--kpanel2)'; e.currentTarget.style.color = 'var(--ktext)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--kmuted)' }}
          >✕</button>
        </div>

        {/* ── Body: left-nav + right cards ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left navigation */}
          <div style={{
            width: 188, borderRight: '1px solid var(--kborder)',
            background: 'var(--kpanel)', padding: '10px 8px',
            display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0,
          }}>
            {Object.entries(NAV_META).map(([key, meta]) => {
              const isActive = activeCategory === key
              const selected = (local[key] || []).filter(v => v !== 'none')
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.1s',
                    background: isActive ? 'rgba(225,29,72,0.10)' : 'transparent',
                    color: isActive ? 'var(--kaccent)' : 'var(--kmuted)',
                    fontFamily: 'Inter, sans-serif', fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    borderLeft: `2px solid ${isActive ? 'var(--kaccent)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--kpanel2)'; e.currentTarget.style.color = 'var(--ktext)' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--kmuted)' } }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{meta.icon}</span>
                  <span style={{ flex: 1 }}>{meta.label}</span>
                  {meta.required && (
                    <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>*</span>
                  )}
                  {selected.length > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: 'rgba(225,29,72,0.15)', color: 'var(--kaccent)',
                      borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                    }}>
                      {selected.length}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Divider + hint */}
            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <div style={{ height: 1, background: 'var(--kborder)', marginBottom: 10 }} />
              <div style={{ fontSize: 10, color: 'var(--ksubtle)', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, padding: '0 6px' }}>
                Kiro uses your stack to generate matching files and configuration.
              </div>
            </div>
          </div>

          {/* Right content: option cards */}
          <div style={{ flex: 1, padding: '20px 22px', overflowY: 'auto' }}>
            {/* Category header */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{navMeta.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ktext)', fontFamily: 'Syne, sans-serif' }}>
                  {cat.title}
                </span>
                {navMeta.required && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                  }}>Required</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--kmuted)', fontFamily: 'Inter, sans-serif' }}>
                {activeCategory === 'frontend' && 'Choose the frontend framework for your app'}
                {activeCategory === 'backend' && 'Backend server to handle API routes and business logic'}
                {activeCategory === 'database' && 'Persistent data storage for your application'}
                {activeCategory === 'auth' && 'User authentication and session management'}
                {activeCategory === 'hosting' && 'Where your app will be deployed and served'}
              </div>
            </div>

            {/* Option cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {cat.options.map(opt => {
                const selected = (local[activeCategory] || []).includes(opt.id)
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggle(activeCategory, opt.id)}
                    style={{
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${selected ? opt.color + '55' : 'var(--kborder)'}`,
                      background: selected ? `${opt.color}10` : 'var(--kpanel)',
                      transition: 'all 0.12s',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      position: 'relative', userSelect: 'none',
                      boxShadow: selected ? `0 2px 10px ${opt.color}18` : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--kborder2)'; e.currentTarget.style.background = 'var(--kpanel2)' } }}
                    onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--kborder)'; e.currentTarget.style.background = 'var(--kpanel)' } }}
                  >
                    {/* Option icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${opt.color}18`, border: `1px solid ${opt.color}28`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: opt.id === 'none' ? 16 : 20, color: opt.color, fontWeight: 700,
                    }}>
                      {opt.icon}
                    </div>

                    {/* Option info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ktext)', fontFamily: 'Inter, sans-serif' }}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            background: '#3ECF8E18', color: '#3ECF8E',
                            border: '1px solid #3ECF8E33', borderRadius: 10, padding: '1px 6px',
                          }}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <div style={{ fontSize: 11, color: 'var(--kmuted)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                          {opt.description}
                        </div>
                      )}
                    </div>

                    {/* Checkmark */}
                    {selected && (
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 20, height: 20, borderRadius: '50%',
                        background: opt.color, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>✓</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Footer: summary + actions ── */}
        <div style={{
          padding: '13px 20px', borderTop: '1px solid var(--kborder)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          background: 'var(--kpanel)',
        }}>
          {/* Summary chips */}
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', minWidth: 0 }}>
            {chips.length > 0 ? chips.map((c, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 20,
                background: 'var(--kpanel2)', color: 'var(--kmuted)',
                border: '1px solid var(--kborder)',
                fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </span>
            )) : (
              <span style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'Inter, sans-serif' }}>
                Default stack selected
              </span>
            )}
          </div>

          {/* Buttons */}
          <button
            onClick={handleReset}
            style={{
              padding: '7px 14px', borderRadius: 8, flexShrink: 0,
              border: '1px solid var(--kborder)', background: 'transparent',
              color: 'var(--kmuted)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--kpanel2)'; e.currentTarget.style.color = 'var(--ktext)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--kmuted)' }}
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '7px 20px', borderRadius: 8, flexShrink: 0,
              border: 'none', background: '#E11D48', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#be123c'}
            onMouseLeave={e => e.currentTarget.style.background = '#E11D48'}
          >
            Apply stack ✓
          </button>
        </div>
      </div>
    </div>
  )
}
