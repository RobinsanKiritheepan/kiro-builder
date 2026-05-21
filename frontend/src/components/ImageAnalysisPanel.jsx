import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Eye, Palette, Sparkles, LayoutGrid, Puzzle, Layers, CheckSquare,
  Zap, X, ScanSearch, Monitor, Server, Database, Shield, Globe,
  Square, ChevronDown,
} from 'lucide-react'

// ── Design tokens (inline fallbacks match CSS vars) ───────────────
const v = (name) => `var(${name})`

// ── Demo data ─────────────────────────────────────────────────────
const DEMO_ANALYSIS = {
  type: 'landing_page',
  confidence: 94,
  style: ['Moderne', 'Dark mode', 'Glassmorphism', 'Gradient'],
  colors: [
    { hex: '#6366f1', role: 'Primaire'   },
    { hex: '#8b5cf6', role: 'Accent'     },
    { hex: '#0f0f23', role: 'Background' },
    { hex: '#ffffff', role: 'Texte'      },
    { hex: '#374151', role: 'Secondaire' },
  ],
  description:
    "Landing page moderne avec hero gradient animé, section features en grid 3 colonnes, CTA email et footer minimaliste. " +
    "Design sombre avec accents violet-indigo et effets glassmorphism. Navigation sticky et micro-animations.",
  sections: [
    { name: 'Navbar',      height_pct: 8,  color: '#1e1e3a', components: ['Logo', 'Nav links', 'CTA button']          },
    { name: 'Hero',        height_pct: 34, color: '#16213e', components: ['H1', 'Subtitle', 'Buttons', 'Illustration'] },
    { name: 'Features',    height_pct: 24, color: '#0f1629', components: ['3 cards', 'Icons', 'Descriptions']          },
    { name: 'CTA Section', height_pct: 15, color: '#1a1a35', components: ['Titre', 'Form email', 'Button']             },
    { name: 'Footer',      height_pct: 11, color: '#0d0d1a', components: ['Links', 'Copyright', 'Social icons']        },
  ],
  detected_elements: {
    navigation: true,  hero: true,  cta: true,   footer: false,
    cards: true,       form: false, media: true,  table: false,
  },
  typography: {
    h1:   { font: 'Inter', size: '56px', weight: '700', role: 'Titre H1'   },
    h2:   { font: 'Inter', size: '32px', weight: '600', role: 'Sous-titre' },
    body: { font: 'Inter', size: '16px', weight: '400', role: 'Corps'      },
  },
  layout: '12 colonnes · Max-width 1280px · Gutters 24px',
  responsive: { mobile: 'probable', tablet: 'incertain', desktop: 'confirmé' },
  complexity: { score: 6, design: 7, structure: 5, interactivity: 4, backend: 2 },
  suggested_stack:   ['React', 'Tailwind'],
  suggested_action:  'clone_exact',
  suggested_hosting: 'Vercel',
  estimated_tokens:  2100,
  estimated_cost:    0.006,
  estimated_time:    45,
}

const TYPE_META = {
  landing_page: { label: 'Landing page' },
  saas_app:     { label: 'App SaaS'     },
  portfolio:    { label: 'Portfolio'    },
  ecommerce:    { label: 'E-commerce'   },
  dashboard:    { label: 'Dashboard'    },
  mobile_app:   { label: 'App mobile'   },
  blog:         { label: 'Blog'         },
  other:        { label: 'Autre'        },
}

const TABS = [
  { id: 'overview',   Icon: Eye,          label: "Vue d'ensemble" },
  { id: 'design',     Icon: Palette,      label: 'Design'         },
  { id: 'proposal',   Icon: Sparkles,     label: 'Proposition'    },
  { id: 'structure',  Icon: LayoutGrid,   label: 'Structure'      },
  { id: 'components', Icon: Puzzle,       label: 'Composants'     },
  { id: 'stack',      Icon: Layers,       label: 'Stack'          },
  { id: 'checklist',  Icon: CheckSquare,  label: 'Checklist'      },
]

const ACTION_OPTIONS = [
  { id: 'clone_exact', label: 'Cloner fidèlement', desc: 'Reproduit pixel par pixel',    recommended: true },
  { id: 'inspire',     label: "S'en inspirer",     desc: 'Même style, contenu différent'               },
  { id: 'redesign',    label: 'Redesigner',         desc: 'Nouveau look, même structure'                },
  { id: 'improve',     label: 'Améliorer',          desc: 'Clone + corrections UX modernes'             },
]

const ELEMENT_LABELS = {
  navigation: 'Navigation / Header',
  hero:       'Hero Section',
  cta:        'Call to Action',
  footer:     'Footer',
  cards:      'Cards / Grille',
  form:       'Formulaire',
  media:      'Images / Médias',
  table:      'Tableau / Data',
}

