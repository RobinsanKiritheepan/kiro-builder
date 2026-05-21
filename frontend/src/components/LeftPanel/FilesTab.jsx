const EXT_ICONS = {
  html: { icon: '🌐', color: 'text-orange-400' },
  css:  { icon: '🎨', color: 'text-blue-400' },
  js:   { icon: '⚡', color: 'text-yellow-400' },
  jsx:  { icon: '⚛️',  color: 'text-cyan-400' },
  ts:   { icon: '🔷', color: 'text-blue-500' },
  tsx:  { icon: '🔷', color: 'text-cyan-500' },
  json: { icon: '{}', color: 'text-yellow-300' },
  py:   { icon: '🐍', color: 'text-green-400' },
  md:   { icon: '📝', color: 'text-kiro-muted' },
}

function getExt(filename) {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function formatSize(str) {
  const b = new Blob([str]).size
  if (b < 1024) return `${b}B`
  return `${(b / 1024).toFixed(1)}KB`
}

export default function FilesTab({ files, activeFile, onFileSelect }) {
  const entries = Object.entries(files)

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-4xl mb-3">📁</p>
        <p className="text-sm text-kiro-muted font-sans">No files yet. Generate code to see files here.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-kiro-panel px-4 py-2 border-b border-kiro-border flex items-center justify-between">
        <span className="text-xs text-kiro-muted font-sans uppercase tracking-wider">Explorer</span>
        <span className="text-xs text-kiro-muted font-sans">{entries.length} file{entries.length !== 1 ? 's' : ''}</span>
      </div>

      {/* File list */}
      <div className="p-2">
        {entries.map(([name, content]) => {
          const ext = getExt(name)
          const meta = EXT_ICONS[ext] || { icon: '📄', color: 'text-kiro-muted' }
          const isActive = name === activeFile

          return (
            <button
              key={name}
              onClick={() => onFileSelect(name)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-left transition-all group ${
                isActive
                  ? 'bg-kiro-accent/15 border border-kiro-accent/25'
                  : 'hover:bg-kiro-panel2 border border-transparent'
              }`}
            >
              <span className="text-base leading-none flex-shrink-0">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-mono truncate ${isActive ? 'text-kiro-accent2' : 'text-kiro-text group-hover:text-kiro-text'}`}>
                  {name}
                </div>
                <div className="text-[10px] text-kiro-muted font-sans">{formatSize(content)}</div>
              </div>
              {isActive && (
                <span className="text-[10px] text-kiro-accent font-sans flex-shrink-0">active</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
