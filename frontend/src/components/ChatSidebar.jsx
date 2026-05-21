import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import ImageAnalysisPanel from './ImageAnalysisPanel.jsx'
import authFetch from '../utils/authFetch.js'

const PROVIDERS = [
  { id: 'anthropic', label: 'Claude Sonnet', color: '#d97706', icon: '✦' },
]

const STARTER_PROMPTS = [
  { icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>, title: 'Landing page',  desc: 'Hero, features & pricing' },
  { icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>, title: 'Dashboard',     desc: 'Charts, stats & analytics' },
  { icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, title: 'Portfolio',     desc: 'Showcase your work' },
  { icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, title: 'E-commerce',   desc: 'Store with cart & checkout' },
]

const FOLLOW_UPS = ['Add animations', 'Dark mode', 'Mobile layout', 'Contact form']

const GREETINGS = ['salut', 'bonjour', 'hello', 'coucou', 'hi', 'hey', 'bonsoir', 'yo', 'hola', 'allo', 'allô']
function isGreeting(text) {
  const t = text.toLowerCase().trim().replace(/[!?.]+$/, '')
  return GREETINGS.includes(t) || GREETINGS.some(g => t === g || t.startsWith(g + ' ') || t.startsWith(g + ','))
}

// GREETING_REPLIES: random natural responses with a question
const GREETING_REPLIES = [
  "Salut ! Qu'est-ce qu'on construit aujourd'hui ? 🚀",
  "Hey ! Dis-moi ce que tu veux créer — site, app, dashboard ?",
  "Bonjour ! Prêt à builder. Décris ton projet et je te propose un plan avant de coder.",
  "Salut ! Une idée de site ou d'app en tête ? Décris-moi ça.",
]
function greetingReply() {
  return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)]
}

const MODE_LABELS = {
  clone_exact:  'Clone',
  inspire:      'Inspire',
  redesign:     'Redesign',
  analyze_only: 'Analyse',
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function formatModelName(model) {
  if (!model) return 'IA'
  if (model.includes('claude-sonnet-4-6')) return 'Claude Sonnet 4.6'
  if (model.includes('claude-sonnet-4-5')) return 'Claude Sonnet 4.5'
  if (model.startsWith('claude'))          return 'Claude'
  return model || 'Claude'
}

function getRoutingMessage(result) {
  const reason   = result?.model_reason
  const model    = result?.model || ''
  const score    = result?.complexity_score
  const decision = result?.routing_decision
  if (!reason || !decision) return null

  switch (reason) {
    case 'claude_only':
      return `${formatModelName(model)} activé`
    case 'image_detected':
      return `Claude Vision activé — analyse d'image`
    case 'provider_explicit':
      return `${formatModelName(model)} sélectionné`
    default:
      return null
  }
}

/* ── Small reusable components ───────────────────────────────────── */
function KAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--kaccent)', color: '#fff', fontSize: 11, fontWeight: 700,
    }}>K</div>
  )
}

/* Notification bubble — error / warning / info / success */
const NOTIF = {
  error:   { bg: '#fef2f2', border: '#fecaca', icon: '●', ic: '#ef4444', tc: '#dc2626', bc: '#7f1d1d' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: '▲', ic: '#f59e0b', tc: '#92400e', bc: '#78350f' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', icon: 'ℹ', ic: '#3b82f6', tc: '#1e40af', bc: '#1e3a8a' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '✓', ic: '#10b981', tc: '#065f46', bc: '#064e3b' },
}
function NotificationMessage({ severity = 'info', message, actionLabel, onAction }) {
  const s = NOTIF[severity] || NOTIF.info
  return (
    <div className="msg-animate" style={{
      borderRadius: 10, padding: '10px 14px',
      background: s.bg, border: `1px solid ${s.border}`,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 12, color: s.ic, flexShrink: 0, marginTop: 1, lineHeight: 1.6 }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: s.bc, margin: 0, lineHeight: 1.55, fontFamily: 'var(--font-sans)' }}>{message}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              marginTop: 8, padding: '3px 10px', fontSize: 11, borderRadius: 99,
              border: `1px solid ${s.ic}`, background: 'transparent',
              color: s.tc, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >{actionLabel}</button>
        )}
      </div>
    </div>
  )
}

/* Model badge shown on each AI response */
function ModelBadge({ model }) {
  if (!model) return null
  const name = formatModelName(model)

  return (
    <span style={{
      fontSize: 10, padding: '1px 7px', borderRadius: 99,
      fontFamily: 'var(--font-sans)', lineHeight: 1.6,
      background: 'var(--kpanel2)', color: 'var(--ksubtle)',
    }}>
      ✦ {name}
    </span>
  )
}

