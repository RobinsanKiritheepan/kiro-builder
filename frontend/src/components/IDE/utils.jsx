// Shared utilities for IDE components

export const EXT_META = {
  js:   { color: '#f7df1e', bg: '#fefce8', label: 'JS' },
  jsx:  { color: '#61dafb', bg: '#eff9fe', label: 'JSX' },
  ts:   { color: '#3178c6', bg: '#eff4fd', label: 'TS' },
  tsx:  { color: '#3178c6', bg: '#eff4fd', label: 'TSX' },
  py:   { color: '#3776ab', bg: '#eef4fb', label: 'PY' },
  html: { color: '#e34f26', bg: '#fef2ee', label: 'HTML' },
  css:  { color: '#264de4', bg: '#eef0fd', label: 'CSS' },
  json: { color: '#f7810a', bg: '#fef4ec', label: 'JSON' },
  md:   { color: '#083fa1', bg: '#eef3fd', label: 'MD' },
  svg:  { color: '#ffb13b', bg: '#fffbf0', label: 'SVG' },
  sh:   { color: '#89e051', bg: '#f3feec', label: 'SH' },
  yml:  { color: '#cb171e', bg: '#fef0f0', label: 'YML' },
  yaml: { color: '#cb171e', bg: '#fef0f0', label: 'YML' },
  env:  { color: '#aaaaaa', bg: '#f5f5f5', label: 'ENV' },
  txt:  { color: '#9ca3af', bg: '#f9fafb', label: 'TXT' },
  sql:  { color: '#00758f', bg: '#eef8fa', label: 'SQL' },
  rs:   { color: '#ce4a17', bg: '#fef3ee', label: 'RS' },
  go:   { color: '#00acd7', bg: '#eef9fd', label: 'GO' },
  rb:   { color: '#cc342d', bg: '#fef0f0', label: 'RB' },
  php:  { color: '#777bb4', bg: '#f3f2fb', label: 'PHP' },
}

export const HLJS_LANG_MAP = {
  js:   'javascript',
  jsx:  'javascript',
  ts:   'typescript',
  tsx:  'typescript',
  py:   'python',
  html: 'html',
  css:  'css',
  json: 'json',
  md:   'markdown',
  sh:   'bash',
  yml:  'yaml',
  yaml: 'yaml',
  svg:  'xml',
  rs:   'rust',
  go:   'go',
  rb:   'ruby',
  php:  'php',
  sql:  'sql',
}

export const getExt  = name => (name.split('.').pop() || '').toLowerCase()
export const getMeta = name => EXT_META[getExt(name)] || { color: '#9ca3af', bg: '#f9fafb', label: '◦' }
export const getLang = name => HLJS_LANG_MAP[getExt(name)] || 'plaintext'
export const fileKey = f    => `${f.path || '/'}${f.name}`

export function highlightCode(code, filename) {
  if (!window.hljs || !code) return escapeHtml(code || '')
  const lang = getLang(filename || '')
  try {
    return window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
  } catch {
    return window.hljs.highlight(code, { language: 'plaintext', ignoreIllegals: true }).value
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function FileIcon({ name, size = 14 }) {
  const m = getMeta(name)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 6,
        height: size + 2,
        borderRadius: 3,
        fontSize: 8,
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        color: m.color,
        background: m.bg,
        flexShrink: 0,
        letterSpacing: '-0.02em',
        border: `1px solid ${m.color}30`,
      }}
    >
      {m.label}
    </span>
  )
}
