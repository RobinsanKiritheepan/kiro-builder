import { useState, useRef } from 'react'
import { useIDE } from './IDEContext.jsx'
import { FileIcon, fileKey } from './utils.jsx'

// Build nested tree — folders track their full path
function buildTree(filesList) {
  const root = {}
  for (const f of filesList) {
    const parts = (f.path || '/').replace(/^\//, '').split('/').filter(Boolean)
    let node = root
    let cumPath = ''
    for (const part of parts) {
      cumPath += part + '/'
      if (!node[part]) node[part] = { _isFolder: true, _children: {}, _fullPath: cumPath }
      node = node[part]._children
    }
    node[fileKey(f)] = { _isFolder: false, _file: f }
  }
  return root
}

function TreeNode({
  name, node, depth,
  activeKey, renaming, renameVal, setRenameVal,
  onRenameConfirm, onRenameCancel,
  onFileClick, onFileContextMenu, onFolderContextMenu,
  draggedKey, onDragStart, onDragEnd,
  selectedFolderPath, onFolderSelect,
}) {
  const [open, setOpen] = useState(true)
  const [dropHover, setDropHover] = useState(false)

  if (!node._isFolder) {
    const f  = node._file
    const k  = fileKey(f)
    const isActive  = k === activeKey
    const isDragged = k === draggedKey

    if (renaming === k) {
      return (
        <div style={{ paddingLeft: 8 + depth * 14, paddingRight: 6, paddingTop: 2, paddingBottom: 2 }}>
          <input
            autoFocus value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRenameConfirm(k)
              if (e.key === 'Escape') onRenameCancel()
            }}
            onBlur={() => onRenameConfirm(k)}
            style={{
              width: '100%', padding: '2px 5px', fontSize: 12,
              border: '1px solid #6366f1', borderRadius: 4, outline: 'none',
              fontFamily: 'Inter, sans-serif', background: 'var(--kpanel2)',
              color: 'var(--ktext)',
            }}
          />
        </div>
      )
    }

    return (
      <div
        draggable
        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(k) }}
        onDragEnd={onDragEnd}
        onClick={() => onFileClick(f)}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onFileContextMenu(e, k) }}
        title={f.name}
        style={{
          paddingLeft: 8 + depth * 14, paddingRight: 6, paddingTop: 3, paddingBottom: 3,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
          background: isActive ? 'rgba(99,102,241,0.07)' : 'transparent',
          color: isActive ? '#6366f1' : 'var(--ktext)',
          borderRadius: '0 4px 4px 0', opacity: isDragged ? 0.4 : 1, userSelect: 'none',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--kpanel2)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        <FileIcon name={f.name} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {f.name}
        </span>
      </div>
    )
  }

  // Folder
  const isFolderSelected = selectedFolderPath === node._fullPath

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDropHover(true) }}
      onDragLeave={() => setDropHover(false)}
      onDrop={e => { e.preventDefault(); setDropHover(false) }}
    >
      <div
        onClick={e => {
          e.stopPropagation()
          setOpen(o => !o)
          // Toggle selection: click same folder again → deselect (back to root)
          onFolderSelect?.(isFolderSelected ? null : node._fullPath)
        }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onFolderContextMenu(e, node._fullPath, name) }}
        style={{
          paddingLeft: 6 + depth * 14, paddingRight: 6, paddingTop: 4, paddingBottom: 4,
          display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
          fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600,
          color: isFolderSelected ? '#6366f1' : 'var(--kmuted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: isFolderSelected
            ? 'rgba(99,102,241,0.08)'
            : dropHover ? 'rgba(99,102,241,0.05)' : 'transparent',
          borderRadius: 4, userSelect: 'none',
          borderLeft: isFolderSelected ? '2px solid #6366f1' : '2px solid transparent',
        }}
        onMouseEnter={e => { if (!isFolderSelected) e.currentTarget.style.background = 'var(--kpanel2)' }}
        onMouseLeave={e => { if (!isFolderSelected) e.currentTarget.style.background = dropHover ? 'rgba(99,102,241,0.05)' : 'transparent' }}
      >
        <svg
          width="8" height="8" viewBox="0 0 10 10" fill="currentColor"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M3 2l4 3-4 3V2z"/>
        </svg>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          {open
            ? <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></>
            : <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          }
        </svg>
        {name}
      </div>
      {open && (
        <div>
          {Object.entries(node._children)
            .sort(([, a], [, b]) => {
              if (a._isFolder && !b._isFolder) return -1
              if (!a._isFolder && b._isFolder) return 1
              const na = a._isFolder ? '' : a._file.name
              const nb = b._isFolder ? '' : b._file.name
              return na.localeCompare(nb)
            })
            .map(([k, child]) => (
              <TreeNode
                key={k}
                name={child._isFolder ? k : child._file.name}
                node={child}
                depth={depth + 1}
                activeKey={activeKey}
                renaming={renaming} renameVal={renameVal} setRenameVal={setRenameVal}
                onRenameConfirm={onRenameConfirm} onRenameCancel={onRenameCancel}
                onFileClick={onFileClick}
                onFileContextMenu={onFileContextMenu}
                onFolderContextMenu={onFolderContextMenu}
                draggedKey={draggedKey} onDragStart={onDragStart} onDragEnd={onDragEnd}
                selectedFolderPath={selectedFolderPath}
                onFolderSelect={onFolderSelect}
              />
            ))
          }
        </div>
      )}
    </div>
  )
}