/* Thinking state — shows step progress + simulated file creation */
function ThinkingState({ step, elapsed, providerLabel, fileSteps }) {
  const phaseSteps = [
    'Analyse de ta requête...',
    'Connexion à Claude Sonnet...',
    `Génération en cours...`,
    'Assemblage des fichiers...',
  ]
  const current = phaseSteps[Math.min(step, phaseSteps.length - 1)]
  const showTimer = elapsed > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2 }}>
      {/* Current phase */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <svg
          width="13" height="13" fill="none" stroke="var(--kaccent)" strokeWidth="2"
          viewBox="0 0 24 24"
          style={{ animation: 'spin 0.9s linear infinite', flexShrink: 0 }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span style={{ fontSize: 12, color: 'var(--kmuted)', fontFamily: 'var(--font-sans)' }}>
          {current}
        </span>
        {showTimer && (
          <span style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'var(--font-mono, monospace)' }}>
            {elapsed}s
          </span>
        )}
      </div>
      {/* File creation steps — shown during generation phase */}
      {fileSteps && fileSteps.length > 0 && step >= 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 20 }}>
          {fileSteps.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeIn 0.3s ease both' }}>
              <svg width="10" height="10" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'var(--font-mono, monospace)' }}>
                {f}
              </span>
            </div>
          ))}
          {/* Blinking "writing..." indicator for the next file */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--kaccent)', animation: 'pulse 1s ease infinite' }}/>
            </span>
            <span style={{ fontSize: 11, color: 'var(--kaccent)', fontFamily: 'var(--font-mono, monospace)' }}>
              écriture en cours...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* AI status bar shown permanently above the input */
function AIStatusBar({ apiOnline, loading, lastModel }) {

  if (!apiOnline) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 14px', borderTop: '1px solid var(--kborder)',
        background: 'var(--kpanel)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }}/>
        <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'var(--font-sans)' }}>
          Backend hors ligne
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 14px', borderTop: '1px solid var(--kborder)',
        background: 'var(--kpanel)',
      }}>
        <svg width="9" height="9" fill="none" stroke="var(--kaccent)" strokeWidth="2.5"
          viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span style={{ fontSize: 11, color: 'var(--kmuted)', fontFamily: 'var(--font-sans)' }}>
          Génération en cours...
        </span>
      </div>
    )
  }

  const label = lastModel
    ? formatModelName(lastModel) + ' actif'
    : 'Claude Sonnet 4.6 prêt'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '5px 14px', borderTop: '1px solid var(--kborder)',
      background: 'var(--kpanel)',
    }}>
      <span className="kiro-pulse-dot" style={{
        width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0,
      }}/>
      <span style={{ fontSize: 11, color: 'var(--kmuted)', fontFamily: 'var(--font-sans)' }}>
        {label}
      </span>
    </div>
  )
}

/* BriefCard removed — project requests go directly to /api/generate */

