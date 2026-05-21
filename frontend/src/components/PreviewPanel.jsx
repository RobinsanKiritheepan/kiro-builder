import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'

/* ── Fix malformed AI HTML (missing </head>, <body>, unclosed <style>) ── */
function fixMalformedHtml(html) {
  // 1. Fix unclosed <style> tags
  const styleOpens  = (html.match(/<style[\s>]/gi) || []).length
  const styleCloses = (html.match(/<\/style>/gi) || []).length
  if (styleOpens > styleCloses) {
    // Find the last <style...> that has no matching </style> and close it
    // by finding where body-like content starts
    const bodyTags = /<(nav|header|main|section|footer|div|article|aside|form|h[1-6]|p|ul|ol|table)[\s>]/i
    const bodyMatch = html.match(bodyTags)
    if (bodyMatch) {
      const idx = html.indexOf(bodyMatch[0])
      html = html.slice(0, idx) + '</style>\n'.repeat(styleOpens - styleCloses) + html.slice(idx)
    } else {
      for (let i = 0; i < styleOpens - styleCloses; i++) html += '\n</style>'
    }
  }

  // 2. If <head> exists but no </head> or <body>, split head from body content
  const hasHead      = /<head/i.test(html)
  const hasHeadClose = /<\/head>/i.test(html)
  const hasBody      = /<body[\s>]/i.test(html)

  if (hasHead && !hasHeadClose && !hasBody) {
    // Find the first body-content tag (after any <style>, <link>, <meta>, <title>, <script src>)
    const bodyTags = /<(nav|header|main|section|footer|div|article|aside|form)[\s>]/i
    const match = html.match(bodyTags)
    if (match) {
      const idx = html.indexOf(match[0])
      html = html.slice(0, idx) + '</head>\n<body>\n' + html.slice(idx)
      if (!/<\/body>/i.test(html)) html += '\n</body>'
      if (!/<\/html>/i.test(html)) html += '\n</html>'
    }
  } else if (hasHead && hasHeadClose && !hasBody) {
    // </head> exists but no <body>
    html = html.replace(/<\/head>/i, '</head>\n<body>') + '\n</body>'
  }

  // 3. Trim anything after </html> (JSON residue from AI response)
  const htmlEndMatch = html.match(/<\/html>/i)
  if (htmlEndMatch) {
    const endIdx = html.indexOf(htmlEndMatch[0]) + htmlEndMatch[0].length
    html = html.slice(0, endIdx)
  }

  return html
}