const ALL_STYLE_TAGS = [
  'Minimaliste','Dark mode','Glassmorphism','Gradient',
  'Corporate','Playful','Bold','Moderne','Flat','Neumorphism','Brutalist','Colorful',
]

// ── Helpers ───────────────────────────────────────────────────────
function normalizeAnalysis(raw) {
  if (!raw) return DEMO_ANALYSIS
  const merged = { ...DEMO_ANALYSIS, ...raw }
  if (Array.isArray(raw.colors) && raw.colors.length > 0) {
    const roles = ['Primaire','Secondaire','Background','Texte','Accent','Extra']
    merged.colors = raw.colors.map((c, i) =>
      typeof c === 'string' ? { hex: c, role: roles[i] || `Couleur ${i + 1}` } : c
    )
  }
  return merged
}

function deriveStack(proposal) {
  const stackMap = {
    'react-tailwind': ['React', 'Tailwind'],
    'nextjs':         ['Next.js', 'Tailwind'],
    'vue':            ['Vue'],
    'html':           ['HTML', 'CSS'],
  }
  const result = [...(stackMap[proposal.frontend] || ['React', 'Tailwind'])]
  if (proposal.backend   !== 'none') result.push(proposal.backend)
  if (proposal.database  !== 'none') result.push(proposal.database)
  if (proposal.auth      !== 'none') result.push(proposal.auth)
  if (proposal.hosting   !== 'none') result.push(proposal.hosting)
  return result
}

// ── Primitive components ──────────────────────────────────────────
function Skeleton({ width = '100%', height = 16, br = 8 }) {
  return (
    <div style={{
      width, height, borderRadius: br, flexShrink: 0,
      background: v('--kpanel2'),
      animation: 'kPulse 1.8s ease-in-out infinite',
    }} />
  )
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: v('--kpanel'),
      border: `1px solid ${v('--kborder')}`,
      borderRadius: 10,
      padding: '14px 16px',
      ...style,
    }}>{children}</div>
  )
}

function CardTitle({ children, icon: Icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      {Icon && <Icon size={13} style={{ color: v('--kmuted'), flexShrink: 0 }} />}
      <span style={{ fontSize: 12, fontWeight: 600, color: v('--ktext'), fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em' }}>
        {children}
      </span>
    </div>
  )
}

function ConfBar({ value }) {
  const color = value >= 85 ? '#10b981' : value >= 65 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: v('--kborder'), overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 32, fontFamily: 'JetBrains Mono, monospace' }}>{value}%</span>
    </div>
  )
}

function ScoreBar({ label, value }) {
  const color = value >= 7 ? '#ef4444' : value >= 4 ? '#f59e0b' : '#10b981'
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: v('--kmuted') }}>
        <span>{label}</span>
        <span style={{ color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{value}/10</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: v('--kborder'), overflow: 'hidden' }}>
        <div style={{ width: `${value * 10}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

// Radio option card used in Proposal tab
function RadioCard({ id, label, description, selected, onSelect, recommended }) {
  return (
    <div onClick={() => onSelect(id)} style={{
      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
      background: selected ? v('--kpanel2') : 'transparent',
      border: `1px solid ${selected ? v('--kaccent') : v('--kborder')}`,
      transition: 'all 200ms ease', position: 'relative',
    }}>
      {recommended && (
        <span style={{
          position: 'absolute', top: -8, right: 8, fontSize: 9, fontWeight: 700,
          background: '#10b981', color: '#fff', borderRadius: 4, padding: '1px 6px',
          letterSpacing: '0.05em',
        }}>RECOMMANDÉ</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${selected ? v('--kaccent') : v('--kborder')}`,
          background: selected ? v('--kaccent') : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 200ms ease',
        }}>
          {selected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: v('--ktext') }}>{label}</div>
          {description && <div style={{ fontSize: 11, color: v('--kmuted'), marginTop: 1 }}>{description}</div>}
        </div>
      </div>
    </div>
  )
}