/* ── Main component ─────────────────────────────────────────────── */
export default function ChatSidebar({
  onGenerate, loading, apiOnline, isOpen, onClose, onNewProject,
  pendingPrompt, onPendingConsumed, embedded, stack = {},
  code, onToast, projectId,
}) {
  const [prompt, setPrompt]                 = useState('')
  const [messages, setMessages]             = useState([])

  // ── Persist chat messages per project via backend API ──
  const chatSaveTimer = useRef(null)

  // Load chat from backend API on project change
  useEffect(() => {
    if (!projectId) {
      setMessages([])
      return
    }
    let cancelled = false
    authFetch(`/api/projects/${projectId}/chat`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return
        if (data?.messages?.length > 0) {
          setMessages(data.messages)
        } else {
          // No chat saved yet — reconstruct initial message from project name
          authFetch(`/api/projects/${projectId}`)
            .then(r => r.ok ? r.json() : null)
            .then(proj => {
              if (cancelled || !proj?.name) return
              setMessages([
                { id: 'init-1', role: 'user', text: proj.name, timestamp: proj.created_at },
                { id: 'init-2', role: 'system_event', text: 'Claude Sonnet 4.6 activé' },
              ])
            })
            .catch(() => {})
        }
      })
      .catch(e => console.warn('[Chat] load error:', e))
    return () => { cancelled = true }
  }, [projectId])

  // Save chat to backend API (debounced)
  useEffect(() => {
    if (!projectId || messages.length === 0) return
    clearTimeout(chatSaveTimer.current)
    chatSaveTimer.current = setTimeout(() => {
      // Keep last 50 messages
      const toSave = messages.slice(-50).map(m => ({
        id: m.id, role: m.role, text: m.text, content: m.content,
        timestamp: m.timestamp, stats: m.stats, suggestions: m.suggestions,
        model: m.model, filesCount: m.filesCount, tokens: m.tokens,
        cost: m.cost, filesList: m.filesList,
        severity: m.severity, message: m.message, type: m.type,
        image: m.image, imageMode: m.imageMode,
      }))
      authFetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: toSave }),
      }).catch(e => console.warn('[Chat] save error:', e))
    }, 1000)
    return () => clearTimeout(chatSaveTimer.current)
  }, [messages, projectId])
  const [image, setImage]                   = useState(null)
  const [inputFocus, setInputFocus]         = useState(false)
  const [draggingOver, setDraggingOver]     = useState(false)
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false)
  const [lastModel, setLastModel]           = useState(null)

  // Thinking state
  const [thinkStep, setThinkStep]       = useState(0)
  const [thinkElapsed, setThinkElapsed] = useState(0)
  const [fileSteps, setFileSteps]       = useState([])

  // Conversational flow (plan endpoint — conversational only now)
  const [planLoading, setPlanLoading]   = useState(false)

  // Typical file names used for animated generation steps
  const FILE_STEP_NAMES = ['index.html', 'styles.css', 'script.js', 'components/', 'App.jsx']

  const fileRef           = useRef(null)
  const bottomRef         = useRef(null)
  const prevRoutingRef    = useRef(null)
  const pendingConsumedRef = useRef(false)

  /* ── Thinking step progression + file animation ────────────── */
  useEffect(() => {
    if (!loading) { setThinkStep(0); setThinkElapsed(0); setFileSteps([]); return }
    const t0 = Date.now()
    let fileIdx = 0
    const iv = setInterval(() => {
      const s = (Date.now() - t0) / 1000
      setThinkElapsed(Math.floor(s))
      setThinkStep(s < 0.5 ? 0 : s < 1.2 ? 1 : s < 2.0 ? 2 : 3)
      // Add a simulated file name every ~2.5s once generation phase starts
      if (s >= 2.0 && fileIdx < FILE_STEP_NAMES.length) {
        const nextFileAt = 2.0 + fileIdx * 2.5
        if (s >= nextFileAt) {
          const name = FILE_STEP_NAMES[fileIdx]
          setFileSteps(prev => prev.includes(name) ? prev : [...prev, name])
          fileIdx++
        }
      }
    }, 250)
    return () => clearInterval(iv)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* ── Result handler — shared by all send paths ─────────────── */
  const applyResult = useCallback((result, userMsg) => {
    if (result?.__error) {
      setMessages(prev => [...prev, {
        role: 'notification',
        severity: result.severity,
        type:     result.type,
        message:  result.message,
        actionLabel: result.actionLabel,
        retryText: result.actionLabel === 'Réessayer' ? userMsg : null,
      }])
      return
    }

    // System event when routing decision changes
    const newDecision = result?.routing_decision
    if (newDecision && newDecision !== prevRoutingRef.current) {
      const switchMsg = getRoutingMessage(result)
      if (switchMsg) {
        setMessages(prev => [...prev, { role: 'system_event', text: switchMsg }])
      }
      prevRoutingRef.current = newDecision
    }

    // Design system card (shown before the AI response)
    if (result?.design_system) {
      setMessages(prev => [...prev, {
        role: 'design_system',
        ds: result.design_system,
      }])
    }

    setMessages(prev => [...prev, {
      role:        'assistant',
      text:        result?.explanation || 'Génération terminée.',
      model:       result?.model,
      filesCount:  result?.files?.length || 0,
      tokens:      result?.tokens || 0,
      cost:        result?.cost_estimate || 0,
      filesList:   result?.files?.map(f => f.name) || [],
      suggestions: result?.suggestions || [],
    }])

    if (result?.model) setLastModel(result.model)
  }, [])

  /* ── Image handler ─────────────────────────────────────────── */
  const handleImageCaptured = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImage({
        base64:    ev.target.result.split(',')[1],
        name:      file.name,
        preview:   ev.target.result,
        mediaType: file.type || 'image/png',
      })
      // Don't auto-open Vision panel — let user choose via the mode buttons
    }
    reader.readAsDataURL(file)
  }, [])

  /* ── Ctrl+V global paste ───────────────────────────────────── */
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { handleImageCaptured(file); break }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleImageCaptured])

  /* ── Auto-send from HomePage ────────────────────────────────── */
  useEffect(() => {
    if (!pendingPrompt) return
    if (pendingConsumedRef.current) return  // StrictMode double-fire guard
    pendingConsumedRef.current = true
    const msg = pendingPrompt.trim()
    onPendingConsumed?.()
    if (!msg) return

    // If apiOnline is already true, send immediately
    if (apiOnline) { handleSend(msg); return }

    // Race condition: backend IS online but health check hasn't refreshed yet.
    // Quick re-check before giving up — avoids the "Backend hors ligne" flash.
    let cancelled = false
    ;(async () => {
      for (let i = 0; i < 4; i++) {
        try {
          const r = await fetch('/api/health', { signal: AbortSignal.timeout(2000) })
          if (r.ok && !cancelled) { handleSend(msg); return }
        } catch { /* retry */ }
        await new Promise(r => setTimeout(r, 400))
      }
      // All retries failed → send anyway (will show proper error)
      if (!cancelled) handleSend(msg)
    })()
    return () => { cancelled = true }
  }, [pendingPrompt]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Drag & drop ────────────────────────────────────────────── */
  const handleDragOver  = useCallback((e) => { e.preventDefault(); setDraggingOver(true) }, [])
  const handleDragLeave = useCallback((e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDraggingOver(false) }, [])
  const handleDrop      = useCallback((e) => { e.preventDefault(); setDraggingOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleImageCaptured(f) }, [handleImageCaptured])
  const handleFileInput = useCallback((e) => { const f = e.target.files?.[0]; if (f) handleImageCaptured(f); e.target.value = '' }, [handleImageCaptured])

  /* ── Generate from image panel ──────────────────────────────── */
  const handleGenerateFromImage = useCallback(async (promptText, selectedStack, imgB64, _s, mode, mediaType) => {
    const imgPreview = image?.preview
    const msg        = promptText || "Générer depuis l'image"
    setMessages(prev => [...prev, { role: 'user', text: msg, image: imgPreview, imageMode: mode }])
    setImage(null)
    setShowAnalysisPanel(false)
    onClose?.()
    const result = await onGenerate(promptText, selectedStack || [], imgB64, stack, mode, mediaType, 'anthropic')
    applyResult(result, msg)
  }, [image, onGenerate, onClose, stack, applyResult])

  /* ── Regular send ────────────────────────────────────────────── */
  const handleSend = useCallback(async (text) => {
    const userMsg  = (text || prompt).trim()
    const hadImage = !!image
    if (!userMsg && !hadImage) return

    const imgPreview   = image?.preview
    const imgB64       = image?.base64
    const imgMediaType = image?.mediaType || 'image/png'

    // ── 1. Image request → skip planning, go straight to generate ─
    if (hadImage) {
      const fullPrompt = userMsg || 'Reproduis ce design fidèlement.'
      setMessages(prev => [...prev, {
        role: 'user', text: userMsg || "Générer depuis l'image",
        image: imgPreview, imageMode: 'clone_exact',
      }])
      setPrompt(''); setImage(null); onClose?.()
      const result = await onGenerate(fullPrompt, [], imgB64, stack, 'clone_exact', imgMediaType, 'anthropic')
      applyResult(result, userMsg)
      return
    }

    // ── 2. Backend offline → quick re-check then fallback ──────────
    if (!apiOnline) {
      // Quick health re-check: avoids false "hors ligne" during race conditions
      let backendUp = false
      try {
        const hc = await fetch('/api/health', { signal: AbortSignal.timeout(2000) })
        backendUp = hc.ok
      } catch { /* still offline */ }

      if (!backendUp) {
        if (isGreeting(userMsg)) {
          setMessages(prev => [...prev,
            { role: 'user', text: userMsg },
            { role: 'assistant', text: greetingReply(), model: null, filesCount: 0, tokens: 0, cost: 0 },
          ])
          setPrompt('')
        } else {
          setMessages(prev => [...prev, { role: 'user', text: userMsg }])
          setPrompt(''); setImage(null); onClose?.()
          const result = await onGenerate(userMsg, [], null, stack, 'clone_exact', 'image/png', 'anthropic')
          applyResult(result, userMsg)
        }
        return
      }
      // Backend is actually online → fall through to normal flow
    }

    // ── 3. Existing code → EDIT MODE (skip plan, go straight to generate) ───
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setPrompt(''); setImage(null); onClose?.()

    if (code) {
      // Project already has code → direct generation with context files (edit mode)
      // The generate() wrapper in App.jsx auto-injects context_files from generatedFilesList
      const result = await onGenerate(userMsg, [], null, stack, 'clone_exact', 'image/png', 'anthropic')
      applyResult(result, userMsg)
      return
    }

    // ── 4. No existing code → /api/plan détecte conversationnel ou nouveau projet ───
    setPlanLoading(true)

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg }),
      })
      if (!res.ok) throw new Error(`plan ${res.status}`)
      const plan = await res.json()
      setPlanLoading(false)

      if (plan?.conversational) {
        // Message conversationnel (salut, question...) → réponse IA directe
        setMessages(prev => [...prev, {
          role: 'assistant', text: plan.reply || '...', model: null, filesCount: 0, tokens: 0, cost: 0,
        }])
      } else {
        // Demande de projet → génération directe avec le prompt enrichi
        const genPrompt = plan.refined_prompt || userMsg
        const techs     = plan.stack || []
        const result = await onGenerate(genPrompt, techs, null, stack, 'clone_exact', 'image/png', 'anthropic')
        applyResult(result, genPrompt)
      }
    } catch (err) {
      // Plan failed → génération directe sans enrichissement
      setPlanLoading(false)
      console.warn('[Kiro] /api/plan failed, generating directly:', err)
      const result = await onGenerate(userMsg, [], null, stack, 'clone_exact', 'image/png', 'anthropic')
      applyResult(result, userMsg)
    }
  }, [prompt, stack, image, apiOnline, onGenerate, onClose, applyResult])

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  const canSend = !loading && !planLoading && (prompt.trim() || image)

  /* ── Sidebar style ───────────────────────────────────────────── */
  const sidebarStyle = embedded ? {
    width: '100%', height: '100%', position: 'relative',
    display: 'flex', flexDirection: 'column',
    borderRight: '1px solid var(--kborder)',
    background: 'var(--kbg)',
  } : {}

  return (
    <>
      <aside
        className={embedded ? '' : [
          'fixed bottom-0 left-0 right-0 z-50 h-[78vh]',
          'md:relative md:h-full md:w-[280px] md:flex-shrink-0 lg:w-[380px]',
          'flex flex-col border-t md:border-t-0 md:border-r border-kiro-border',
          'bg-kiro-bg kiro-sidebar-shadow',
          'rounded-t-3xl md:rounded-none',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full', 'md:translate-y-0',
        ].join(' ')}
        style={{ ...sidebarStyle, position: 'relative' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-over overlay */}
        {draggingOver && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'rgba(225,29,72,0.07)',
            border: '2px dashed var(--kaccent)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease both',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--kaccent)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                Dépose ton image ici
              </p>
            </div>
          </div>
        )}

        {/* Mobile handle */}
        {!embedded && (
          <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-kiro-border2" />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid var(--kborder)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ktext)', fontFamily: 'var(--font-sans)' }}>
            Chat
          </span>
          {onNewProject && (
            <button
              onClick={onNewProject}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: 'var(--kmuted)', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New project
            </button>
          )}
        </div>

        {/* ── Messages / Welcome ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', padding: '24px 20px',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                background: 'var(--kaccent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontSize: 20,
                fontWeight: 700, marginBottom: 20, flexShrink: 0,
              }}>K</div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ktext)', margin: '0 0 6px', fontFamily: 'var(--font-sans)' }}>
                What are we building?
              </h2>
              <p style={{ fontSize: 12, color: 'var(--kmuted)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 260, fontFamily: 'var(--font-sans)' }}>
                Describe your app or upload a screenshot.<br />No setup required.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
                {STARTER_PROMPTS.map(({ icon, title, desc }) => (
                  <button
                    key={title}
                    onClick={() => handleSend(title)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '14px', borderRadius: 16, textAlign: 'left',
                      border: '1px solid var(--kborder)', background: 'var(--kbg)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 20, marginBottom: 10 }}>{icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ktext)', fontFamily: 'var(--font-sans)', lineHeight: 1.3 }}>{title}</span>
                    <span style={{ fontSize: 11, color: 'var(--kmuted)', marginTop: 2, fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>{desc}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 10, color: 'var(--ksubtle)', marginTop: 24, fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
                Type an idea · 📷 upload a screenshot · Ctrl+V to paste
              </p>
            </div>
          ) : (
            /* Message list */
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
              {messages.map((m, i) => (
                <div key={i} className="msg-animate">

                  {/* ── System event (model switch, etc.) ─────── */}
                  {m.role === 'system_event' && (
                    <div style={{ textAlign: 'center', padding: '4px 0' }}>
                      <span style={{
                        fontSize: 11, color: 'var(--ksubtle)',
                        fontStyle: 'italic', fontFamily: 'var(--font-sans)',
                      }}>
                        — {m.text} —
                      </span>
                    </div>
                  )}

                  {/* ── Design System card ────────────────────── */}
                  {m.role === 'design_system' && m.ds && (
                    <div className="msg-animate" style={{
                      borderRadius: 10, padding: '10px 14px',
                      background: 'var(--kpanel)', border: '1px solid var(--kborder)',
                      marginBottom: 4,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--ksubtle)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
                        Design System sélectionné
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ktext)', fontFamily: 'var(--font-sans)' }}>
                          {m.ds.style_name}
                        </span>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 9999,
                          background: 'var(--kaccent)', color: '#fff', fontWeight: 600,
                        }}>
                          {m.ds.project_type}
                        </span>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 9999,
                          background: m.ds.dark_mode ? '#27272a' : '#f4f4f5',
                          color: m.ds.dark_mode ? '#e4e4e7' : '#3f3f46',
                          fontWeight: 500,
                        }}>
                          {m.ds.dark_mode ? 'dark' : 'light'}
                        </span>
                      </div>
                      {/* Color dots */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        {(m.ds.palette_colors || []).map((hex, i) => (
                          <div key={i} title={hex} style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: hex, border: '1px solid rgba(128,128,128,0.3)',
                          }} />
                        ))}
                      </div>
                      {/* Fonts */}
                      <div style={{ fontSize: 11, color: 'var(--ksubtle)', fontFamily: 'var(--font-sans)' }}>
                        Fonts: <strong style={{ color: 'var(--ktext)' }}>{m.ds.fonts?.heading}</strong>
                        {m.ds.fonts?.heading !== m.ds.fonts?.body && (
                          <> + <strong style={{ color: 'var(--ktext)' }}>{m.ds.fonts?.body}</strong></>
                        )}
                        {m.ds.landing_pattern && (
                          <> · {m.ds.landing_pattern}</>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Notification (error / warning / info / success) ── */}
                  {m.role === 'notification' && (
                    <NotificationMessage
                      severity={m.severity}
                      message={m.message}
                      actionLabel={m.actionLabel}
                      onAction={m.retryText ? () => handleSend(m.retryText) : undefined}
                    />
                  )}

                  {/* ── User message ─────────────────────────── */}
                  {m.role === 'user' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        maxWidth: '86%', borderRadius: '18px 18px 4px 18px',
                        padding: '9px 14px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.10))',
                        border: '1px solid rgba(99,102,241,0.20)',
                        wordBreak: 'break-word', overflowWrap: 'anywhere', overflow: 'hidden',
                      }}>
                        {m.image && (
                          <img src={m.image} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 7, maxHeight: 130, objectFit: 'cover' }}/>
                        )}
                        {m.imageMode && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 99, marginBottom: m.text ? 5 : 0,
                            background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.30)',
                            fontSize: 10, color: '#818cf8', fontFamily: 'var(--font-sans)', fontWeight: 600,
                          }}>
                            {MODE_LABELS[m.imageMode] || m.imageMode}
                          </div>
                        )}
                        {m.text && (
                          <div style={{ fontSize: 13, color: 'var(--ktext)', lineHeight: 1.55, fontFamily: 'var(--font-sans)', whiteSpace: 'pre-wrap' }}>
                            {m.text}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── AI message ───────────────────────────── */}
                  {m.role === 'assistant' && (
                    <div style={{ display: 'flex', gap: 9, overflow: 'hidden' }} className="group">
                      <KAvatar />
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>

                        {/* Response — bullet list or plain text */}
                        <div style={{
                          borderLeft: '2px solid rgba(225,29,72,0.25)',
                          paddingLeft: 10, marginBottom: 8,
                          wordBreak: 'break-word', overflowWrap: 'anywhere',
                        }}>
                          {m.text?.trim().startsWith('-') ? (
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {m.text.split('\n').map(l => l.trim()).filter(l => l.startsWith('-')).map((line, li) => (
                                <li key={li} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--ktext)', lineHeight: 1.55, fontFamily: 'var(--font-sans)' }}>
                                  <span style={{ color: 'var(--kaccent)', fontWeight: 800, flexShrink: 0, fontSize: 14, lineHeight: '1.2' }}>·</span>
                                  <span>{line.replace(/^-\s*/, '')}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div style={{ fontSize: 12.5, color: 'var(--ktext)', lineHeight: 1.6, fontFamily: 'var(--font-sans)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              {m.text}
                            </div>
                          )}
                        </div>

                        {/* Stats pill */}
                        {(m.model || m.filesCount > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: m.suggestions?.length ? 8 : 0 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 99,
                              background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.15)',
                              fontSize: 10, color: 'var(--kaccent)', fontFamily: 'var(--font-sans)', fontWeight: 600,
                            }}>
                              ✦ Claude Sonnet
                            </span>
                            {m.filesCount > 0 && (
                              <span style={{ fontSize: 10, color: 'var(--ksubtle)', fontFamily: 'var(--font-sans)' }}>
                                ✓ {m.filesCount} fichier{m.filesCount > 1 ? 's' : ''}
                                {m.tokens > 0 ? ` · ${(m.tokens/1000).toFixed(1)}K tok` : ''}
                                {m.cost > 0 ? ` · $${m.cost.toFixed(3)}` : ''}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Suggestions — scrollable chips */}
                        {m.suggestions?.length > 0 && (
                          <div style={{ display: 'flex', overflowX: 'auto', gap: 5, paddingBottom: 2, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {m.suggestions.map(s => (
                              <button key={s} onClick={() => handleSend(s)} style={{
                                flexShrink: 0, padding: '4px 11px', fontSize: 11, borderRadius: 99,
                                border: '1px solid var(--kborder)', background: 'var(--kpanel)',
                                color: 'var(--kmuted)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                whiteSpace: 'nowrap', transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.5)'; e.currentTarget.style.color = 'var(--kaccent)'; e.currentTarget.style.background = 'rgba(225,29,72,0.06)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--kborder)'; e.currentTarget.style.color = 'var(--kmuted)'; e.currentTarget.style.background = 'var(--kpanel)' }}
                              >{s}</button>
                            ))}
                          </div>
                        )}

                        {/* Hover actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                          <button
                            onClick={() => navigator.clipboard?.writeText(code || '').then(() => onToast?.('Copié !', 'success'))}
                            style={{ padding: '2px 9px', fontSize: 10, borderRadius: 99, border: '1px solid var(--kborder)', background: 'transparent', color: 'var(--ksubtle)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                          >Copier</button>
                          <button
                            onClick={e => { e.currentTarget.style.color = '#10b981'; setTimeout(() => { e.currentTarget.style.color = 'var(--ksubtle)' }, 1500) }}
                            style={{ padding: '2px 9px', fontSize: 10, borderRadius: 99, border: '1px solid var(--kborder)', background: 'transparent', color: 'var(--ksubtle)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                          >👍</button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ))}

              {/* Planning loading */}
              {planLoading && (
                <div className="msg-animate" style={{ display: 'flex', gap: 10 }}>
                  <KAvatar />
                  <div style={{ paddingTop: 2 }}>
                    <p style={{ fontSize: 11, color: 'var(--kmuted)', margin: '0 0 6px', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Kiro</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <svg width="13" height="13" fill="none" stroke="var(--kaccent)" strokeWidth="2"
                        viewBox="0 0 24 24" style={{ animation: 'spin 0.9s linear infinite', flexShrink: 0 }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      <span style={{ fontSize: 12, color: 'var(--kmuted)', fontFamily: 'var(--font-sans)' }}>
                        Kiro réfléchit...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Generation loading — thinking state */}
              {loading && (
                <div className="msg-animate" style={{ display: 'flex', gap: 10 }}>
                  <KAvatar />
                  <div style={{ paddingTop: 2 }}>
                    <p style={{ fontSize: 11, color: 'var(--kmuted)', margin: '0 0 6px', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Kiro</p>
                    <ThinkingState
                      step={thinkStep}
                      elapsed={thinkElapsed}
                      providerLabel="Claude Sonnet"
                      fileSteps={fileSteps}
                    />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── AI Status Bar ────────────────────────────────────────── */}
        <AIStatusBar apiOnline={apiOnline} loading={loading || planLoading} lastModel={lastModel} />

        {/* ── Input area ──────────────────────────────────────────── */}
        <div style={{ padding: '8px 14px 14px', flexShrink: 0 }}>

          {/* Image mode picker — shown after paste/drop, before any action */}
          {image && !showAnalysisPanel && (
            <div style={{
              marginBottom: 8, borderRadius: 12,
              background: 'var(--kbg)', border: '1px solid var(--kborder)',
              overflow: 'hidden',
            }}>
              {/* Top row: thumbnail + filename + remove */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 6px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={image.preview} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', display: 'block' }}/>
                </div>
                <span style={{
                  flex: 1, fontSize: 11, color: 'var(--kmuted)', fontFamily: 'var(--font-sans)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {image.name}
                </span>
                <button
                  onClick={() => setImage(null)}
                  title="Retirer l'image"
                  style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--kpanel2)', border: '1px solid var(--kborder)',
                    color: 'var(--kmuted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, lineHeight: 1,
                  }}
                >×</button>
              </div>

              {/* Mode buttons */}
              <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--kborder)' }}>
                {/* Mode: generate with image as reference (write prompt in chat) */}
                <button
                  onClick={() => { /* image stays attached, user types prompt and sends */ document.querySelector('[data-chat-input]')?.focus() }}
                  title="Décris ce que tu veux générer — l'image sera envoyée avec ton message"
                  style={{
                    flex: 1, padding: '8px 10px', border: 'none', borderRight: '1px solid var(--kborder)',
                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--kpanel2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ktext)', fontFamily: 'var(--font-sans)' }}>
                    ✏️ Écrire dans le chat
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--ksubtle)', fontFamily: 'var(--font-sans)' }}>
                    Décris ce que tu veux générer
                  </span>
                </button>

                {/* Mode: full Vision analysis */}
                <button
                  onClick={() => setShowAnalysisPanel(true)}
                  title="Analyser avec Claude Vision pour cloner ou s'inspirer du design"
                  style={{
                    flex: 1, padding: '8px 10px', border: 'none',
                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(225,29,72,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--kaccent)', fontFamily: 'var(--font-sans)' }}>
                    👁 Analyser avec Vision
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--ksubtle)', fontFamily: 'var(--font-sans)' }}>
                    Cloner ou s'inspirer du design
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Input card */}
          <div style={{
            borderRadius: 16,
            background: 'var(--kbg)',
            border: `1.5px solid ${inputFocus ? 'var(--kaccent)' : 'var(--kborder)'}`,
            boxShadow: inputFocus ? '0 0 0 3px rgba(225,29,72,0.10)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            overflow: 'hidden',
          }}>
            <textarea
              data-chat-input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => setInputFocus(true)}
              onBlur={() => setInputFocus(false)}
              placeholder={apiOnline ? 'Describe your app...' : 'Backend offline — lance le serveur...'}
              rows={3}
              style={{
                width: '100%', background: 'transparent',
                padding: '14px 14px 6px', fontSize: 13, color: 'var(--ktext)',
                outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)',
                lineHeight: 1.6, border: 'none', boxSizing: 'border-box',
              }}
            />

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px 10px' }}>
              {/* Left: icon group */}
              <div style={{
                display: 'flex', alignItems: 'center', padding: '3px',
                borderRadius: 10, background: 'var(--kpanel2)', border: '1px solid var(--kborder)', gap: 1,
              }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  title="Upload image (ou Ctrl+V, drag & drop)"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    background: image ? 'rgba(225,29,72,0.15)' : 'transparent',
                    color: image ? 'var(--kaccent)' : 'var(--ksubtle)',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2.5"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  {image && (
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: 'var(--kaccent)' }}/>
                  )}
                </button>

                <div style={{ width: 1, height: 14, background: 'var(--kborder)', margin: '0 1px' }}/>

                <button
                  title="Voice (coming soon)"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'not-allowed', opacity: 0.35,
                    background: 'transparent', color: 'var(--ksubtle)',
                  }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
              </div>

              {/* Claude Sonnet badge */}
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 99,
                background: 'var(--kpanel2)',
                fontSize: 11, fontWeight: 500,
                color: 'var(--ktext)', fontFamily: 'var(--font-sans)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706', flexShrink: 0 }}/>
                Claude Sonnet
              </span>

              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput}/>

              {/* Generate button */}
              <button
                onClick={() => handleSend()}
                disabled={!canSend}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 99,
                  background: canSend ? 'var(--kaccent)' : 'var(--kpanel2)',
                  color: canSend ? '#fff' : 'var(--ksubtle)',
                  border: canSend ? 'none' : '1px solid var(--kborder)',
                  fontSize: 12, fontWeight: 500, cursor: canSend ? 'pointer' : 'default',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  boxShadow: canSend ? '0 2px 8px rgba(225,29,72,0.35)' : 'none',
                }}
              >
                {loading || planLoading ? (
                  <>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    {planLoading ? 'Planning…' : 'Generating…'}
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Image Analysis Modal */}
      {showAnalysisPanel && image && (
        <ImageAnalysisPanel
          image={image}
          onClose={() => setShowAnalysisPanel(false)}
          onGenerate={handleGenerateFromImage}
          apiOnline={apiOnline}
          stack={stack}
          loading={loading}
        />
      )}
    </>
  )
}