/* ── HTML wrapper — injects meta viewport + base reset ─────────── */
export function wrapForMode(html, mode) {
  if (!html) return html

  // Remove any existing viewport meta to avoid conflicts
  let cleaned = html.replace(/<meta\s+[^>]*name\s*=\s*["']viewport["'][^>]*>/gi, '')

  // Fix malformed HTML from AI generation
  cleaned = fixMalformedHtml(cleaned)

  const vp =
    mode === 'tablet' ? 'width=768, initial-scale=1' :
    mode === 'mobile' ? 'width=393, initial-scale=1' :
    'width=device-width, initial-scale=1'

  const scrollbarHide = '::-webkit-scrollbar{display:none}*{-ms-overflow-style:none;scrollbar-width:none}'
  const mobileGuard = mode === 'mobile' || mode === 'tablet'
    ? 'body{overflow-x:hidden}img,video,iframe,table,pre{max-width:100%!important}*{word-wrap:break-word}'
    : ''

  // Ready signal: fires postMessage to parent when page content is visible
  // Works for both regular pages (onload) and React/Babel CDN pages (MutationObserver on #root)
  const readySignal = `<script>(function(){var sent=false;function fire(){if(!sent){sent=true;window.parent.postMessage({type:'kiro-ready'},'*');}}window.addEventListener('load',function(){var root=document.getElementById('root');if(root){var obs=new MutationObserver(function(){if(root.children.length>0){obs.disconnect();setTimeout(fire,150);}});obs.observe(root,{childList:true});setTimeout(fire,4000);}else{setTimeout(fire,300);}});setTimeout(fire,8000);})()</script>`

  // <base target="_blank"> prevents links from navigating the iframe itself
  const base = `<base target="_blank"><meta name="viewport" content="${vp}"><style>*{box-sizing:border-box}body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}${scrollbarHide}${mobileGuard}</style>`

  const inject = (h) => h.replace(/<\/body>/i, `${readySignal}</body>`)

  if (/<head>/i.test(cleaned))   return inject(cleaned.replace(/<head>/i,   `<head>\n${base}`))
  if (/<\/head>/i.test(cleaned)) return inject(cleaned.replace(/<\/head>/i, `${base}\n</head>`))
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${base}</head><body>${cleaned}${readySignal}</body></html>`
}

/* ── Device views ──────────────────────────────────────────────── */
const VIEWS = [
  {
    id: 'desktop', label: 'Desktop', shortcut: 'D',
    icon: (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    id: 'tablet', label: 'Tablet', shortcut: 'T',
    icon: (
      <svg width="12" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="4" y="2" width="16" height="20" rx="2.5"/>
        <line x1="10" y1="21" x2="14" y2="21" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'mobile', label: 'Mobile', shortcut: 'M',
    icon: (
      <svg width="10" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="7" y="2" width="10" height="20" rx="2.5"/>
        <line x1="11" y1="20" x2="13" y2="20" strokeLinecap="round"/>
      </svg>
    ),
  },
]

/* ── Toolbar icon button ───────────────────────────────────────── */
function IBtn({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 7, border: 'none', flexShrink: 0,
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--kmuted)', transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--kpanel2)'; e.currentTarget.style.color = 'var(--ktext)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--kmuted)' }}
    >
      {children}
    </button>
  )
}

/* ── Empty state ─────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: '0 32px',
      textAlign: 'center', background: 'var(--kpanel)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, marginBottom: 24,
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        <svg width="34" height="34" fill="none" stroke="rgba(225,29,72,0.7)" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2.5"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        {[
          { top: 8,  left: 10,  s: 3,   d: 0   },
          { top: 12, right: 12, s: 2.5, d: 0.4 },
          { bottom: 10, left: 14, s: 2, d: 0.8 },
          { top: 20, right: 18, s: 3.5, d: 0.2 },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', top: p.top, left: p.left, right: p.right, bottom: p.bottom,
            width: p.s, height: p.s, borderRadius: '50%', background: '#FB7185',
            animation: `starPulse 2s ease-in-out ${p.d}s infinite`,
          }} />
        ))}
      </div>

      <p style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', color: 'var(--ktext, #333)', fontFamily: "'Syne', system-ui, sans-serif" }}>
        Ton app apparaîtra ici
      </p>
      <p style={{ fontSize: 13, color: 'var(--kmuted, #888)', margin: '0 0 28px', lineHeight: 1.6, maxWidth: 240, fontFamily: 'system-ui, sans-serif' }}>
        Décris ce que tu veux créer dans le chat →
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Landing page', 'Dashboard', 'App mobile'].map(label => (
          <span key={label} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500,
            border: '1px solid rgba(225,29,72,0.3)',
            background: 'rgba(225,29,72,0.08)', color: '#E11D48',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {label}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes starPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.5); }
        }
      `}</style>
    </div>
  )
}

/* ── Loading overlay shown while iframe content renders ─────────── */
function IframeLoadingOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 8,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#0d0d1a', gap: 10,
    }}>
      <svg width="22" height="22" fill="none" stroke="#E11D48" strokeWidth="2"
        viewBox="0 0 24 24" style={{ animation: 'spin 0.9s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'system-ui' }}>Chargement...</span>
    </div>
  )
}

