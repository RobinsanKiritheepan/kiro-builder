import { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { fileKey, getLang } from './utils.jsx'
import authFetch from '../../utils/authFetch.js'

const IDEContext = createContext(null)

/* ── API helpers ─────────────────────────────────────────────────── */
async function apiWriteFile(projectId, filePath, content) {
  try {
    await authFetch(`/api/projects/${projectId}/file`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path: filePath, content }),
    })
  } catch (e) {
    console.warn('[IDEContext] apiWriteFile error:', e)
  }
}

async function apiCreateFile(projectId, filePath, content = '') {
  try {
    await authFetch(`/api/projects/${projectId}/file/create`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path: filePath, content }),
    })
  } catch (e) {
    console.warn('[IDEContext] apiCreateFile error:', e)
  }
}

async function apiDeleteFile(projectId, filePath) {
  try {
    await authFetch(`/api/projects/${projectId}/file?path=${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    })
  } catch (e) {
    console.warn('[IDEContext] apiDeleteFile error:', e)
  }
}

async function apiRenameFile(projectId, oldPath, newPath) {
  try {
    await authFetch(`/api/projects/${projectId}/file/rename`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ old_path: oldPath, new_path: newPath }),
    })
  } catch (e) {
    console.warn('[IDEContext] apiRenameFile error:', e)
  }
}

function fileToApiPath(f) {
  const path = (f.path || '/').replace(/^\//, '')
  return path ? `${path}${f.name}` : f.name
}

export function IDEProvider({ files: initialFiles = [], onFilesChange, projectId = null, onSaveSignal, children }) {
  const [files, setFiles]           = useState(initialFiles)
  const [openTabs, setOpenTabs]     = useState([])
  const [activeKey, setActiveKey]   = useState(null)
  const branchName                  = 'main' // constant — never changes
  const [gitChanges, setGitChanges] = useState(new Set())
  const [stagedFiles, setStagedFiles] = useState(new Set())
  const [unsavedKeys, setUnsavedKeys] = useState(new Set())
  const [commitHistory, setCommitHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kiro-git-history') || '[]') } catch { return [] }
  })
  const [githubRepo, setGithubRepo] = useState('')

  // Debounce timers for auto-save: key → timeoutId
  const saveTimers = useRef({})
  // Ref to latest files — updated synchronously inside setFiles + via layout effect as safety net
  const filesRef = useRef(initialFiles)
  useLayoutEffect(() => { filesRef.current = files }, [files])

  // Track the current projectId so we can detect project switches and reset state
  const prevProjectId = useRef(projectId)

  // When projectId changes, clear ALL stale state for a clean slate
  useEffect(() => {
    if (prevProjectId.current !== projectId) {
      prevProjectId.current = projectId
      setFiles([])
      filesRef.current = []
      setOpenTabs([])
      setActiveKey(null)
      setGitChanges(new Set())
      setStagedFiles(new Set())
      setUnsavedKeys(new Set())
      // Clear any pending debounce timers from the old project
      Object.values(saveTimers.current).forEach(t => clearTimeout(t))
      saveTimers.current = {}
    }
  }, [projectId])

  // Sync external files → internal when parent updates (single source of truth from App.jsx)
  useEffect(() => {
    if (initialFiles.length === 0) return // ignore empty props — project switch clears via projectId effect above
    setFiles(initialFiles)
    // Keep existing tabs if they still exist in new files, otherwise auto-open main file
    setOpenTabs(prev => {
      const kept = prev.filter(t => initialFiles.some(f => fileKey(f) === fileKey(t)))
      if (kept.length > 0) return kept
      // Auto-open the main file for better UX
      const main = initialFiles.find(f => f.name === 'App.jsx')
        || initialFiles.find(f => f.name === 'index.html')
        || initialFiles.find(f => f.name === 'index.jsx' || f.name === 'index.tsx')
        || initialFiles[0]
      if (main) {
        setActiveKey(fileKey(main))
        return [main]
      }
      return []
    })
  }, [initialFiles])

  const notifyChange = useCallback((nextFiles) => {
    setFiles(nextFiles)
    onFilesChange?.(nextFiles)
  }, [onFilesChange])

  const currentFile = files.find(f => fileKey(f) === activeKey) || null

  // ── Tab management ──
  const openFile = useCallback((f) => {
    const k = fileKey(f)
    setOpenTabs(prev => prev.find(t => fileKey(t) === k) ? prev : [...prev, f])
    setActiveKey(k)
  }, [])

  const closeTab = useCallback((k) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => fileKey(t) !== k)
      if (activeKey === k) {
        const idx = prev.findIndex(t => fileKey(t) === k)
        const fallback = next[Math.min(idx, next.length - 1)]
        setActiveKey(fallback ? fileKey(fallback) : null)
      }
      return next
    })
    setUnsavedKeys(prev => { const s = new Set(prev); s.delete(k); return s })
  }, [activeKey])

  // ── Content update ──
  const updateContent = useCallback((k, newContent) => {
    // Functional updater: no 'files' in deps → stable callback → no cascade re-renders on keystroke
    setFiles(prev => {
      const next = prev.map(f => fileKey(f) === k ? { ...f, content: newContent } : f)
      filesRef.current = next  // sync ref synchronously inside updater
      return next
    })

    setGitChanges(prev => new Set([...prev, k]))
    setUnsavedKeys(prev => new Set([...prev, k]))

    // Debounced: API write + parent sync + preview refresh (1.5s after last keystroke)
    // onFilesChange is NOT called per-keystroke to avoid re-rendering App on every character
    clearTimeout(saveTimers.current[k])
    saveTimers.current[k] = setTimeout(() => {
      const file = filesRef.current.find(f => fileKey(f) === k)
      if (file) {
        if (projectId) apiWriteFile(projectId, fileToApiPath(file), newContent)
      }
      onFilesChange?.(filesRef.current)
      onSaveSignal?.()
    }, 1500)
  }, [onFilesChange, projectId, onSaveSignal])  // 'files' removed — stable across keystrokes

  const markSaved = useCallback((k) => {
    setUnsavedKeys(prev => { const s = new Set(prev); s.delete(k); return s })
  }, [])

  // ── Immediate save (Ctrl+S) ──
  const saveNow = useCallback((k) => {
    const file = filesRef.current.find(f => fileKey(f) === k)
    if (file) {
      clearTimeout(saveTimers.current[k])
      if (projectId) apiWriteFile(projectId, fileToApiPath(file), file.content)
      onFilesChange?.(filesRef.current)  // sync parent immediately on explicit save
      onSaveSignal?.()
    }
  }, [projectId, onFilesChange, onSaveSignal])

  // ── File CRUD ──
  // name can contain path segments: 'src/components/Button.jsx' → path='src/components/', name='Button.jsx'
  const createFile = useCallback((nameOrPath, defaultPath = '/') => {
    let name, path
    if (nameOrPath.includes('/')) {
      const last = nameOrPath.lastIndexOf('/')
      path = nameOrPath.slice(0, last + 1)
      name = nameOrPath.slice(last + 1)
      if (!name) return // typed only a path, no filename
    } else {
      name = nameOrPath
      path = defaultPath.endsWith('/') ? defaultPath : defaultPath + '/'
    }
    const newFile = { name, path, content: '', language: getLang(name) }
    const next = [...files, newFile]
    notifyChange(next)
    openFile(newFile)
    setGitChanges(prev => new Set([...prev, fileKey(newFile)]))
    // API sync
    if (projectId) apiCreateFile(projectId, fileToApiPath(newFile))
  }, [files, notifyChange, openFile, projectId])

  // Create a folder by placing a .gitkeep placeholder inside it
  const createFolder = useCallback((folderName, parentPath = '/') => {
    const parent = parentPath.endsWith('/') ? parentPath : parentPath + '/'
    // build full folder path: parentPath + folderName + /
    const folderPath = parent === '/' ? folderName + '/' : parent + folderName + '/'
    const placeholder = { name: '.gitkeep', path: folderPath, content: '', language: 'plaintext' }
    notifyChange([...files, placeholder])
    // API sync
    if (projectId) {
      authFetch(`/api/projects/${projectId}/folder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      }).catch(() => {})
    }
  }, [files, notifyChange, projectId])

  const deleteFile = useCallback((k) => {
    clearTimeout(saveTimers.current[k])
    delete saveTimers.current[k]
    const file = files.find(f => fileKey(f) === k)
    notifyChange(files.filter(f => fileKey(f) !== k))
    closeTab(k)
    setGitChanges(prev => { const s = new Set(prev); s.delete(k); return s })
    setStagedFiles(prev => { const s = new Set(prev); s.delete(k); return s })
    // API sync
    if (projectId && file) apiDeleteFile(projectId, fileToApiPath(file))
  }, [files, notifyChange, closeTab, projectId])

  // Delete all files inside a folder (and its subfolders)
  const deleteFolder = useCallback((folderPath) => {
    const prefix = folderPath.endsWith('/') ? folderPath : folderPath + '/'
    const removed = files.filter(f => f.path.startsWith(prefix))
    removed.forEach(f => closeTab(fileKey(f)))
    notifyChange(files.filter(f => !f.path.startsWith(prefix)))
    // API sync
    if (projectId) apiDeleteFile(projectId, folderPath)
  }, [files, notifyChange, closeTab, projectId])

  const renameFile = useCallback((k, newName) => {
    clearTimeout(saveTimers.current[k])
    delete saveTimers.current[k]
    const oldFile = files.find(f => fileKey(f) === k)
    const next = files.map(f => {
      if (fileKey(f) !== k) return f
      return { ...f, name: newName, language: getLang(newName) }
    })
    notifyChange(next)
    // Update open tabs
    setOpenTabs(prev => prev.map(t => fileKey(t) === k ? { ...t, name: newName, language: getLang(newName) } : t))
    // API sync
    if (projectId && oldFile) {
      const newFile = { ...oldFile, name: newName }
      apiRenameFile(projectId, fileToApiPath(oldFile), fileToApiPath(newFile))
    }
  }, [files, notifyChange, projectId])

  // ── Git operations ──
  const stageFile = useCallback((k) => {
    setStagedFiles(prev => new Set([...prev, k]))
  }, [])

  const unstageFile = useCallback((k) => {
    setStagedFiles(prev => { const s = new Set(prev); s.delete(k); return s })
  }, [])

  const stageAll = useCallback(() => {
    setStagedFiles(new Set(gitChanges))
  }, [gitChanges])

  const discardChange = useCallback((k) => {
    setGitChanges(prev => { const s = new Set(prev); s.delete(k); return s })
    setStagedFiles(prev => { const s = new Set(prev); s.delete(k); return s })
  }, [])

  const commit = useCallback((message) => {
    const staged = [...stagedFiles]
    if (!staged.length) return
    const entry = {
      id:        Math.random().toString(36).slice(2, 10),
      message,
      timestamp: new Date().toISOString(),
      files:     staged.map(k => files.find(f => fileKey(f) === k)?.name).filter(Boolean),
    }
    const next = [entry, ...commitHistory].slice(0, 50)
    setCommitHistory(next)
    localStorage.setItem('kiro-git-history', JSON.stringify(next))
    setGitChanges(prev => { const s = new Set(prev); staged.forEach(k => s.delete(k)); return s })
    setStagedFiles(new Set())
  }, [stagedFiles, commitHistory, files])

  const getPushableFiles = useCallback(() => files, [files])

  const hasUnsaved = unsavedKeys.size > 0 || gitChanges.size > 0

  const value = {
    files, openTabs, activeKey, currentFile,
    branchName, gitChanges, stagedFiles, commitHistory,
    githubRepo, unsavedKeys, hasUnsaved,
    projectId,
    openFile, closeTab, updateContent, markSaved, saveNow,
    createFile, createFolder, deleteFile, deleteFolder, renameFile,
    stageFile, unstageFile, stageAll, discardChange,
    commit, setGithubRepo, getPushableFiles,
  }

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>
}

export function useIDE() {
  const ctx = useContext(IDEContext)
  if (!ctx) throw new Error('useIDE must be used within IDEProvider')
  return ctx
}