// Toggle switch
function Toggle({ checked, onChange, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: disabled ? 'default' : 'pointer',
      background: checked ? v('--kaccent') : v('--kborder'),
      position: 'relative', flexShrink: 0, transition: 'background 200ms ease', padding: 0,
      opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: checked ? 19 : 3,
        transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

// Section wrapper for proposal options
function ProposalSection({ title, Icon: SectionIcon, children }) {
  return (
    <Card style={{ marginBottom: 10 }}>
      <CardTitle icon={SectionIcon}>{title}</CardTitle>
      {children}
    </Card>
  )
}

// ── Tab: Vue d'ensemble ───────────────────────────────────────────
function TabOverview({ analysis, imagePreview, imageName }) {
  const typeMeta = TYPE_META[analysis.type] || TYPE_META.other
  const detected = analysis.detected_elements || DEMO_ANALYSIS.detected_elements
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {/* Image */}
      <div style={{ flex: '0 0 200px' }}>
        <div style={{ border: `1px solid ${v('--kborder')}`, borderRadius: 10, overflow: 'hidden' }}>
          <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 180 }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: v('--kmuted'), textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
          {imageName}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Detection */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              background: v('--kpanel2'), color: v('--ktext'),
              border: `1px solid ${v('--kborder')}`,
              borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 500,
            }}>{typeMeta.label}</span>
            <span style={{ fontSize: 11, color: v('--kmuted') }}>Confiance</span>
          </div>
          <ConfBar value={analysis.confidence || 90} />
          <p style={{ margin: '10px 0 0', fontSize: 13, color: v('--ktext'), lineHeight: 1.65 }}>
            {analysis.description}
          </p>
        </Card>

        {/* Detected elements */}
        <Card>
          <CardTitle>Éléments détectés</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            {Object.entries(detected).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                {val
                  ? <CheckSquare size={13} style={{ color: v('--kaccent'), flexShrink: 0 }} />
                  : <Square      size={13} style={{ color: v('--kborder'), flexShrink: 0 }} />
                }
                <span style={{ color: val ? v('--ktext') : v('--kmuted') }}>{ELEMENT_LABELS[key] || key}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Tab: Design ───────────────────────────────────────────────────
function TabDesign({ analysis }) {
  const [copied, setCopied] = useState(null)
  const colors     = analysis.colors    || DEMO_ANALYSIS.colors
  const typo       = analysis.typography || DEMO_ANALYSIS.typography
  const styles     = analysis.style     || DEMO_ANALYSIS.style
  const layout     = analysis.layout    || DEMO_ANALYSIS.layout

  const typEntries = (typo && !Array.isArray(typo)) ? Object.values(typo) : Object.values(DEMO_ANALYSIS.typography)

  const copyHex = hex => {
    navigator.clipboard.writeText(hex).catch(() => {})
    setCopied(hex); setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Palette */}
      <Card>
        <CardTitle icon={Palette}>Palette de couleurs</CardTitle>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {colors.map((c, i) => {
            const hex = c.hex || c
            return (
              <div key={i} onClick={() => copyHex(hex)} title={`Copier ${hex}`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: hex,
                  border: `2px solid ${v('--kborder')}`,
                  boxShadow: copied === hex ? `0 0 0 3px ${hex}55` : 'none',
                  transition: 'box-shadow 200ms ease',
                }} />
                <span style={{ fontSize: 10, color: v('--kmuted'), fontFamily: 'JetBrains Mono, monospace' }}>{hex}</span>
                <span style={{ fontSize: 10, color: copied === hex ? '#10b981' : v('--ksubtle'), padding: '1px 5px', background: v('--kpanel2'), borderRadius: 4 }}>
                  {copied === hex ? 'Copié' : (c.role || '')}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Typography */}
      <Card>
        <CardTitle>Typographie</CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {typEntries.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 10px', background: v('--kpanel2'), borderRadius: 8,
            }}>
              <span style={{ fontSize: i === 0 ? 18 : i === 1 ? 14 : 12, fontWeight: t.weight || 400, color: v('--ktext'), minWidth: 80 }}>
                {t.role || `Style ${i + 1}`}
              </span>
              <span style={{ fontSize: 11, color: v('--kmuted'), fontFamily: 'JetBrains Mono, monospace' }}>
                {t.font || 'Inter'} · {t.size || '16px'} · w{t.weight || '400'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Style tags */}
      <Card>
        <CardTitle>Style visuel</CardTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_STYLE_TAGS.map(tag => {
            const active = styles.some(s =>
              s.toLowerCase().replace(/ /g,'').includes(tag.toLowerCase().replace(/ /g,'')) ||
              tag.toLowerCase().replace(/ /g,'').includes(s.toLowerCase().replace(/ /g,''))
            )
            return (
              <span key={tag} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: active ? 600 : 400,
                background: active ? v('--kpanel2') : 'transparent',
                color: active ? v('--ktext') : v('--ksubtle'),
                border: `1px solid ${active ? v('--kaccent') : v('--kborder')}`,
              }}>{tag}</span>
            )
          })}
        </div>
      </Card>

      {/* Layout */}
      <Card style={{ padding: '10px 14px' }}>
        <CardTitle>Rythme & Espacement</CardTitle>
        <span style={{ fontSize: 12, color: v('--kmuted'), fontFamily: 'JetBrains Mono, monospace' }}>{layout}</span>
      </Card>
    </div>
  )
}

