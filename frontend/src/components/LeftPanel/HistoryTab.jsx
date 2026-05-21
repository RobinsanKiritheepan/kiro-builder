import { useState } from 'react'

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const MODEL_COLORS = {
  'claude': 'text-kiro-accent2',
  'ollama': 'text-kiro-green',
  'demo':   'text-kiro-muted',
}

function getModelColor(model = '') {
  for (const [key, cls] of Object.entries(MODEL_COLORS)) {
    if (model.toLowerCase().includes(key)) return cls
  }
  return 'text-kiro-subtle'
}

export default function HistoryTab({ history, onRollback, apiOnline }) {
  const [confirmId, setConfirmId] = useState(null)

  const handleRollback = (commit) => {
    if (confirmId === commit.id) {
      onRollback(commit)
      setConfirmId(null)
    } else {
      setConfirmId(commit.id)
      setTimeout(() => setConfirmId(null), 3000)
    }
  }

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-4xl mb-3">🕐</p>
        <p className="text-sm text-kiro-muted font-sans">No history yet. Generate something!</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-kiro-panel px-4 py-2 border-b border-kiro-border">
        <span className="text-xs text-kiro-muted font-sans uppercase tracking-wider">
          {history.length} commit{history.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-2">
        {history.map((commit, idx) => (
          <div
            key={commit.id}
            className="mb-1.5 rounded-lg border border-kiro-border bg-kiro-panel2 overflow-hidden hover:border-kiro-border2 transition-colors"
          >
            <div className="p-3">
              {/* Commit hash + model */}
              <div className="flex items-center justify-between mb-1">
                <code className="text-[10px] text-kiro-accent font-mono">{commit.id}</code>
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <span className="text-[10px] bg-kiro-accent/20 text-kiro-accent2 px-1.5 py-0.5 rounded font-sans">HEAD</span>
                  )}
                  <span className={`text-[10px] font-mono ${getModelColor(commit.model)}`}>
                    {commit.model || 'demo'}
                  </span>
                </div>
              </div>

              {/* Message */}
              <p className="text-xs text-kiro-text font-sans leading-snug mb-1.5 truncate">{commit.message}</p>

              {/* Meta */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-kiro-muted font-sans">{timeAgo(commit.timestamp)}</span>
                {commit.tokens && (
                  <span className="text-[10px] text-kiro-muted font-sans">{commit.tokens.toLocaleString()} tok</span>
                )}
              </div>
            </div>

            {/* Rollback button */}
            {idx !== 0 && (
              <button
                onClick={() => handleRollback(commit)}
                className={`w-full py-1.5 text-xs font-sans border-t transition-all ${
                  confirmId === commit.id
                    ? 'bg-kiro-red/20 border-kiro-red/30 text-kiro-red'
                    : 'border-kiro-border text-kiro-muted hover:text-kiro-text hover:bg-kiro-panel'
                }`}
              >
                {confirmId === commit.id ? '⚠ Click again to confirm' : '↩ Rollback'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
