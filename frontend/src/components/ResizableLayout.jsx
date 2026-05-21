import { useRef, useCallback, useState } from 'react'
import { Panel, PanelGroup } from 'react-resizable-panels'
import ResizeHandle from './ResizeHandle.jsx'
import ChatSidebar from './ChatSidebar.jsx'
import PreviewPanel from './PreviewPanel.jsx'
import IDELayout from './IDE/IDELayout.jsx'
import HistoryView from './HistoryView.jsx'
import CloudPanel from './CloudPanel.jsx'
import useDevice from '../hooks/useDevice.js'

const STORAGE_KEY = 'kiro-builder-sizes'

function loadSizes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

/* ── Desktop collapse button ─────────────────────────────────── */
function CollapseBtn({ collapsed, onToggle, side = 'left' }) {
  const isLeft = side === 'left'
  return (
    <button
      onClick={onToggle}
      title={collapsed ? 'Expand' : 'Collapse'}
      style={{
        position: 'absolute',
        top: '50%',
        [isLeft ? 'right' : 'left']: -11,
        transform: 'translateY(-50%)',
        zIndex: 20,
        width: 18, height: 32,
        borderRadius: isLeft ? '0 6px 6px 0' : '6px 0 0 6px',
        background: 'var(--kbg)', border: '1px solid var(--kborder)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ksubtle)', fontSize: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'color 0.15s, border-color 0.15s',
        lineHeight: 1, flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.borderColor = '#c7d2fe' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e5e7eb' }}
    >
      {isLeft ? (collapsed ? '▶' : '◀') : (collapsed ? '◀' : '▶')}
    </button>
  )
}

/* ── Mobile bottom tab bar (4 items) ─────────────────────────── */
const MOBILE_TABS = [
  {
    id: 'preview', label: 'Preview',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    id: 'code', label: 'Code',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    id: 'chat', label: 'Chat',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'cloud', label: 'Cloud',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>
    ),
  },
]

/* ── Main component ──────────────────────────────────────────── */
export default function ResizableLayout({
  mainView,
  code,
  generatedFilesList,
  setGeneratedFilesList,
  onGitPush,
  ghStatus,
  history,
  onRollback,
  onGenerate,
  loading,
  apiOnline,
  isOpen,
  onClose,
  onNewProject,
  pendingPrompt,
  onPendingConsumed,
  stack,
  onMainView,
  previewDevice,
  onPreviewDevice,
  showToast,
  onPushChanges,
  projectId,
  savedSignal,
  onSaveSignal,
  provider,
  setProvider,
  projectBackups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
}) {
  const { isMobile, isTablet } = useDevice()
  const saved    = loadSizes()
  const chatRef  = useRef(null)
  const [chatCollapsed, setChatCollapsed]   = useState(false)
  const [mobileTab,     setMobileTab]       = useState(mainView || 'preview')

  const handleLayout = useCallback((sizes) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes)) } catch {}
  }, [])

  const toggleChat = useCallback(() => {
    if (chatCollapsed) chatRef.current?.expand()
    else               chatRef.current?.collapse()
  }, [chatCollapsed])

  const handleMobileTab = useCallback((tab) => {
    setMobileTab(tab)
    if (tab !== 'chat') onMainView?.(tab)
  }, [onMainView])

  /* ── MOBILE LAYOUT ─────────────────────────────────────────── */
  if (isMobile) {
    const chatOpen = mobileTab === 'chat'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {(mobileTab === 'preview' || chatOpen) && (
            <PreviewPanel code={code} realDevice="desktop" view={previewDevice} onView={onPreviewDevice} savedSignal={savedSignal} />
          )}
          {mobileTab === 'code' && (
            <IDELayout files={generatedFilesList} onFilesChange={setGeneratedFilesList} onGitPush={onGitPush} ghStatus={ghStatus} onPushChanges={onPushChanges} projectId={projectId} onSaveSignal={onSaveSignal} />
          )}
          {mobileTab === 'cloud' && (
            <CloudPanel ghStatus={ghStatus} onGitPush={onGitPush} />
          )}
        </div>

        {/* Bottom tab bar */}
        <div style={{
          display: 'flex', flexShrink: 0,
          borderTop: '1px solid var(--kborder)',
          background: 'var(--kbg)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {MOBILE_TABS.map(({ id, label, icon }) => {
            const active = mobileTab === id
            return (
              <button
                key={id}
                onClick={() => handleMobileTab(id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: '8px 4px 7px',
                  border: 'none', cursor: 'pointer',
                  background: 'transparent',
                  color: active ? 'var(--kaccent)' : 'var(--ksubtle)',
                  fontSize: 9, fontFamily: 'var(--font-sans)',
                  fontWeight: active ? 600 : 400,
                  transition: 'color 0.15s',
                  position: 'relative',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 24, height: 2, borderRadius: 99,
                    background: 'var(--kaccent)',
                  }} />
                )}
                {icon}
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* Chat backdrop */}
        {chatOpen && (
          <div
            onClick={() => setMobileTab('preview')}
            style={{
              position: 'fixed', inset: 0, zIndex: 49,
              background: 'rgba(0,0,0,0.4)',
              transition: 'opacity 300ms',
            }}
          />
        )}

        {/* Chat — fixed bottom sheet */}
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 'calc(85vh + env(safe-area-inset-bottom, 0px))',
          background: 'var(--kbg)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          transform: chatOpen ? 'translateY(0)' : 'translateY(100%)',
          visibility: chatOpen ? 'visible' : 'hidden',
          transition: 'transform 300ms ease, visibility 300ms',
          zIndex: 50, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header with drag handle + close button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 4px', flexShrink: 0 }}>
            <div style={{ flex: 1 }} />
            <div
              onClick={() => setMobileTab('preview')}
              style={{ width: 36, height: 4, background: 'var(--kborder2)', borderRadius: 99, cursor: 'pointer' }}
            />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setMobileTab('preview')}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  border: '1px solid var(--kborder)', background: 'var(--kpanel2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--ksubtle)',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatSidebar
              onGenerate={onGenerate}
              loading={loading}
              apiOnline={apiOnline}
              isOpen
              onClose={() => setMobileTab('preview')}
              onNewProject={onNewProject}
              pendingPrompt={pendingPrompt}
              onPendingConsumed={onPendingConsumed}
              stack={stack}
              code={code}
              onToast={showToast}
              provider={provider}
              setProvider={setProvider}
              projectId={projectId}
              embedded
            />
          </div>
        </div>
      </div>
    )
  }

  /* ── TABLET LAYOUT (768–1024px) ─────────────────────────── */
  if (isTablet) {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* Sidebar fixed 260px */}
        <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--kborder)', overflow: 'hidden' }}>
          <ChatSidebar
            onGenerate={onGenerate}
            loading={loading}
            apiOnline={apiOnline}
            isOpen={isOpen}
            onClose={onClose}
            onNewProject={onNewProject}
            pendingPrompt={pendingPrompt}
            onPendingConsumed={onPendingConsumed}
            stack={stack}
            code={code}
            onToast={showToast}
            provider={provider}
            setProvider={setProvider}
            projectId={projectId}
            embedded
          />
        </div>
        {/* Main panel — flex 1 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: mainView === 'preview' ? 'block' : 'none', width: '100%', height: '100%' }}>
            <PreviewPanel code={code} realDevice="desktop" view={previewDevice} onView={onPreviewDevice} savedSignal={savedSignal} />
          </div>
          <div style={{ display: mainView === 'code' ? 'block' : 'none', width: '100%', height: '100%' }}>
            <IDELayout files={generatedFilesList} onFilesChange={setGeneratedFilesList} onGitPush={onGitPush} ghStatus={ghStatus} onPushChanges={onPushChanges} projectId={projectId} onSaveSignal={onSaveSignal} />
          </div>
          {mainView === 'cloud' && <CloudPanel ghStatus={ghStatus} onGitPush={onGitPush} />}
          {mainView === 'history' && <HistoryView history={history} onRollback={onRollback} backups={projectBackups} onCreateBackup={onCreateBackup} onRestoreBackup={onRestoreBackup} onDeleteBackup={onDeleteBackup} projectId={projectId} />}
        </div>
      </div>
    )
  }

  /* ── DESKTOP LAYOUT ────────────────────────────────────────── */
  return (
    <PanelGroup
      direction="horizontal"
      onLayout={handleLayout}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Chat sidebar */}
      <Panel
        ref={chatRef}
        defaultSize={saved?.[0] ?? 22}
        minSize={15}
        maxSize={45}
        collapsible
        collapsedSize={0}
        onCollapse={() => setChatCollapsed(true)}
        onExpand={() => setChatCollapsed(false)}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <ChatSidebar
          onGenerate={onGenerate}
          loading={loading}
          apiOnline={apiOnline}
          isOpen={isOpen}
          onClose={onClose}
          onNewProject={onNewProject}
          pendingPrompt={pendingPrompt}
          onPendingConsumed={onPendingConsumed}
          stack={stack}
          code={code}
          onToast={showToast}
          provider={provider}
          setProvider={setProvider}
          projectId={projectId}
          embedded
        />
        <CollapseBtn side="left" collapsed={chatCollapsed} onToggle={toggleChat} />
      </Panel>

      <ResizeHandle direction="vertical" />

      {/* Center panel */}
      <Panel
        defaultSize={saved?.[1] ?? 78}
        minSize={30}
        style={{ overflow: 'hidden', position: 'relative' }}
      >
        {chatCollapsed && (
          <CollapseBtn side="right" collapsed={chatCollapsed} onToggle={toggleChat} />
        )}
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <div style={{ display: mainView === 'preview' ? 'block' : 'none', width: '100%', height: '100%' }}>
            <PreviewPanel code={code} realDevice="desktop" view={previewDevice} onView={onPreviewDevice} savedSignal={savedSignal} />
          </div>
          <div style={{ display: mainView === 'code' ? 'block' : 'none', width: '100%', height: '100%' }}>
            <IDELayout
              files={generatedFilesList}
              onFilesChange={setGeneratedFilesList}
              onGitPush={onGitPush}
              ghStatus={ghStatus}
              onPushChanges={onPushChanges}
              projectId={projectId}
              onSaveSignal={onSaveSignal}
            />
          </div>
          {mainView === 'cloud' && (
            <CloudPanel ghStatus={ghStatus} onGitPush={onGitPush} />
          )}
          {mainView === 'history' && (
            <HistoryView history={history} onRollback={onRollback} backups={projectBackups} onCreateBackup={onCreateBackup} onRestoreBackup={onRestoreBackup} onDeleteBackup={onDeleteBackup} projectId={projectId} />
          )}
        </div>
      </Panel>
    </PanelGroup>
  )
}