// ── Tab: Proposition ──────────────────────────────────────────────
const FRONTEND_OPTIONS = [
  { id: 'react-tailwind', label: 'React + Tailwind CSS',  description: 'Recommandé pour landing pages', recommended: true },
  { id: 'nextjs',         label: 'Next.js + Tailwind',    description: 'Si SEO important'                                  },
  { id: 'vue',            label: 'Vue.js',                description: "Écosystème Vue préféré"                            },
  { id: 'html',           label: 'HTML / CSS pur',        description: 'Léger, sans framework'                             },
]
const BACKEND_OPTIONS = [
  { id: 'none',     label: 'Aucun backend',          description: 'Site statique — recommandé', recommended: true },
  { id: 'fastapi',  label: 'FastAPI (Python)',        description: 'Formulaires, API custom'                      },
  { id: 'node',     label: 'Node.js / Express',      description: 'Écosystème JS unifié'                         },
  { id: 'supabase', label: 'Supabase Edge Functions', description: 'Serverless intégré'                           },
]
const DATABASE_OPTIONS = [
  { id: 'none',     label: 'Aucune',     description: 'Pas de données dynamiques', recommended: true },
  { id: 'supabase', label: 'Supabase',   description: 'PostgreSQL + Auth + Storage'                  },
  { id: 'sqlite',   label: 'SQLite',     description: 'Léger, local'                                 },
  { id: 'mongodb',  label: 'MongoDB',    description: 'NoSQL flexible'                               },
]
const AUTH_OPTIONS = [
  { id: 'none',          label: 'Aucune',         recommended: true },
  { id: 'supabase_auth', label: 'Supabase Auth'                     },
  { id: 'jwt',           label: 'JWT Custom'                        },
  { id: 'clerk',         label: 'Clerk'                             },
]
const HOSTING_OPTIONS = [
  { id: 'vercel',        label: 'Vercel',        description: 'Recommandé pour React', recommended: true },
  { id: 'netlify',       label: 'Netlify',       description: 'Alternative Vercel'                       },
  { id: 'github_pages',  label: 'GitHub Pages',  description: 'Gratuit'                                  },
]
const FEATURES_LIST = [
  { id: 'responsive',       label: 'Responsive mobile-first', locked: true },
  { id: 'darkMode',         label: 'Dark mode toggle'                       },
  { id: 'scrollAnimations', label: 'Animations au scroll'                   },
  { id: 'hamburgerMenu',    label: 'Menu hamburger mobile'                  },
  { id: 'contactForm',      label: 'Formulaire de contact'                  },
  { id: 'seoTags',          label: 'SEO meta tags'                          },
  { id: 'analytics',        label: 'Google Analytics ready'                 },
  { id: 'pwa',              label: 'PWA manifest'                           },
]

function TabProposal({ selectedAction, setSelectedAction, proposalState, setProposalState }) {
  const toggleFeature = (id) => {
    setProposalState(prev => ({
      ...prev,
      features: { ...prev.features, [id]: !prev.features[id] },
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Action */}
      <ProposalSection title="Mode de génération" Icon={Zap}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {ACTION_OPTIONS.map(opt => (
            <RadioCard key={opt.id} {...opt} selected={selectedAction === opt.id} onSelect={setSelectedAction} />
          ))}
        </div>
      </ProposalSection>

      {/* Frontend */}
      <ProposalSection title="Frontend" Icon={Monitor}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FRONTEND_OPTIONS.map(opt => (
            <RadioCard key={opt.id} {...opt} selected={proposalState.frontend === opt.id}
              onSelect={v => setProposalState(p => ({ ...p, frontend: v }))} />
          ))}
        </div>
      </ProposalSection>

      {/* Backend */}
      <ProposalSection title="Backend" Icon={Server}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {BACKEND_OPTIONS.map(opt => (
            <RadioCard key={opt.id} {...opt} selected={proposalState.backend === opt.id}
              onSelect={val => setProposalState(p => ({ ...p, backend: val }))} />
          ))}
        </div>
      </ProposalSection>

      {/* Database */}
      <ProposalSection title="Base de données" Icon={Database}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DATABASE_OPTIONS.map(opt => (
            <RadioCard key={opt.id} {...opt} selected={proposalState.database === opt.id}
              onSelect={val => setProposalState(p => ({ ...p, database: val }))} />
          ))}
        </div>
      </ProposalSection>

      {/* Auth */}
      <ProposalSection title="Authentification" Icon={Shield}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {AUTH_OPTIONS.map(opt => (
            <RadioCard key={opt.id} {...opt} selected={proposalState.auth === opt.id}
              onSelect={val => setProposalState(p => ({ ...p, auth: val }))} />
          ))}
        </div>
      </ProposalSection>

      {/* Hosting */}
      <ProposalSection title="Hébergement" Icon={Globe}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {HOSTING_OPTIONS.map(opt => (
            <RadioCard key={opt.id} {...opt} selected={proposalState.hosting === opt.id}
              onSelect={val => setProposalState(p => ({ ...p, hosting: val }))} />
          ))}
        </div>
      </ProposalSection>

      {/* Features */}
      <Card>
        <CardTitle>Fonctionnalités à générer</CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FEATURES_LIST.map(f => {
            const on = proposalState.features[f.id] !== false && proposalState.features[f.id] !== undefined
              ? proposalState.features[f.id]
              : (f.id === 'responsive' || f.id === 'darkMode' || f.id === 'scrollAnimations' || f.id === 'hamburgerMenu' || f.id === 'seoTags')
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: f.locked ? v('--kmuted') : v('--ktext') }}>
                  {f.label}{f.locked && <span style={{ fontSize: 10, color: v('--ksubtle'), marginLeft: 6 }}>obligatoire</span>}
                </span>
                <Toggle checked={!!proposalState.features[f.id] ?? on} onChange={() => toggleFeature(f.id)} disabled={f.locked} />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Instructions */}
      <Card>
        <CardTitle>Instructions supplémentaires</CardTitle>
        <textarea
          value={proposalState.instructions}
          onChange={e => setProposalState(p => ({ ...p, instructions: e.target.value }))}
          placeholder="ex: En français, avec mon logo, ajouter section pricing..."
          rows={3}
          style={{
            width: '100%', background: v('--kpanel2'),
            border: `1px solid ${v('--kborder')}`,
            borderRadius: 8, padding: '10px 12px',
            color: v('--ktext'), fontSize: 13, resize: 'vertical',
            fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
            minHeight: 70,
          }}
        />
      </Card>
    </div>
  )
}

