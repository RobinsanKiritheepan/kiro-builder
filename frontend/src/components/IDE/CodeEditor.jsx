import { useState, useEffect, useRef, useCallback } from 'react'
import { useIDE } from './IDEContext.jsx'
import { FileIcon, getLang, highlightCode, fileKey } from './utils.jsx'

function EditorTab({ file, isActive, onActivate, onClose, unsaved }) {
  const [hover, setHover] = useState(false)
  const k = fileKey(file)
  return (
    <div
      onClick={onActivate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 10px', height: 34, cursor: 'pointer',
        borderRight: '1px solid var(--kborder)',
        borderBottom: isActive ? '2px solid var(--kaccent, #6366f1)' : '2px solid transparent',
        background: isActive ? 'var(--kbg)' : hover ? 'var(--kpanel)' : 'var(--kpanel2)',
        fontSize: 12, color: isActive ? 'var(--ktext)' : 'var(--ksubtle)',
        flexShrink: 0, maxWidth: 160,
        fontFamily: 'Inter, sans-serif',
        transition: 'background 0.1s',
        userSelect: 'none',
      }}
    >
      <FileIcon name={file.name} size={12} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </span>
      {unsaved && (
        <span style={{ color: '#f59e0b', fontSize: 16, lineHeight: 1, marginRight: -2 }}>●</span>
      )}
      {(hover || isActive) && (
        <button
          onClick={e => { e.stopPropagation(); onClose(k) }}
          style={{
            width: 16, height: 16, border: 'none', background: 'none',
            cursor: 'pointer', color: 'var(--ksubtle)', borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: 0, marginLeft: unsaved ? 0 : 2,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--kpanel2)'; e.currentTarget.style.color = 'var(--ktext)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--ksubtle)' }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default function CodeEditor({ onPushChanges, onSaveNow }) {
  const { currentFile, openTabs, activeKey, closeTab, openFile, updateContent, markSaved, unsavedKeys, hasUnsaved, getPushableFiles } = useIDE()
  const [cursor, setCursor]   = useState({ ln: 1, col: 1 })
  const [copied, setCopied]   = useState(false)
  const textareaRef = useRef(null)
  const lineNumRef  = useRef(null)
  const scrollRef   = useRef(null)

  const content  = currentFile?.content || ''
  const htmlCode = currentFile ? highlightCode(content, currentFile.name) : ''
  const lineCount = content ? content.split('\n').length : 1

  // Sync line numbers scroll with code scroll
  const handleScroll = useCallback(() => {
    if (lineNumRef.current && scrollRef.current) {
      lineNumRef.current.scrollTop = scrollRef.current.scrollTop
    }
  }, [])

  const updateCursor = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const text  = ta.value.slice(0, ta.selectionStart)
    const lines = text.split('\n')
    setCursor({ ln: lines.length, col: lines[lines.length - 1].length + 1 })
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (!currentFile) return
    const k  = fileKey(currentFile)
    const ta = e.target

    // Ctrl+S — immediate save to API + mark saved
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      onSaveNow?.(k)
      markSaved(k)
      return
    }

    // Tab → 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const start  = ta.selectionStart
      const end    = ta.selectionEnd
      const newVal = ta.value.slice(0, start) + '  ' + ta.value.slice(end)
      // direct DOM update for instant response, state follows
      ta.value = newVal
      ta.selectionStart = ta.selectionEnd = start + 2
      updateContent(k, newVal)
      return
    }

    // Auto-close pairs
    const pairs = { '(': ')', '[': ']', '{': '}' }
    if (pairs[e.key] && ta.selectionStart === ta.selectionEnd) {
      e.preventDefault()
      const pos    = ta.selectionStart
      const newVal = ta.value.slice(0, pos) + e.key + pairs[e.key] + ta.value.slice(pos)
      ta.value = newVal
      ta.selectionStart = ta.selectionEnd = pos + 1
      updateContent(k, newVal)
      return
    }

    // Auto-indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault()
      const pos       = ta.selectionStart
      const lineStart = ta.value.lastIndexOf('\n', pos - 1) + 1
      const line      = ta.value.slice(lineStart, pos)
      const indent    = line.match(/^(\s*)/)?.[1] || ''
      const extra     = /[{(\[]\s*$/.test(line) ? '  ' : ''
      const newVal    = ta.value.slice(0, pos) + '\n' + indent + extra + ta.value.slice(ta.selectionEnd)
      ta.value = newVal
      const newPos = pos + 1 + indent.length + extra.length
      ta.selectionStart = ta.selectionEnd = newPos
      updateContent(k, newVal)
    }
  }, [currentFile, updateContent, markSaved])

  const handleChange = useCallback((e) => {
    if (!currentFile) return
    updateContent(fileKey(currentFile), e.target.value)
  }, [currentFile, updateContent])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = currentFile?.name || 'file.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  // Welcome screen when no tabs open
  if (openTabs.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: 'var(--kpanel)', color: 'var(--ksubtle)', gap: 10,
      }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--kborder2)" strokeWidth="1.5">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
        <p style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', margin: 0, color: 'var(--ksubtle)' }}>
          Select a file to start editing
        </p>
      </div>
    )
  }

  const isUnsaved = currentFile ? unsavedKeys.has(fileKey(currentFile)) : false
  const lang      = currentFile ? getLang(currentFile.name) : ''

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--kpanel)' }}>

      {/* Tab bar */}
      <div style={{
        display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--kborder)',
        background: 'var(--kpanel2)', flexShrink: 0,
      }} className="cv-scrollbar-x">
        {openTabs.map(f => (
          <EditorTab
            key={fileKey(f)}
            file={f}
            isActive={fileKey(f) === activeKey}
            onActivate={() => openFile(f)}
            onClose={closeTab}
            unsaved={unsavedKeys.has(fileKey(f))}
          />
        ))}
      </div>

      {/* Breadcrumb */}
      {currentFile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 12px', borderBottom: '1px solid var(--kborder)',
          background: 'var(--kbg)', fontSize: 11, color: 'var(--ksubtle)',
          fontFamily: 'Inter, sans-serif', flexShrink: 0,
        }}>
          <span>{currentFile.path || '/'}</span>
          <span style={{ fontSize: 13 }}>›</span>
          <span style={{ color: 'var(--ktext)', fontWeight: 500 }}>{currentFile.name}</span>
          {isUnsaved && (
            <span style={{ color: '#f59e0b', marginLeft: 6, fontSize: 10, fontWeight: 600 }}>● Modified</span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '3px 8px', background: 'var(--kpanel, white)', borderBottom: '1px solid var(--kborder, #e5e7eb)',
        gap: 4, flexShrink: 0,
      }}>
        {/* Push button */}
        {onPushChanges && (
          <button
            onClick={() => {
              const allFiles = getPushableFiles()
              onPushChanges(allFiles)
              // Mark all as saved
              unsavedKeys.forEach(k => markSaved(k))
            }}
            style={{
              padding: '3px 12px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontWeight: 600,
              marginRight: 'auto',
              background: hasUnsaved ? 'var(--kaccent, #6366f1)' : 'var(--kpanel2, #f3f4f6)',
              color: hasUnsaved ? '#fff' : 'var(--ksubtle, #9ca3af)',
              border: hasUnsaved ? 'none' : '1px solid var(--kborder, #e5e7eb)',
              boxShadow: hasUnsaved ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Push Changes
          </button>
        )}
        {[
          { label: copied ? 'Copied!' : 'Copy', onClick: handleCopy },
          { label: 'Download', onClick: handleDownload },
        ].map(({ label, onClick }) => (
          <button
            key={label} onClick={onClick}
            style={{
              padding: '2px 9px', fontSize: 11, border: '1px solid var(--kborder, #e5e7eb)',
              borderRadius: 5, background: 'var(--kpanel, white)', cursor: 'pointer',
              color: 'var(--kmuted, #6b7280)', fontFamily: 'Inter, sans-serif',
              transition: 'border-color 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--kborder, #e5e7eb)'}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Editor: line numbers + code */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Line numbers — synced scroll */}
        <div
          ref={lineNumRef}
          style={{
            width: 48, flexShrink: 0,
            background: 'var(--kpanel)', borderRight: '1px solid var(--kborder)',
            overflow: 'hidden',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
            lineHeight: 1.6, color: 'var(--ksubtle)', textAlign: 'right',
            paddingTop: 12, paddingRight: 8, paddingBottom: 12,
            userSelect: 'none',
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} style={{ height: '1.6em', lineHeight: '1.6em' }}>{i + 1}</div>
          ))}
        </div>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflow: 'auto', position: 'relative' }}
          className="cv-scrollbar"
        >
          {/* Inner wrapper — sizes to content */}
          <div style={{ position: 'relative', minHeight: '100%', minWidth: '100%', display: 'inline-block', width: '100%' }}>

            {/* Syntax highlighted underlay */}
            <pre
              style={{
                margin: 0, padding: '12px 14px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12, lineHeight: 1.6,
                whiteSpace: 'pre',
                background: 'var(--kbg)',
                pointerEvents: 'none',
                minHeight: '100%',
                minWidth: '100%',
                display: 'block',
              }}
            >
              <code
                dangerouslySetInnerHTML={{ __html: htmlCode || ' ' }}
                style={{ display: 'block', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
              />
            </pre>

            {/* Editable textarea overlay */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onClick={updateCursor}
              onKeyUp={updateCursor}
              onSelect={updateCursor}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                padding: '12px 14px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12, lineHeight: 1.6,
                color: 'transparent',
                caretColor: '#374151',
                background: 'transparent',
                border: 'none', outline: 'none',
                resize: 'none',
                overflow: 'hidden',
                whiteSpace: 'pre',
                zIndex: 1,
              }}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '2px 12px', background: 'var(--kpanel2)', borderTop: '1px solid var(--kborder)',
        fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'Inter, sans-serif',
        flexShrink: 0, height: 22,
      }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span>Ln {cursor.ln}, Col {cursor.col}</span>
          <span style={{ textTransform: 'capitalize' }}>{lang}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span>{lineCount} lines</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}
