import { useState, useEffect, useRef } from 'react'

// ── SVG Icons (no emojis) ──────────────────────────────────────────
const Icon = {
  cloud: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  database: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  lock: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  box: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  zap: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  refresh: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  shield: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  rocket: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>,
  globe: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  bar: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  settings: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  eye: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  layers: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  key: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  code: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  book: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  message: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  cpu: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  folder: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  tool: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  link: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  list: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  externalLink: <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
}

// ── Supabase logo SVG ──────────────────────────────────────────────
const SupabaseLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M13.2 3L4.8 14.4h7.2L10.8 21l8.4-11.4H12L13.2 3z" fill="#3ECF8E"/>
  </svg>
)

const VercelLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L24 22H0L12 1z"/>
  </svg>
)

const ClaudeLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z" opacity="0.5"/>
  </svg>
)

const GitHubLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
)

// ── Embedded Service Panel ─────────────────────────────────────────
function ServiceEmbed({ name, color, logoComponent: LogoComp, url, description, features, docUrl, quickActions }) {
  const [loaded, setLoaded] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    setLoaded(false)
    setBlocked(false)
    const timer = setTimeout(() => { if (!loaded) setBlocked(true) }, 3500)
    return () => clearTimeout(timer)
  }, [url])

  const handleLoad = () => { setLoaded(true); setBlocked(false) }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--kborder)', background: 'var(--kpanel)', flexShrink: 0,
      }}>
        <span style={{ color }}><LogoComp /></span>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ktext)', fontFamily: 'Inter, sans-serif' }}>{name}</span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 4,
          background: color + '15', color, fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          Dashboard
        </span>
        <div style={{ flex: 1 }} />
        <a
          href={url} target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            color: '#fff', background: color === '#000000' ? '#111' : color,
            borderRadius: 7, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Ouvrir {name}
          <span style={{ marginLeft: 2 }}>{Icon.externalLink}</span>
        </a>
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
        {!blocked && (
          <iframe
            ref={iframeRef}
            src={url}
            onLoad={handleLoad}
            title={`${name} Dashboard`}
            style={{ width: '100%', height: '100%', border: 'none', display: loaded ? 'block' : 'none' }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}

        {/* Loading */}
        {!loaded && !blocked && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--kbg)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color, marginBottom: 12, animation: 'kiro-pulse 1.5s infinite' }}>
                <LogoComp />
              </div>
              <p style={{ color: 'var(--kmuted)', fontSize: 13, fontFamily: 'Inter, sans-serif', margin: 0 }}>
                Chargement de {name}…
              </p>
            </div>
          </div>
        )}

        {/* Blocked fallback */}
        {blocked && (
          <div style={{ padding: '28px 28px 40px', maxWidth: 680, margin: '0 auto' }}>
            {/* Hero */}
            <div style={{
              border: '1px solid var(--kborder)', borderRadius: 12,
              padding: '32px 28px', marginBottom: 20, textAlign: 'center',
              background: 'var(--kpanel)',
            }}>
              <div style={{ color, display: 'inline-block', marginBottom: 14 }}>
                <LogoComp />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--ktext)', fontFamily: 'Inter, sans-serif' }}>
                {name}
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--kmuted)', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>
                {description}
              </p>
              <a
                href={url} target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '11px 28px', fontSize: 13, fontWeight: 700,
                  color: '#fff', background: color === '#000000' ? '#111' : color,
                  borderRadius: 9, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                  boxShadow: `0 4px 16px ${color}30`,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}45` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${color}30` }}
              >
                Ouvrir le Dashboard {name}
                <span>{Icon.externalLink}</span>
              </a>
            </div>

            {/* Features grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginBottom: 20 }}>
              {features.map(f => (
                <div key={f.label} style={{
                  padding: '13px 15px', borderRadius: 9,
                  border: '1px solid var(--kborder)', background: 'var(--kpanel)',
                }}>
                  <div style={{ color, marginBottom: 7 }}>{f.svgIcon}</div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ktext)', fontFamily: 'Inter, sans-serif', marginBottom: 3 }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ksubtle)', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick links */}
            {quickActions && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--kmuted)', marginBottom: 8, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Accès rapide
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {quickActions.map(a => (
                    <a
                      key={a.label}
                      href={a.url} target="_blank" rel="noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', fontSize: 12, fontWeight: 500,
                        color: 'var(--ktext)', background: 'var(--kpanel)',
                        border: '1px solid var(--kborder)', borderRadius: 7,
                        textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--kborder)'; e.currentTarget.style.color = 'var(--ktext)' }}
                    >
                      <span style={{ color }}>{a.svgIcon}</span>
                      {a.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Doc link */}
            {docUrl && (
              <div style={{
                padding: '13px 16px', borderRadius: 9,
                background: 'var(--kpanel)', border: '1px solid var(--kborder)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ color: 'var(--kmuted)' }}>{Icon.book}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ktext)', fontFamily: 'Inter, sans-serif' }}>Documentation</div>
                  <div style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'Inter, sans-serif' }}>Guides, API reference et exemples</div>
                </div>
                <a href={docUrl} target="_blank" rel="noreferrer" style={{
                  fontSize: 12, fontWeight: 600, color, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  Docs {Icon.externalLink}
                </a>
              </div>
            )}

            <style>{`@keyframes kiro-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Service configs ────────────────────────────────────────────────
const SUPABASE_CONFIG = {
  name: 'Supabase',
  color: '#3ECF8E',
  logoComponent: SupabaseLogo,
  url: 'https://supabase.com/dashboard',
  description: 'Base de données PostgreSQL, authentification, stockage et API temps réel — tout en un.',
  docUrl: 'https://supabase.com/docs',
  features: [
    { svgIcon: Icon.database,  label: 'Database',           desc: 'PostgreSQL complet avec éditeur SQL intégré' },
    { svgIcon: Icon.lock,      label: 'Authentication',     desc: 'Auth email, OAuth, magic link, SSO' },
    { svgIcon: Icon.box,       label: 'Storage',            desc: 'Stockage fichiers avec CDN et policies' },
    { svgIcon: Icon.zap,       label: 'Edge Functions',     desc: 'Fonctions serverless Deno au edge' },
    { svgIcon: Icon.refresh,   label: 'Realtime',           desc: 'Subscriptions temps réel sur vos tables' },
    { svgIcon: Icon.shield,    label: 'Row Level Security', desc: 'Politiques de sécurité par ligne' },
  ],
  quickActions: [
    { svgIcon: Icon.database, label: 'Table Editor', url: 'https://supabase.com/dashboard/project/_/editor' },
    { svgIcon: Icon.code,     label: 'SQL Editor',   url: 'https://supabase.com/dashboard/project/_/sql' },
    { svgIcon: Icon.lock,     label: 'Auth Users',   url: 'https://supabase.com/dashboard/project/_/auth/users' },
    { svgIcon: Icon.box,      label: 'Storage',      url: 'https://supabase.com/dashboard/project/_/storage/buckets' },
    { svgIcon: Icon.bar,      label: 'Logs',         url: 'https://supabase.com/dashboard/project/_/logs/explorer' },
    { svgIcon: Icon.settings, label: 'Settings',     url: 'https://supabase.com/dashboard/project/_/settings/general' },
  ],
}

const VERCEL_CONFIG = {
  name: 'Vercel',
  color: '#000000',
  logoComponent: VercelLogo,
  url: 'https://vercel.com/dashboard',
  description: 'Plateforme de déploiement frontend — preview deploys, custom domains et edge network mondial.',
  docUrl: 'https://vercel.com/docs',
  features: [
    { svgIcon: Icon.rocket,   label: 'Deployments',    desc: 'Deploy automatique à chaque push Git' },
    { svgIcon: Icon.globe,    label: 'Domains',        desc: 'Domaines custom avec HTTPS automatique' },
    { svgIcon: Icon.bar,      label: 'Analytics',      desc: 'Web Vitals et analytics temps réel' },
    { svgIcon: Icon.layers,   label: 'Edge Network',   desc: 'CDN mondial, cache intelligent' },
    { svgIcon: Icon.settings, label: 'Env Variables',  desc: "Variables d'environnement par branche" },
    { svgIcon: Icon.eye,      label: 'Preview',        desc: 'URL de preview pour chaque PR' },
  ],
  quickActions: [
    { svgIcon: Icon.list,     label: 'Deployments',  url: 'https://vercel.com/dashboard' },
    { svgIcon: Icon.globe,    label: 'Domains',      url: 'https://vercel.com/dashboard/domains' },
    { svgIcon: Icon.bar,      label: 'Analytics',    url: 'https://vercel.com/analytics' },
    { svgIcon: Icon.settings, label: 'Settings',     url: 'https://vercel.com/dashboard/settings' },
    { svgIcon: Icon.box,      label: 'Integrations', url: 'https://vercel.com/dashboard/integrations' },
  ],
}

const CLAUDE_CONFIG = {
  name: 'Claude',
  color: '#d97706',
  logoComponent: ClaudeLogo,
  url: 'https://claude.ai',
  description: 'Interface Claude — chat, projets et gestion de votre compte Anthropic.',
  docUrl: 'https://docs.anthropic.com',
  features: [
    { svgIcon: Icon.message, label: 'Claude.ai',        desc: 'Interface de chat avec Claude Sonnet, Opus, Haiku' },
    { svgIcon: Icon.key,     label: 'API Console',       desc: "Clés API, usage, facturation Anthropic" },
    { svgIcon: Icon.bar,     label: 'Usage Dashboard',   desc: 'Tokens consommés, coûts, limites de taux' },
    { svgIcon: Icon.tool,    label: 'Workbench',         desc: 'Tester les prompts et comparer les modèles' },
    { svgIcon: Icon.folder,  label: 'Projects',          desc: 'Projets Claude avec mémoire persistante' },
    { svgIcon: Icon.book,    label: 'Documentation',     desc: 'Guides, API reference, exemples de code' },
  ],
  quickActions: [
    { svgIcon: Icon.message, label: 'Claude.ai',         url: 'https://claude.ai' },
    { svgIcon: Icon.cpu,     label: 'Console Anthropic', url: 'https://console.anthropic.com' },
    { svgIcon: Icon.bar,     label: 'Usage & Billing',   url: 'https://console.anthropic.com/settings/usage' },
    { svgIcon: Icon.tool,    label: 'API Workbench',     url: 'https://console.anthropic.com/workbench' },
    { svgIcon: Icon.key,     label: 'Clés API',          url: 'https://console.anthropic.com/settings/keys' },
    { svgIcon: Icon.book,    label: 'Documentation',     url: 'https://docs.anthropic.com' },
  ],
}

const GITHUB_CONFIG = {
  name: 'GitHub',
  color: '#e6edf3',
  logoComponent: GitHubLogo,
  url: 'https://github.com',
  description: 'Hébergement de code, collaboration et CI/CD — la plateforme de développement la plus utilisée au monde.',
  docUrl: 'https://docs.github.com',
  features: [
    { svgIcon: Icon.folder,  label: 'Repositories',    desc: 'Dépôts publics et privés, branches, tags' },
    { svgIcon: Icon.list,    label: 'Issues & PRs',     desc: 'Suivi de bugs, code review, pull requests' },
    { svgIcon: Icon.zap,     label: 'GitHub Actions',   desc: 'CI/CD automatisé, workflows, pipelines' },
    { svgIcon: Icon.globe,   label: 'GitHub Pages',     desc: 'Hébergement statique gratuit via gh-pages' },
    { svgIcon: Icon.shield,  label: 'Security',         desc: 'Dependabot, secret scanning, code analysis' },
    { svgIcon: Icon.code,    label: 'Codespaces',       desc: 'Environnement de dev cloud instantané' },
  ],
  quickActions: [
    { svgIcon: Icon.folder,  label: 'Mes repos',       url: 'https://github.com?tab=repositories' },
    { svgIcon: Icon.list,    label: 'Issues',           url: 'https://github.com/issues' },
    { svgIcon: Icon.zap,     label: 'Actions',          url: 'https://github.com/actions' },
    { svgIcon: Icon.globe,   label: 'GitHub Pages',     url: 'https://pages.github.com' },
    { svgIcon: Icon.settings,label: 'Settings',         url: 'https://github.com/settings' },
    { svgIcon: Icon.key,     label: 'SSH & GPG Keys',   url: 'https://github.com/settings/keys' },
  ],
}

// ── Tab icons (SVG, no emoji) ──────────────────────────────────────
const TAB_ICONS = {
  supabase: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M13.2 3L4.8 14.4h7.2L10.8 21l8.4-11.4H12L13.2 3z" fill="#3ECF8E"/></svg>,
  vercel:   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L24 22H0L12 1z"/></svg>,
  claude:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/></svg>,
  github:   <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>,
}

// ── Main Cloud Panel ───────────────────────────────────────────────
export default function CloudPanel({ ghStatus, onGitPush }) {
  const [tab, setTab] = useState('supabase')

  const TABS = [
    { id: 'supabase', label: 'Supabase' },
    { id: 'vercel',   label: 'Vercel'   },
    { id: 'github',   label: 'GitHub'   },
    { id: 'claude',   label: 'Claude'   },
  ]

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--kbg)', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', borderBottom: '1px solid var(--kborder)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--kpanel2)', border: '1px solid var(--kborder)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--kmuted)', flexShrink: 0,
          }}>
            {Icon.cloud}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ktext)' }}>
              Cloud Services
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ksubtle)', marginTop: 1 }}>
              Base de données, hébergement et IA
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif',
                background: 'transparent',
                color: tab === t.id ? 'var(--kaccent)' : 'var(--ksubtle)',
                borderBottom: `2px solid ${tab === t.id ? 'var(--kaccent)' : 'transparent'}`,
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--ktext)' }}
              onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--ksubtle)' }}
            >
              <span style={{ color: tab === t.id ? 'var(--kaccent)' : 'var(--kmuted)' }}>
                {TAB_ICONS[t.id]}
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {tab === 'supabase' && <ServiceEmbed {...SUPABASE_CONFIG} />}
        {tab === 'vercel'   && <ServiceEmbed {...VERCEL_CONFIG} />}
        {tab === 'github'   && <ServiceEmbed {...GITHUB_CONFIG} />}
        {tab === 'claude'   && <ServiceEmbed {...CLAUDE_CONFIG} />}
      </div>
    </div>
  )
}