// ── Tab: Structure ────────────────────────────────────────────────
function TabStructure({ analysis }) {
  const [hovered, setHovered]  = useState(null)
  const sections   = analysis.sections   || DEMO_ANALYSIS.sections
  const responsive = analysis.responsive || DEMO_ANALYSIS.responsive
  const layout     = analysis.layout     || DEMO_ANALYSIS.layout

  const RESP_STATUS = {
    probable:   { label: 'probable',   color: '#10b981' },
    incertain:  { label: 'incertain',  color: '#f59e0b' },
    'confirmé': { label: 'confirmé',   color: '#10b981' },
    improbable: { label: 'improbable', color: '#ef4444' },
  }

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: v('--ktext'), fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>
          Carte des sections
        </div>
        <div style={{ border: `1px solid ${v('--kborder')}`, borderRadius: 10, overflow: 'hidden', height: 290 }}>
          {sections.map((s, i) => (
            <div key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                height: `${s.height_pct}%`,
                background: hovered === i
                  ? (s.color || '#1a1a35') + 'cc'
                  : (s.color || '#1a1a35') + '77',
                borderBottom: i < sections.length - 1 ? `1px solid ${v('--kborder')}44` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 12px', cursor: 'default', transition: 'background 200ms ease',
                overflow: 'hidden',
              }}
            >
              <span style={{ fontSize: 11, color: v('--ktext'), fontWeight: 500 }}>{s.name}</span>
              {hovered === i && (
                <div style={{
                  background: v('--kpanel'), border: `1px solid ${v('--kborder')}`,
                  borderRadius: 6, padding: '2px 8px', fontSize: 10, color: v('--kmuted'),
                  maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {(s.components || []).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 4, fontSize: 10, color: v('--ksubtle'), textAlign: 'center' }}>Hover pour les composants</div>
      </div>

      <div style={{ width: 165, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card>
          <CardTitle>Grille</CardTitle>
          <div style={{ fontSize: 11, color: v('--kmuted'), lineHeight: 1.8, fontFamily: 'JetBrains Mono, monospace' }}>
            {layout.split('·').map((p, i) => <div key={i}>{p.trim()}</div>)}
          </div>
        </Card>
        <Card>
          <CardTitle>Responsive</CardTitle>
          {[
            { icon: Monitor, label: 'Desktop', key: 'desktop' },
            { icon: LayoutGrid, label: 'Tablet',  key: 'tablet'  },
            { icon: Database,  label: 'Mobile',  key: 'mobile'  },
          ].map(({ icon: Ic, label, key }) => {
            const st = RESP_STATUS[responsive?.[key]] || RESP_STATUS.incertain
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: v('--ktext') }}>
                  <Ic size={12} style={{ color: v('--kmuted') }} /> {label}
                </div>
                <span style={{ fontSize: 10, color: st.color }}>{st.label}</span>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

// ── Tab: Composants ───────────────────────────────────────────────
function TabComponents({ analysis }) {
  const sections = analysis.sections || DEMO_ANALYSIS.sections
  const detected = analysis.detected_elements || DEMO_ANALYSIS.detected_elements

  const components = sections.flatMap(s =>
    (s.components || []).map(name => ({
      section: s.name, name,
      stars: /form|auth|table|modal/i.test(name) ? 3 : /nav|hero|grid/i.test(name) ? 2 : 1,
    }))
  )

  const missing = []
  if (!detected.form)      missing.push('Formulaire de contact')
  if (!detected.footer)    missing.push('Footer complet')
  missing.push('Loader / Skeleton', 'Toast notifications')
  if (detected.navigation) missing.push('Menu hamburger mobile')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Card>
        <CardTitle icon={Puzzle}>Composants identifiés</CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {components.slice(0, 14).map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', background: v('--kpanel2'), borderRadius: 7,
            }}>
              <span style={{
                fontSize: 10, color: v('--kaccent'),
                background: v('--kpanel'), border: `1px solid ${v('--kborder')}`,
                borderRadius: 4, padding: '1px 7px', minWidth: 60, textAlign: 'center', flexShrink: 0,
              }}>{c.section}</span>
              <span style={{ flex: 1, fontSize: 12, color: v('--ktext') }}>{c.name}</span>
              <span style={{ fontSize: 10, color: v('--ksubtle') }}>{'★'.repeat(c.stars)}</span>
            </div>
          ))}
        </div>
      </Card>

      {missing.length > 0 && (
        <Card>
          <CardTitle>Composants recommandés</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {missing.map((m, i) => (
              <div key={i} style={{ fontSize: 12, color: v('--kmuted'), display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: v('--kaccent'), flexShrink: 0 }} />
                {m}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Tab: Stack ────────────────────────────────────────────────────
function TabStack({ analysis }) {
  const complexity = analysis.complexity || DEMO_ANALYSIS.complexity
  const tokens     = analysis.estimated_tokens || DEMO_ANALYSIS.estimated_tokens
  const cost       = analysis.estimated_cost   || DEMO_ANALYSIS.estimated_cost
  const time       = analysis.estimated_time   || DEMO_ANALYSIS.estimated_time

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: v('--ktext'), fontFamily: 'Syne, sans-serif' }}>Score de complexité</span>
          <span style={{
            fontSize: 28, fontWeight: 800, lineHeight: 1, fontFamily: 'Syne, sans-serif',
            color: complexity.score >= 7 ? '#ef4444' : complexity.score >= 4 ? '#f59e0b' : '#10b981',
          }}>{complexity.score}<span style={{ fontSize: 14, fontWeight: 400, color: v('--kmuted') }}>/10</span></span>
        </div>
        <ScoreBar label="Design & animations"  value={complexity.design}        />
        <ScoreBar label="Structure & layout"   value={complexity.structure}     />
        <ScoreBar label="Interactivité"        value={complexity.interactivity} />
        <ScoreBar label="Backend nécessaire"   value={complexity.backend}       />
      </Card>

      <Card style={{ padding: '12px 14px' }}>
        <CardTitle>Estimation de génération</CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { label: 'Durée estimée', val: `~${time} secondes`                            },
            { label: 'Tokens',        val: `~${(tokens || 0).toLocaleString()} tokens`   },
            { label: 'Coût estimé',   val: `~$${(cost || 0).toFixed(3)}`                 },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: v('--kmuted') }}>{label}</span>
              <span style={{ color: v('--ktext'), fontFamily: 'JetBrains Mono, monospace' }}>{val}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Tab: Checklist ────────────────────────────────────────────────
const CHECKLIST_SECTIONS = [
  {
    name: 'Fichiers',
    items: [
      'index.html — Structure HTML complète',
      'src/App.jsx — Composant racine React',
      'src/components/Navbar.jsx',
      'src/components/Hero.jsx',
      'src/components/Features.jsx',
      'src/components/Footer.jsx',
      'src/index.css — Variables CSS + design system',
      'tailwind.config.js — Config couleurs custom',
    ],
  },
  {
    name: 'Design',
    items: [
      'Palette couleurs exacte (#hex)',
      'Typographie identique (Google Fonts)',
      'Spacing rhythm 8px grid',
      'Border-radius cohérent',
      'Shadows fidèles',
      'Gradient backgrounds',
    ],
  },
  {
    name: 'Responsive',
    items: [
      'Mobile 375px — Stack vertical',
      'Tablet 768px — Layout adapté',
      'Desktop 1280px — Layout original',
      'Menu hamburger mobile',
      'Images fluid',
    ],
  },
  {
    name: 'Performance',
    items: [
      'Images optimisées (lazy loading)',
      'CSS purgé (Tailwind)',
      'Fonts préchargées',
    ],
  },
]

function TabChecklist({ checkItems, setCheckItems }) {
  const [open, setOpen] = useState({ 'Fichiers': true })

  const toggle = (section, item) => {
    const key = `${section}::${item}`
    setCheckItems(prev => ({ ...prev, [key]: !(prev[key] !== false) }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <p style={{ fontSize: 12, color: v('--kmuted'), margin: '0 0 4px' }}>
        Décochez ce que vous ne souhaitez pas générer
      </p>
      {CHECKLIST_SECTIONS.map(sec => (
        <div key={sec.name} style={{ border: `1px solid ${v('--kborder')}`, borderRadius: 10, overflow: 'hidden' }}>
          <div
            onClick={() => setOpen(prev => ({ ...prev, [sec.name]: !prev[sec.name] }))}
            style={{
              padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
              cursor: 'pointer', userSelect: 'none', background: v('--kpanel'),
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: v('--ktext'), fontFamily: 'Syne, sans-serif' }}>{sec.name}</span>
            <ChevronDown size={14} style={{ color: v('--kmuted'), transform: open[sec.name] ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
          </div>
          {open[sec.name] && (
            <div style={{ padding: '4px 14px 12px', background: v('--kpanel') }}>
              {sec.items.map(item => {
                const checked = checkItems[`${sec.name}::${item}`] !== false
                return (
                  <div key={item} onClick={() => toggle(sec.name, item)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 0', cursor: 'pointer', fontSize: 12,
                    color: checked ? v('--ktext') : v('--ksubtle'),
                    borderBottom: `1px solid ${v('--kborder')}33`,
                  }}>
                    {checked
                      ? <CheckSquare size={13} style={{ color: v('--kaccent'), flexShrink: 0 }} />
                      : <Square      size={13} style={{ color: v('--kborder'),  flexShrink: 0 }} />
                    }
                    <span style={{ textDecoration: checked ? 'none' : 'line-through' }}>{item}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
const INITIAL_PROPOSAL = {
  frontend:     'react-tailwind',
  backend:      'none',
  database:     'none',
  auth:         'none',
  hosting:      'vercel',
  features: {
    responsive:       true,
    darkMode:         true,
    scrollAnimations: true,
    hamburgerMenu:    true,
    contactForm:      false,
    seoTags:          true,
    analytics:        false,
    pwa:              false,
  },
  instructions: '',
}

export default function ImageAnalysisPanel({ image, onGenerate, onClose, apiOnline }) {
  const [analysis, setAnalysis]             = useState(null)
  const [analyzing, setAnalyzing]           = useState(true)
  const [progress, setProgress]             = useState(0)
  const [activeTab, setActiveTab]           = useState('proposal') // default: Proposition
  const [selectedAction, setSelectedAction] = useState('clone_exact')
  const [proposalState, setProposalState]   = useState(INITIAL_PROPOSAL)
  const [checkItems, setCheckItems]         = useState({})
  const [visible, setVisible]               = useState(false)
  const progressRef                         = useRef(null)

  // Slide in
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  // Progress bar
  useEffect(() => {
    if (!analyzing) { setProgress(100); return }
    setProgress(0)
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 90) { clearInterval(progressRef.current); return 90 }
        return p + (p < 50 ? 8 : p < 80 ? 4 : 1)
      })
    }, 120)
    return () => clearInterval(progressRef.current)
  }, [analyzing])

  // Auto-analyze
  useEffect(() => {
    setAnalyzing(true)
    const run = async () => {
      if (!apiOnline || !image?.base64) {
        await new Promise(r => setTimeout(r, 1500))
        const result = normalizeAnalysis(DEMO_ANALYSIS)
        setAnalysis(result)
        setSelectedAction(result.suggested_action || 'clone_exact')
        setAnalyzing(false)
        return
      }
      try {
        const res = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: image.base64, media_type: image.mediaType || 'image/png' }),
        })
        if (!res.ok) throw new Error('API error')
        const data   = await res.json()
        const result = normalizeAnalysis(data)
        setAnalysis(result)
        setSelectedAction(result.suggested_action || 'clone_exact')
        // Seed hosting from suggestion
        if (result.suggested_hosting) {
          setProposalState(p => ({ ...p, hosting: result.suggested_hosting.toLowerCase() === 'netlify' ? 'netlify' : 'vercel' }))
        }
      } catch {
        const result = normalizeAnalysis(DEMO_ANALYSIS)
        setAnalysis(result)
        setSelectedAction(result.suggested_action || 'clone_exact')
      } finally {
        setAnalyzing(false)
      }
    }
    run()
  }, []) // eslint-disable-line

  // Escape key
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 280)
  }, [onClose])

  const handleGenerate = useCallback(() => {
    const stack = deriveStack(proposalState)
    const activeFeatures = Object.entries(proposalState.features)
      .filter(([, v]) => v).map(([k]) => k)

    const prompts = {
      clone_exact: `Tu es un expert en reverse engineering d'interfaces. Reproduis cette interface pixel par pixel en HTML/CSS/JS. Copie exactement les couleurs, polices, espacements et composants. Stack: ${stack.join(', ')}.`,
      inspire:     `Utilise ce design comme inspiration. Crée une app avec un style visuel similaire mais un contenu et une marque différents. Stack: ${stack.join(', ')}.`,
      redesign:    `Redesigne cette interface avec un look moderne et amélioré. Garde l'objectif mais élève le design. Stack: ${stack.join(', ')}.`,
      improve:     `Clone cette interface fidèlement puis applique des améliorations UX modernes. Stack: ${stack.join(', ')}.`,
      analyze_only:`Fournis une analyse détaillée de cette interface sous forme d'app HTML interactive.`,
    }
    const base         = prompts[selectedAction] || prompts.clone_exact
    const featuresNote = activeFeatures.length ? `\nFonctionnalités: ${activeFeatures.join(', ')}.` : ''
    const extra        = proposalState.instructions.trim()
    const full         = [base + featuresNote, extra ? `Instructions: ${extra}` : ''].filter(Boolean).join('\n\n')

    onGenerate(full, stack, image.base64, {}, selectedAction, image.mediaType || 'image/png')
    handleClose()
  }, [selectedAction, proposalState, image, onGenerate, handleClose])

  const data         = analysis || DEMO_ANALYSIS
  const imagePreview = image?.preview || ''
  const imageName    = image?.name    || 'image.png'

  return (
    <>
      <style>{`
        @keyframes kPulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.5 }
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
        zIndex: 1000, opacity: visible ? 1 : 0, transition: 'opacity 280ms ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
        width: 'min(820px, 100vw)',
        background: v('--kbg'),
        borderLeft: `1px solid ${v('--kborder')}`,
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms ease',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 22px', borderBottom: `1px solid ${v('--kborder')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, background: v('--kbg'),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScanSearch size={18} style={{ color: v('--kaccent') }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: v('--ktext'), fontFamily: 'Syne, sans-serif' }}>
                Analyse Claude Vision
              </div>
              <div style={{ fontSize: 11, color: v('--kmuted'), marginTop: 1 }}>
                {analyzing ? 'Analyse en cours…' : 'Image analysée par IA'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleGenerate} disabled={analyzing} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              cursor: analyzing ? 'not-allowed' : 'pointer',
              background: analyzing ? v('--kpanel2') : v('--ktext'),
              color: analyzing ? v('--ksubtle') : v('--kbg'),
              fontSize: 13, fontWeight: 500, transition: 'all 200ms ease',
            }}>
              <Zap size={14} />
              Générer
            </button>
            <button onClick={handleClose} style={{
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${v('--kborder')}`,
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: v('--kmuted'), transition: 'background 200ms ease',
            }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: v('--kborder'), flexShrink: 0 }}>
          <div style={{
            height: '100%', background: v('--kaccent'),
            width: `${progress}%`,
            transition: analyzing ? 'width 0.12s linear' : 'width 0.5s ease',
          }} />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${v('--kborder')}`,
          background: v('--kbg'), flexShrink: 0, overflowX: 'auto', padding: '0 6px',
        }}>
          {TABS.map(({ id, Icon: TabIcon, label }) => {
            const active = activeTab === id
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '11px 14px', background: 'none', border: 'none',
                borderBottom: `2px solid ${active ? v('--kaccent') : 'transparent'}`,
                color: active ? v('--ktext') : v('--kmuted'),
                cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap', transition: 'color 200ms ease, border-color 200ms ease',
                flexShrink: 0, marginBottom: -1,
              }}>
                <TabIcon size={13} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {analyzing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[90, 50, 100, 35, 75, 60, 85].map((w, i) => (
                <Skeleton key={i} width={`${w}%`} height={i % 3 === 0 ? 56 : 16} br={i % 3 === 0 ? 10 : 6} />
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'overview'   && <TabOverview   analysis={data} imagePreview={imagePreview} imageName={imageName} />}
              {activeTab === 'design'     && <TabDesign     analysis={data} />}
              {activeTab === 'proposal'   && <TabProposal   selectedAction={selectedAction} setSelectedAction={setSelectedAction} proposalState={proposalState} setProposalState={setProposalState} />}
              {activeTab === 'structure'  && <TabStructure  analysis={data} />}
              {activeTab === 'components' && <TabComponents analysis={data} />}
              {activeTab === 'stack'      && <TabStack      analysis={data} />}
              {activeTab === 'checklist'  && <TabChecklist  checkItems={checkItems} setCheckItems={setCheckItems} />}
            </>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: '12px 22px', borderTop: `1px solid ${v('--kborder')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: v('--kbg'), flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
              border: `1px solid ${v('--kborder')}`,
              borderRadius: 20, padding: '3px 10px', color: v('--kmuted'),
            }}>
              <Eye size={11} /> Claude Vision
            </span>
            <span style={{ fontSize: 11, color: v('--ksubtle'), fontFamily: 'JetBrains Mono, monospace' }}>
              ~{(data.estimated_tokens || 0).toLocaleString()} tokens · ~${(data.estimated_cost || 0).toFixed(3)}
            </span>
          </div>

          <button onClick={handleGenerate} disabled={analyzing} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 22px', borderRadius: 8, border: 'none',
            cursor: analyzing ? 'not-allowed' : 'pointer',
            background: analyzing ? v('--kpanel2') : v('--ktext'),
            color: analyzing ? v('--ksubtle') : v('--kbg'),
            fontSize: 13, fontWeight: 600, transition: 'opacity 200ms ease',
            opacity: analyzing ? 0.6 : 1,
          }}>
            <Zap size={14} />
            Valider et générer
          </button>
        </div>
      </div>
    </>
  )
}
