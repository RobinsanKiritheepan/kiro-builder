import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { fileKey } from './IDE/utils.jsx'

/* ── Extension metadata ──────────────────────────────────── */
const EXT_META = {
  jsx:  { color: '#06b6d4', bg: '#ecfeff',  label: '⚛' },
  tsx:  { color: '#3b82f6', bg: '#eff6ff',  label: '⚛' },
  js:   { color: '#f59e0b', bg: '#fffbeb',  label: 'JS' },
  ts:   { color: '#3b82f6', bg: '#eff6ff',  label: 'TS' },
  py:   { color: '#f59e0b', bg: '#fefce8',  label: 'Py' },
  css:  { color: '#8b5cf6', bg: '#f5f3ff',  label: '~' },
  html: { color: '#f97316', bg: '#fff7ed',  label: '<>' },
  json: { color: '#10b981', bg: '#ecfdf5',  label: '{}' },
  sql:  { color: '#6366f1', bg: '#eef2ff',  label: 'DB' },
  md:   { color: '#64748b', bg: '#f8fafc',  label: '#' },
  env:  { color: '#9ca3af', bg: '#f9fafb',  label: '⚙' },
  svg:  { color: '#ec4899', bg: '#fdf2f8',  label: '◈' },
  bat:  { color: '#64748b', bg: '#f8fafc',  label: '▸' },
  sh:   { color: '#64748b', bg: '#f8fafc',  label: '$' },
  txt:  { color: '#9ca3af', bg: '#f9fafb',  label: '≡' },
  ico:  { color: '#f97316', bg: '#fff7ed',  label: '⊕' },
}

const HLJS_LANG_MAP = {
  jsx: 'javascript', tsx: 'typescript', js: 'javascript',
  ts: 'typescript', py: 'python', css: 'css', html: 'html',
  json: 'json', sql: 'sql', md: 'markdown', env: 'bash',
  sh: 'bash', bat: 'dos',
}

const getExt     = n => (n.split('.').pop() || '').toLowerCase()
const getMeta    = n => EXT_META[getExt(n)] || { color: '#9ca3af', bg: '#f9fafb', label: '◦' }
const getLang    = n => HLJS_LANG_MAP[getExt(n)] || 'plaintext'
// fileKey imported from IDE/utils.jsx (shared canonical implementation)

/* ── Build tree from flat filesList ─────────────────────── */
function buildTree(filesList) {
  const root = {}
  for (const f of filesList) {
    const rawPath = (f.path || '').replace(/^\//, '').replace(/\/$/, '')
    const parts   = rawPath ? rawPath.split('/') : []
    let node = root
    for (const part of parts) {
      if (!node[part]) node[part] = { _isFolder: true, _children: {} }
      node = node[part]._children
    }
    node[f.name] = { _isFolder: false, _file: f }
  }
  return root
}

/* ── Syntax highlight via hljs ───────────────────────────── */
function highlightCode(code, filename) {
  const safe = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!window.hljs) return safe(code)
  try {
    const lang = getLang(filename)
    const l    = window.hljs.getLanguage(lang) ? lang : 'plaintext'
    return window.hljs.highlight(code, { language: l }).value
  } catch { return safe(code) }
}

/* ── FileIcon ────────────────────────────────────────────── */
function FileIcon({ name, size = 16 }) {
  const { color, bg, label } = getMeta(name)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: 3,
      background: bg, color, fontSize: size * 0.56,
      fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
      flexShrink: 0, lineHeight: 1, letterSpacing: '-0.03em',
    }}>
      {label}
    </span>
  )
}

