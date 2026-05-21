import { useRef, useEffect, useCallback, useState } from 'react'

function getLanguage(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  const map = { html: 'html', css: 'css', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', json: 'json' }
  return map[ext] || 'html'
}

function countLines(code) {
  return (code.match(/\n/g) || []).length + 1
}

export default function CodeEditor({ code, filename, onChange }) {
  const textareaRef = useRef(null)
  const preRef      = useRef(null)
  const lineRef     = useRef(null)
  const [hlReady, setHlReady] = useState(!!window.hljs)

  // Wait for hljs to be available
  useEffect(() => {
    if (window.hljs) { setHlReady(true); return }
    const t = setInterval(() => { if (window.hljs) { setHlReady(true); clearInterval(t) } }, 200)
    return () => clearInterval(t)
  }, [])

  // Highlight whenever code or language changes
  useEffect(() => {
    if (!hlReady || !preRef.current) return
    const el = preRef.current.querySelector('code')
    if (!el) return
    el.textContent = code
    el.className = `language-${getLanguage(filename)}`
    window.hljs.highlightElement(el)
  }, [code, filename, hlReady])

  // Sync scroll
  const syncScroll = useCallback(() => {
    const tx = textareaRef.current
    const pr = preRef.current
    const ln = lineRef.current
    if (!tx || !pr || !ln) return
    pr.scrollTop  = tx.scrollTop
    pr.scrollLeft = tx.scrollLeft
    ln.scrollTop  = tx.scrollTop
  }, [])

  // Line numbers string
  const lineCount = countLines(code)
  const lineNums  = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')

  const handleChange = useCallback((e) => {
    onChange(e.target.value)
    syncScroll()
  }, [onChange, syncScroll])

  const handleTab = useCallback((e) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const tx    = e.target
    const start = tx.selectionStart
    const end   = tx.selectionEnd
    const next  = tx.value.slice(0, start) + '  ' + tx.value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      tx.selectionStart = tx.selectionEnd = start + 2
    })
  }, [onChange])

  return (
    <div className="flex-1 flex flex-col bg-kiro-bg overflow-hidden border-r border-kiro-border">
      {/* File tab */}
      <div className="flex items-center border-b border-kiro-border bg-kiro-panel px-2 h-9 flex-shrink-0 gap-0.5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-t border-b-2 border-kiro-accent bg-kiro-bg text-xs font-mono text-kiro-text">
          <svg className="w-3 h-3 text-kiro-subtle" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          {filename}
        </div>
        <div className="flex-1" />
        <span className="text-[11px] text-kiro-subtle font-mono pr-2">{lineCount} lines</span>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line numbers */}
        <div ref={lineRef} className="line-nums" aria-hidden>
          {lineNums}
        </div>

        {/* Overlay */}
        <div className="code-wrap flex-1 relative overflow-hidden">
          {/* Highlighted pre */}
          <pre ref={preRef} className="code-pre hljs" style={{ background: 'transparent' }}>
            <code className={`language-${getLanguage(filename)}`}>{code}</code>
          </pre>

          {/* Editable textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleChange}
            onScroll={syncScroll}
            onKeyDown={handleTab}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            className="code-textarea"
          />
        </div>
      </div>
    </div>
  )
}
