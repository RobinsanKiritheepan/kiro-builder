import { useState } from 'react'
import ChatTab from './ChatTab.jsx'
import FilesTab from './FilesTab.jsx'
import HistoryTab from './HistoryTab.jsx'

const TABS = [
  { id: 'chat',    label: '💬 Chat'    },
  { id: 'files',   label: '📁 Files'   },
  { id: 'history', label: '🕐 History' },
]

export default function LeftPanel({ onGenerate, loading, history, files, onRollback, activeFile, onFileSelect, apiOnline }) {
  const [tab, setTab] = useState('chat')

  return (
    <aside className="w-[380px] flex-shrink-0 flex flex-col border-r border-kiro-border bg-kiro-panel overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-kiro-border flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-sans transition-colors ${
              tab === t.id
                ? 'text-kiro-text border-b-2 border-kiro-accent -mb-px bg-kiro-panel2'
                : 'text-kiro-muted hover:text-kiro-subtle'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'chat'    && <ChatTab    onGenerate={onGenerate} loading={loading} apiOnline={apiOnline} />}
        {tab === 'files'   && <FilesTab   files={files} activeFile={activeFile} onFileSelect={onFileSelect} />}
        {tab === 'history' && <HistoryTab history={history} onRollback={onRollback} apiOnline={apiOnline} />}
      </div>
    </aside>
  )
}
