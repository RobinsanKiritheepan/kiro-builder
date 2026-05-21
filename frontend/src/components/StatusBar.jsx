import { useState, useEffect } from 'react'

function formatCost(tokens) {
  if (!tokens) return null
  const cost = (tokens / 1_000_000) * 3
  return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(3)}`
}

function countLines(code) {
  if (typeof code !== 'string') return 0
  return (code.match(/\n/g) || []).length + 1
}

export default function StatusBar({ lastStats, apiOnline, ghStatus, code }) {
  const lines = countLines(code || '')
  const [saved, setSaved] = useState(false)

  // Show "Saved ✓" for 2s after each generation
  useEffect(() => {
    if (!lastStats) return
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(t)
  }, [lastStats])

  return (
    <div className="flex items-center h-7 px-4 border-t border-kiro-border bg-kiro-panel text-[11px] text-kiro-subtle font-mono gap-4 flex-shrink-0 overflow-hidden">

      {/* API status */}
      <span className={`flex items-center gap-1.5 font-sans ${apiOnline ? 'text-kiro-green' : 'text-kiro-muted'}`}>
        <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${apiOnline ? 'bg-kiro-green' : 'bg-kiro-border2'}`} />
        {apiOnline ? 'API' : 'Offline'}
      </span>

      {lastStats?.model && (
        <span className="text-kiro-muted font-sans">{lastStats.model}</span>
      )}

      {lastStats?.tokens && (
        <>
          <span className="text-kiro-subtle">{lastStats.tokens.toLocaleString()} tokens</span>
          <span className="text-kiro-subtle">{formatCost(lastStats.tokens)}</span>
        </>
      )}

      {lastStats?.ms && (
        <span className="text-kiro-subtle">{(lastStats.ms / 1000).toFixed(1)}s</span>
      )}

      <div className="flex-1" />

      {/* Auto-save indicator */}
      {saved && (
        <span
          className="font-sans text-kiro-green"
          style={{ animation: 'fadeIn 200ms ease', transition: 'opacity 0.3s' }}
        >
          Sauvegardé ✓
        </span>
      )}

      {ghStatus && ghStatus !== 'idle' && (
        <span className={`font-sans ${
          ghStatus === 'ok'      ? 'text-kiro-green'  :
          ghStatus === 'pushing' ? 'text-kiro-yellow animate-pulse' :
          ghStatus === 'error'   ? 'text-kiro-red'    : ''
        }`}>
          GitHub: {ghStatus}
        </span>
      )}

      <span>{lines} lines</span>
      <span>{(new Blob([code || '']).size / 1024).toFixed(1)} KB</span>
      <span className="text-kiro-border2">Kiro Builder v2</span>
    </div>
  )
}