/* ── iPhone bezel ────────────────────────────────────────────────── */
function PhoneBezel({ scale, rotated, refresh, code }) {
  const sW  = rotated ? 852 : 393
  const sH  = rotated ? 393 : 852
  const pad = 14
  const [loading, setLoading] = useState(false)
  const iframeRef = useRef(null)
  const fallbackRef = useRef(null)

  // When code/refresh changes → show loader; dismiss on postMessage or fallback
  useEffect(() => {
    if (!code) return
    setLoading(true)
    clearTimeout(fallbackRef.current)
    fallbackRef.current = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(fallbackRef.current)
  }, [code, refresh])

  // Listen for kiro-ready postMessage from this iframe
  useEffect(() => {
    const handler = (e) => {
      if (e.source === iframeRef.current?.contentWindow && e.data?.type === 'kiro-ready') {
        clearTimeout(fallbackRef.current)
        setLoading(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const iframeKey = `phone-${refresh}-${rotated ? 'l' : 'p'}-${code?.length || 0}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'var(--kpanel2)' }}>
      <div style={{
        position: 'relative',
        width: sW + pad * 2, height: sH + pad * 2,
        flexShrink: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        transition: 'transform 200ms ease',
      }}>
        {/* Phone frame */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 52 + pad,
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6), inset 0 0 0 1.5px #444, inset 0 0 0 3px #222',
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* Side buttons (portrait only) */}
        {!rotated && <>
          <div style={{ position: 'absolute', left: -4, top: 120 + pad, width: 4, height: 32, background: '#2a2a2a', borderRadius: '2px 0 0 2px', zIndex: 6 }} />
          <div style={{ position: 'absolute', left: -4, top: 170 + pad, width: 4, height: 60, background: '#2a2a2a', borderRadius: '2px 0 0 2px', zIndex: 6 }} />
          <div style={{ position: 'absolute', left: -4, top: 244 + pad, width: 4, height: 60, background: '#2a2a2a', borderRadius: '2px 0 0 2px', zIndex: 6 }} />
          <div style={{ position: 'absolute', right: -4, top: 180 + pad, width: 4, height: 80, background: '#2a2a2a', borderRadius: '0 2px 2px 0', zIndex: 6 }} />
        </>}

        {/* Screen */}
        <div style={{
          position: 'absolute', top: pad, left: pad,
          width: sW, height: sH,
          borderRadius: 40, overflow: 'hidden', background: '#000',
          zIndex: 6,
        }}>
          {/* Dynamic Island */}
          {!rotated && (
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              width: 120, height: 34, background: '#000', borderRadius: 20, zIndex: 10,
            }} />
          )}
          {/* Status bar area — black safe zone under the notch */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: rotated ? 0 : 54,
            background: '#000', zIndex: 9,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 2,
          }}>
            {!rotated && (
              <div style={{ display: 'flex', gap: 36, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500, fontFamily: 'system-ui' }}>
                <span>9:41</span>
                <span style={{ width: 44 }} />
                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="rgba(255,255,255,0.5)"><rect x="0" y="6" width="3" height="4" rx="0.5"/><rect x="4" y="4" width="3" height="6" rx="0.5"/><rect x="8" y="1" width="3" height="9" rx="0.5"/><rect x="12" y="0" width="2" height="10" rx="0.5" opacity="0.3"/></svg>
                  <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><rect x="0.5" y="0.5" width="13" height="9" rx="1.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/><rect x="2" y="2" width="9" height="6" rx="0.5" fill="rgba(255,255,255,0.5)"/><rect x="14.5" y="3" width="1.5" height="4" rx="0.5" fill="rgba(255,255,255,0.3)"/></svg>
                </span>
              </div>
            )}
          </div>
          {/* Iframe starts below status bar */}
          {loading && <IframeLoadingOverlay />}
          <iframe
            ref={iframeRef}
            key={iframeKey}
            srcDoc={code}
            sandbox="allow-scripts allow-forms allow-same-origin"
            style={{
              position: 'absolute',
              top: rotated ? 0 : 54,
              left: 0,
              width: sW,
              height: rotated ? sH : sH - 54 - 22,
              border: 'none', display: 'block', background: '#fff',
              opacity: loading ? 0 : 1,
              transition: 'opacity 0.4s ease',
            }}
            title="Mobile preview"
          />
          {/* Home indicator */}
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            width: 130, height: 5, background: 'rgba(255,255,255,0.35)', borderRadius: 3, zIndex: 10,
          }} />
        </div>
      </div>
    </div>
  )
}

/* ── iPad bezel ──────────────────────────────────────────────────── */
function TabletBezel({ scale, rotated, refresh, code }) {
  const sW  = rotated ? 1024 : 768
  const sH  = rotated ? 768  : 1024
  const pad = 18
  const [loading, setLoading] = useState(false)
  const iframeRef = useRef(null)
  const fallbackRef = useRef(null)

  useEffect(() => {
    if (!code) return
    setLoading(true)
    clearTimeout(fallbackRef.current)
    fallbackRef.current = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(fallbackRef.current)
  }, [code, refresh])

  useEffect(() => {
    const handler = (e) => {
      if (e.source === iframeRef.current?.contentWindow && e.data?.type === 'kiro-ready') {
        clearTimeout(fallbackRef.current)
        setLoading(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'var(--kpanel2)' }}>
      <div style={{
        position: 'relative',
        width: sW + pad * 2, height: sH + pad * 2,
        flexShrink: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        transition: 'transform 200ms ease',
      }}>
        {/* Tablet frame */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 22 + pad,
          background: 'linear-gradient(145deg, #2c2c2c, #1c1c1c)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45), inset 0 0 0 1.5px #3a3a3a',
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* Screen */}
        <div style={{
          position: 'absolute', top: pad, left: pad,
          width: sW, height: sH,
          borderRadius: 8, overflow: 'hidden', background: '#fff',
          zIndex: 6,
        }}>
          {loading && <IframeLoadingOverlay />}
          <iframe
            ref={iframeRef}
            key={`tablet-${refresh}-${rotated ? 'l' : 'p'}-${code?.length || 0}`}
            srcDoc={code}
            sandbox="allow-scripts allow-forms allow-same-origin"
            style={{ width: sW, height: sH, border: 'none', display: 'block', background: '#fff', opacity: loading ? 0 : 1, transition: 'opacity 0.4s ease' }}
            title="Tablet preview"
          />
        </div>
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────── */
// realDevice: 'mobile' | 'tablet' | 'desktop' — the actual user device
// savedSignal: incrementing int — bump to force refresh after file save
export default function PreviewPanel({ code, realDevice = 'desktop', view: viewProp, onView, savedSignal = 0 }) {
  const [viewInternal, setViewInternal] = useState('desktop')
  const view    = viewProp    ?? viewInternal
  const setView = onView      ?? setViewInternal
  const [refresh, setRefresh]         = useState(0)

  // Auto-refresh when a file is saved (savedSignal increments)
  useEffect(() => {
    if (savedSignal > 0) setRefresh(r => r + 1)
  }, [savedSignal])
  const [rotated, setRotated]         = useState(false)
  const [phoneScale, setPhoneScale]   = useState(0.75)
  const [tabScale, setTabScale]       = useState(0.55)
  const containerRef                  = useRef(null)
  const isEmpty                       = !code || code.length < 30

  // Always respect the view prop — device simulation works on all screen sizes
  const effectiveMode = view

  // Show all device views
  const visibleViews = VIEWS

  /* Keyboard shortcuts D / T / M — disabled on real mobile */
  useEffect(() => {
    if (realDevice === 'mobile') return
    const h = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const k = e.key.toLowerCase()
      if (k === 'd') setView('desktop')
      if (k === 't' && realDevice !== 'tablet') setView('tablet')
      if (k === 'm') setView('mobile')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [realDevice])

  /* ResizeObserver — auto-scale bezel */
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([{ contentRect: { width: w, height: h } }]) => {
      const pH = rotated ? 393 : 852, pW = rotated ? 852 : 393
      const ps = Math.min((h - 48) / (pH + 28), (w - 48) / (pW + 28)) * 0.92
      setPhoneScale(Math.min(ps, 1))

      const tH = rotated ? 768 : 1024, tW = rotated ? 1024 : 768
      const ts = Math.min((h - 96) / (tH + 36), (w - 48) / (tW + 36))
      setTabScale(Math.min(ts, 1))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [rotated])

  const openInTab = useCallback(() => {
    if (isEmpty) return
    const html = wrapForMode(code, effectiveMode)
    const blob = new Blob([html], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
  }, [code, effectiveMode, isEmpty])

  const goFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--kpanel)' }}>

      {/* ── Toolbar ── */}
      <div style={{
        height: 44, background: 'var(--kpanel)', borderBottom: '1px solid var(--kborder)',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, flexShrink: 0,
      }}>
        {/* Device selector */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--kpanel2)', borderRadius: 10, padding: 3, gap: 2, flexShrink: 0,
        }}>
          {visibleViews.map(({ id, label, shortcut, icon }) => {
            const active = view === id
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                title={`${label}  (${shortcut})`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 8,
                  fontSize: 11, fontWeight: 500, fontFamily: 'system-ui, sans-serif',
                  border: 'none', cursor: 'pointer',
                  background: active ? 'var(--kbg)' : 'transparent',
                  color:      active ? 'var(--ktext)' : 'var(--ksubtle)',
                  boxShadow:  active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {icon}
                {label}
              </button>
            )
          })}
        </div>


        {/* URL bar */}
        <div style={{
          flex: 1, height: 26, padding: '0 10px', borderRadius: 6,
          background: 'var(--kbg)', border: '1px solid var(--kborder)',
          display: 'flex', alignItems: 'center',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: 11, color: 'var(--ksubtle)', overflow: 'hidden',
        }}>
          {isEmpty ? 'about:blank' : 'kiro-preview.local'}
        </div>

        {/* Rotate (mobile/tablet simulation) */}
        {(view === 'mobile' || view === 'tablet') && (
          <IBtn onClick={() => setRotated(r => !r)} title="Rotate">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </IBtn>
        )}

        {/* Refresh */}
        <IBtn onClick={() => setRefresh(r => r + 1)} title="Refresh">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </IBtn>

        {/* Open in new tab */}
        <IBtn onClick={openInTab} title="Open in new tab">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </IBtn>

        {/* Fullscreen */}
        <IBtn onClick={goFullscreen} title="Fullscreen">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </IBtn>
      </div>

      {/* ── Content area — all 3 views pre-rendered, toggle visibility ── */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* Desktop */}
            <div style={{ width: '100%', height: '100%', display: effectiveMode === 'desktop' ? 'block' : 'none' }}>
              <iframe
                key={`d-${refresh}-${code?.length || 0}`}
                srcDoc={wrapForMode(code, 'desktop')}
                sandbox="allow-scripts allow-forms allow-same-origin"
                style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
                title="Desktop preview"
              />
            </div>
            {/* Tablet */}
            <div style={{ width: '100%', height: '100%', display: effectiveMode === 'tablet' ? 'block' : 'none' }}>
              <TabletBezel scale={tabScale} rotated={rotated} refresh={refresh} code={wrapForMode(code, 'tablet')} />
            </div>
            {/* Mobile */}
            <div style={{ width: '100%', height: '100%', display: effectiveMode === 'mobile' ? 'block' : 'none' }}>
              <PhoneBezel scale={phoneScale} rotated={rotated} refresh={refresh} code={wrapForMode(code, 'mobile')} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