/* ── TreeNode (recursive) ────────────────────────────────── */
function TreeNode({ name, node, depth = 0, activeKey, openKeys, onFileClick }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const pl = 10 + depth * 14

  if (node._isFolder) {
    const entries = Object.entries(node._children)
    const sorted  = [
      ...entries.filter(([, v]) =>  v._isFolder).sort((a, b) => a[0].localeCompare(b[0])),
      ...entries.filter(([, v]) => !v._isFolder).sort((a, b) => a[0].localeCompare(b[0])),
    ]
    return (
      <div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-1.5 text-left hover:bg-[#EBEBEB] transition-colors"
          style={{ paddingLeft: pl, paddingTop: 3, paddingBottom: 3, paddingRight: 8 }}
        >
          <svg
            style={{ width: 9, height: 9, color: '#9ca3af', flexShrink: 0, transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            fill="currentColor" viewBox="0 0 24 24"
          >
            <path d="M8 5l12 7-12 7V5z" />
          </svg>
          <svg style={{ width: 13, height: 13, color: expanded ? '#60a5fa' : '#94a3b8', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontSize: 11.5, color: '#374151', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
        </button>
        {expanded && sorted.map(([childName, childNode]) => (
          <TreeNode
            key={childName}
            name={childName}
            node={childNode}
            depth={depth + 1}
            activeKey={activeKey}
            openKeys={openKeys}
            onFileClick={onFileClick}
          />
        ))}
      </div>
    )
  }

  const f        = node._file
  const k        = fileKey(f)
  const isActive = activeKey === k
  const hasDot   = openKeys.includes(k) && !isActive

  return (
    <button
      onClick={() => onFileClick(f)}
      className="w-full flex items-center gap-1.5 text-left transition-colors"
      style={{
        paddingLeft: pl, paddingTop: 3, paddingBottom: 3, paddingRight: 8,
        background:   isActive ? '#EEF2FF' : 'transparent',
        borderLeft:   isActive ? '2px solid #6366F1' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F0F0F0' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      <FileIcon name={f.name} />
      <span style={{
        fontSize: 11.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: '"JetBrains Mono", monospace',
        color:      isActive ? '#6366F1' : '#4b5563',
        fontWeight: isActive ? 500 : 400,
      }}>
        {f.name}
      </span>
      {hasDot && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366F1', flexShrink: 0, opacity: 0.5 }} />
      )}
    </button>
  )
}

/* ── Tab ─────────────────────────────────────────────────── */
function EditorTab({ file, isActive, onActivate, onClose }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 cursor-pointer group flex-shrink-0 border-r border-[#EBEBEB]"
      style={{
        height: 36,
        background:   isActive ? '#FFFFFF' : 'transparent',
        borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
      }}
      onClick={onActivate}
    >
      <FileIcon name={file.name} size={14} />
      <span style={{
        fontSize: 12, fontFamily: '"JetBrains Mono", monospace',
        color:      isActive ? '#111111' : '#888888',
        fontWeight: isActive ? 500 : 400,
        whiteSpace: 'nowrap',
      }}>
        {file.name}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded flex items-center justify-center hover:bg-[#E0E0E0] flex-shrink-0 ml-0.5"
        style={{ fontSize: 11, color: '#888', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  )
}

/* ── Code pane ───────────────────────────────────────────── */
function CodePane({ file, isFullscreen, onToggleFullscreen }) {
  const [copied, setCopied] = useState(false)

  const htmlCode = useMemo(
    () => highlightCode(file.content || '', file.name),
    [file.content, file.name],
  )

  const lines = useMemo(
    () => (file.content || '').split('\n'),
    [file.content],
  )

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(file.content || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }, [file.content])

  const handleDownload = useCallback(() => {
    const blob = new Blob([file.content || ''], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: file.name })
    a.click()
    URL.revokeObjectURL(url)
  }, [file.content, file.name])

  return (
    <div className="flex flex-col h-full overflow-hidden relative" style={{ background: '#FFFFFF' }}>

      {/* Toolbar: top-right */}
      <div className="absolute top-2 right-3 flex items-center gap-1 z-10">
        <button
          onClick={handleCopy}
          title="Copy file"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
          style={{
            fontSize: 11, fontFamily: 'system-ui, sans-serif', fontWeight: 500,
            color:      copied ? '#10b981' : '#555',
            background: '#F5F5F5', border: '1px solid #E5E5E5',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EBEBEB' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F5' }}
        >
          {copied ? (
            <>
              <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
              Copied!
            </>
          ) : (
            <>
              <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          title="Download"
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ background: '#F5F5F5', border: '1px solid #E5E5E5', color: '#666' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EBEBEB' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F5' }}
        >
          <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Expand'}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ background: '#F5F5F5', border: '1px solid #E5E5E5', color: '#666' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EBEBEB' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F5' }}
        >
          {isFullscreen ? (
            <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Editor: line numbers + code */}
      <div
        className="flex-1 overflow-auto cv-scrollbar"
        style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, lineHeight: '1.6' }}
      >
        <div className="flex min-w-max">
          {/* Line numbers column */}
          <div
            className="select-none text-right flex-shrink-0 py-4"
            style={{
              minWidth: 48, paddingRight: 12, paddingLeft: 8,
              background: '#FAFAFA', color: '#C8C8C8',
              borderRight: '1px solid #F0F0F0',
              position: 'sticky', left: 0, zIndex: 1,
            }}
          >
            {lines.map((_, i) => (
              <div key={i} style={{ height: '1.6em' }}>{i + 1}</div>
            ))}
          </div>

          {/* Highlighted code */}
          <pre
            className="flex-1 py-4 px-4"
            style={{ margin: 0, background: 'transparent', whiteSpace: 'pre', overflowX: 'visible' }}
          >
            <code
              className={`language-${getLang(file.name)} hljs`}
              dangerouslySetInnerHTML={{ __html: htmlCode }}
              style={{ background: 'transparent', padding: 0, fontSize: 'inherit', fontFamily: 'inherit', lineHeight: 'inherit' }}
            />
          </pre>
        </div>
      </div>
    </div>
  )
}

/* ── Main CodeView ───────────────────────────────────────── */
export default function CodeView({ code, files = {}, filesList, activeFile, onFileSelect, onChange }) {
  const [leftTab,    setLeftTab]    = useState('Files')
  const [searchQ,    setSearchQ]    = useState('')
  const [openTabs,   setOpenTabs]   = useState([])   // array of file objects
  const [activeKey,  setActiveKey]  = useState(null) // current tab key
  const [fullscreen, setFullscreen] = useState(false)

  /* normalise to array format */
  const normalised = useMemo(() => {
    if (filesList && filesList.length > 0) return filesList
    return Object.entries(files).map(([name, content]) => ({
      name, path: '/', content, language: getLang(name),
    }))
  }, [filesList, files])

  /* build tree */
  const tree = useMemo(() => buildTree(normalised), [normalised])

  /* auto-open first file on mount / list change */
  useEffect(() => {
    if (normalised.length > 0 && openTabs.length === 0) {
      const first = normalised[0]
      setOpenTabs([first])
      setActiveKey(fileKey(first))
      onFileSelect?.(first.name)
    }
  }, [normalised]) // eslint-disable-line

  /* sync activeFile prop → activeKey */
  useEffect(() => {
    if (!activeFile) return
    const match = normalised.find(f => f.name === activeFile)
    if (match) {
      const k = fileKey(match)
      setActiveKey(k)
      setOpenTabs(prev => prev.find(f => fileKey(f) === k) ? prev : [...prev, match])
    }
  }, [activeFile]) // eslint-disable-line

  const handleFileClick = useCallback((f) => {
    const k = fileKey(f)
    setActiveKey(k)
    setOpenTabs(prev => prev.find(t => fileKey(t) === k) ? prev : [...prev, f])
    onFileSelect?.(f.name)
  }, [onFileSelect])

  const handleCloseTab = useCallback((k) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => fileKey(t) !== k)
      if (activeKey === k) setActiveKey(next.length > 0 ? fileKey(next[next.length - 1]) : null)
      return next
    })
  }, [activeKey])

  const currentFile = useMemo(
    () => openTabs.find(t => fileKey(t) === activeKey) || null,
    [openTabs, activeKey],
  )

  const filteredList = useMemo(() => {
    if (!searchQ.trim()) return normalised
    const q = searchQ.toLowerCase()
    return normalised.filter(f => f.name.toLowerCase().includes(q) || (f.path || '').toLowerCase().includes(q))
  }, [normalised, searchQ])

  const openKeys = useMemo(() => openTabs.map(fileKey), [openTabs])

  /* ── Render ── */
  return (
    <>
      <div className="flex h-full overflow-hidden" style={{ background: '#fff' }}>

        {/* ══ LEFT PANEL ══ */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: 220, borderRight: '1px solid #F0F0F0', background: '#FAFAFA' }}
        >
          {/* Tab pills header */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #F0F0F0' }}>
            {['Files', 'Search'].map(t => (
              <button
                key={t}
                onClick={() => setLeftTab(t)}
                className="px-3 py-1 rounded-full transition-all"
                style={{
                  fontSize: 11, fontWeight: 500, fontFamily: 'system-ui, sans-serif',
                  background:  leftTab === t ? '#FFFFFF' : 'transparent',
                  color:       leftTab === t ? '#111' : '#888',
                  boxShadow:   leftTab === t ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                  border:      leftTab === t ? '1px solid #E5E5E5' : '1px solid transparent',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search input */}
          {leftTab === 'Search' && (
            <div className="px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #F0F0F0' }}>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                <svg style={{ width: 12, height: 12, color: '#9ca3af', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search files..."
                  autoFocus
                  style={{ flex: 1, fontSize: 12, color: '#111', background: 'transparent', border: 'none', outline: 'none', fontFamily: '"JetBrains Mono", monospace' }}
                />
                {searchQ && (
                  <button onClick={() => setSearchQ('')} style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1 }}>×</button>
                )}
              </div>
            </div>
          )}

          {/* Tree / search results */}
          <div className="flex-1 overflow-y-auto py-1.5 cv-scrollbar">
            {leftTab === 'Files' && (
              Object.entries(tree).length > 0
                ? Object.entries(tree)
                    .sort((a, b) => {
                      if (a[1]._isFolder && !b[1]._isFolder) return -1
                      if (!a[1]._isFolder && b[1]._isFolder) return 1
                      return a[0].localeCompare(b[0])
                    })
                    .map(([name, node]) => (
                      <TreeNode
                        key={name}
                        name={name}
                        node={node}
                        depth={0}
                        activeKey={activeKey}
                        openKeys={openKeys}
                        onFileClick={handleFileClick}
                      />
                    ))
                : <p style={{ fontSize: 11, color: '#9ca3af', padding: '12px', fontFamily: 'system-ui, sans-serif' }}>No files</p>
            )}

            {leftTab === 'Search' && (
              filteredList.length > 0
                ? filteredList.map(f => (
                    <button
                      key={fileKey(f)}
                      onClick={() => handleFileClick(f)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#EBEBEB] transition-colors"
                    >
                      <FileIcon name={f.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#111', fontFamily: '"JetBrains Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path || '/'}</div>
                      </div>
                    </button>
                  ))
                : <p style={{ fontSize: 11, color: '#9ca3af', padding: '12px', fontFamily: 'system-ui, sans-serif' }}>
                    {searchQ ? 'No matches' : 'Type to search…'}
                  </p>
            )}
          </div>
        </div>

        {/* ══ RIGHT EDITOR ══ */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FFFFFF' }}>

          {/* Tabs bar */}
          <div
            className="flex items-stretch flex-shrink-0 overflow-x-auto cv-scrollbar-x"
            style={{ background: '#FAFAFA', borderBottom: '1px solid #F0F0F0', minHeight: 36 }}
          >
            {openTabs.map(f => (
              <EditorTab
                key={fileKey(f)}
                file={f}
                isActive={fileKey(f) === activeKey}
                onActivate={() => setActiveKey(fileKey(f))}
                onClose={() => handleCloseTab(fileKey(f))}
              />
            ))}
          </div>

          {/* Code or empty */}
          {currentFile ? (
            <CodePane
              file={currentFile}
              isFullscreen={false}
              onToggleFullscreen={() => setFullscreen(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ color: '#C8C8C8' }}>
              <svg style={{ width: 40, height: 40, marginBottom: 12 }} fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>Select a file to view its code</p>
              <p style={{ fontSize: 12, color: '#C8C8C8', marginTop: 4, fontFamily: 'system-ui, sans-serif' }}>Click any file in the panel on the left</p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && currentFile && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#FFFFFF' }}>
          <div className="flex items-center gap-2 px-4 flex-shrink-0" style={{ height: 40, borderBottom: '1px solid #F0F0F0', background: '#FAFAFA' }}>
            <FileIcon name={currentFile.name} />
            <span style={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', color: '#111' }}>{currentFile.name}</span>
            <div className="flex-1" />
            <button
              onClick={() => setFullscreen(false)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#E5E5E5] transition-colors"
              style={{ color: '#666' }}
            >
              <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodePane
              file={currentFile}
              isFullscreen={true}
              onToggleFullscreen={() => setFullscreen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