export default function FileExplorer() {
  const { files, openFile, createFile, createFolder, deleteFile, deleteFolder, renameFile, activeKey } = useIDE()

  // new item state
  const [newType, setNewType]     = useState(null)   // 'file' | 'folder'
  const [newName, setNewName]     = useState('')
  const [newPath, setNewPath]     = useState('/')    // parent path for new item

  // context menu
  const [menu, setMenu]           = useState(null)   // { x, y, type:'file'|'folder', key, path, label }

  // inline rename
  const [renaming, setRenaming]   = useState(null)
  const [renameVal, setRenameVal] = useState('')

  // drag
  const [draggedKey, setDraggedKey] = useState(null)

  // ── Selected folder for contextual new file/folder creation
  const [selectedFolderPath, setSelectedFolderPath] = useState(null)

  const inputRef = useRef(null)
  const tree = buildTree(files)

  // ── toolbar buttons ──
  const openNew = (type, path = '/') => {
    setNewType(type)
    setNewName('')
    setNewPath(path)
    setMenu(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const confirmNew = () => {
    if (newName.trim()) {
      if (newType === 'file') {
        // if name has no path segments, use newPath as parent
        if (newName.includes('/')) {
          createFile(newName.trim())
        } else {
          createFile(newName.trim(), newPath)
        }
      } else if (newType === 'folder') {
        // parse sub-path: 'src/components' → parent=src/, name=components
        const parts = newName.trim().replace(/\/$/, '').split('/')
        const folderName = parts.pop()
        const parentExtra = parts.length ? parts.join('/') + '/' : ''
        const parent = newPath === '/' ? parentExtra || '/' : newPath + parentExtra
        createFolder(folderName, parent)
      }
    }
    setNewType(null)
    setNewName('')
  }

  // ── context menus ──
  const openFileMenu   = (e, k)           => setMenu({ x: e.clientX, y: e.clientY, type: 'file',   key: k })
  const openFolderMenu = (e, path, label) => setMenu({ x: e.clientX, y: e.clientY, type: 'folder', path, label })
  const closeMenu      = ()               => setMenu(null)

  const startRename = (k) => {
    const f = files.find(f => fileKey(f) === k)
    setRenaming(k); setRenameVal(f?.name || ''); closeMenu()
  }
  const confirmRename = (k) => {
    if (renameVal.trim()) renameFile(k, renameVal.trim())
    setRenaming(null)
  }

  // Deselect folder when clicking empty space
  const handleBgClick = () => {
    setSelectedFolderPath(null)
    closeMenu()
  }

  // ── icon helper ──
  const iconBtn = (title, pathEl, onClick, active = false) => (
    <button
      key={title} title={title} onClick={onClick}
      style={{
        width: 22, height: 22, border: 'none',
        background: active ? 'rgba(99,102,241,0.10)' : 'none',
        borderRadius: 4, cursor: 'pointer',
        color: active ? '#6366f1' : 'var(--kmuted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => e.currentTarget.style.background = active ? 'rgba(99,102,241,0.15)' : 'var(--kpanel2)'}
      onMouseLeave={e => e.currentTarget.style.background = active ? 'rgba(99,102,241,0.10)' : 'none'}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {pathEl}
      </svg>
    </button>
  )

  // Derive a short display label for selected folder
  const folderLabel = selectedFolderPath
    ? selectedFolderPath.replace(/\/$/, '').split('/').pop() || selectedFolderPath
    : null

  return (
    <div className="h-full flex flex-col select-none" style={{ background: 'var(--kbg)' }} onClick={handleBgClick} onContextMenu={e => e.preventDefault()}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 10px', borderBottom: '1px solid var(--kborder)',
        fontSize: 11, fontWeight: 600, color: 'var(--kmuted)',
        letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
        gap: 6,
      }}>
        {/* Title + selected folder hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{ flexShrink: 0 }}>Explorer</span>
          {folderLabel && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 500, color: '#6366f1',
              background: 'rgba(99,102,241,0.08)', borderRadius: 4,
              padding: '1px 6px', maxWidth: 100, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '0.04em', textTransform: 'none',
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              {folderLabel}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          {iconBtn(
            selectedFolderPath ? `New File in ${selectedFolderPath}` : 'New File',
            <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="13" x2="12" y2="19"/><line x1="9" y1="16" x2="15" y2="16"/></>,
            () => openNew('file', selectedFolderPath || '/'),
            !!selectedFolderPath
          )}
          {iconBtn(
            selectedFolderPath ? `New Folder in ${selectedFolderPath}` : 'New Folder',
            <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></>,
            () => openNew('folder', selectedFolderPath || '/'),
            !!selectedFolderPath
          )}
        </div>
      </div>

      {/* New item input */}
      {newType && (
        <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--kborder)', flexShrink: 0 }}>
          <div style={{
            fontSize: 10, color: 'var(--ksubtle)', marginBottom: 3,
            fontFamily: 'Inter, sans-serif', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {newType === 'file' ? '📄' : '📁'}
            {newType === 'file' ? `New file in ${newPath}` : `New folder in ${newPath}`}
          </div>
          <input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmNew()
              if (e.key === 'Escape') setNewType(null)
            }}
            onBlur={confirmNew}
            placeholder={newType === 'file' ? 'filename.ext  or  path/to/file.ext' : 'folder-name  or  path/to/folder'}
            style={{
              width: '100%', padding: '4px 7px', fontSize: 12,
              border: '1px solid #6366f1', borderRadius: 4, outline: 'none',
              fontFamily: 'Inter, sans-serif', background: 'var(--kpanel2)',
              color: 'var(--ktext)',
            }}
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto cv-scrollbar" style={{ padding: '4px 0' }}>
        {Object.entries(tree)
          .sort(([, a], [, b]) => {
            if (a._isFolder && !b._isFolder) return -1
            if (!a._isFolder && b._isFolder) return 1
            return (a._isFolder ? '' : a._file.name).localeCompare(b._isFolder ? '' : b._file.name)
          })
          .map(([k, node]) => (
            <TreeNode
              key={k}
              name={node._isFolder ? k : node._file.name}
              node={node}
              depth={0}
              activeKey={activeKey}
              renaming={renaming} renameVal={renameVal} setRenameVal={setRenameVal}
              onRenameConfirm={confirmRename} onRenameCancel={() => setRenaming(null)}
              onFileClick={openFile}
              onFileContextMenu={openFileMenu}
              onFolderContextMenu={openFolderMenu}
              draggedKey={draggedKey}
              onDragStart={setDraggedKey}
              onDragEnd={() => setDraggedKey(null)}
              selectedFolderPath={selectedFolderPath}
              onFolderSelect={setSelectedFolderPath}
            />
          ))
        }
        {files.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ksubtle)', fontSize: 12, padding: '32px 16px', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            No files yet.<br/>Click <b>+</b> to create one.
          </div>
        )}
      </div>

      {/* Context menu */}
      {menu && (
        <div
          style={{
            position: 'fixed', top: menu.y, left: menu.x, zIndex: 1000,
            background: 'var(--kbg)', border: '1px solid var(--kborder)', borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 160, padding: 4,
          }}
          onClick={e => e.stopPropagation()}
        >
          {menu.type === 'folder' ? (
            <>
              <MenuItem label={`New File in ${menu.label}/`} onClick={() => openNew('file', menu.path)} />
              <MenuItem label={`New Folder in ${menu.label}/`} onClick={() => openNew('folder', menu.path)} />
              <div style={{ height: 1, background: 'var(--kborder)', margin: '4px 8px' }} />
              <MenuItem label="Delete Folder" danger onClick={() => { deleteFolder(menu.path); closeMenu() }} />
            </>
          ) : (
            <>
              <MenuItem label="Rename" onClick={() => startRename(menu.key)} />
              <MenuItem label="Delete" danger onClick={() => { deleteFile(menu.key); closeMenu() }} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: '6px 12px',
        textAlign: 'left', fontSize: 12, border: 'none', background: 'none',
        cursor: 'pointer', borderRadius: 5,
        color: danger ? '#dc2626' : 'var(--ktext)',
        fontFamily: 'Inter, sans-serif',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(220,38,38,0.08)' : 'var(--kpanel2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {label}
    </button>
  )
}
