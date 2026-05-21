import { useState, useRef, useCallback } from 'react'

const STACKS = ['HTML', 'React', 'Vue', 'Tailwind', 'Bootstrap', 'FastAPI', 'Node.js', 'Three.js']

export default function ChatTab({ onGenerate, loading, apiOnline }) {
  const [prompt, setPrompt]     = useState('')
  const [techs, setTechs]       = useState([])
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Describe the app you want to build and I\'ll generate it instantly.' }
  ])
  const [image, setImage]       = useState(null)
  const fileRef                 = useRef(null)
  const textRef                 = useRef(null)

  const toggleTech = useCallback((t) => {
    setTechs(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }, [])

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImage({ base64: ev.target.result.split(',')[1], name: file.name, preview: ev.target.result })
    reader.readAsDataURL(file)
  }, [])

  const handleSend = useCallback(async () => {
    if (!prompt.trim() && !image) return
    const userMsg = prompt.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMsg, image: image?.preview }])
    setPrompt('')
    const imgB64 = image?.base64
    setImage(null)

    await onGenerate(userMsg, techs, imgB64)
    setMessages(prev => [...prev, { role: 'assistant', text: 'Code generated!' }])
  }, [prompt, techs, image, onGenerate])

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`text-xs rounded-lg p-2.5 leading-relaxed ${
            m.role === 'user'      ? 'bg-kiro-accent/15 border border-kiro-accent/25 text-kiro-text ml-4' :
            m.role === 'assistant' ? 'bg-kiro-green/10 border border-kiro-green/20 text-kiro-green mr-4' :
            'text-kiro-muted font-sans italic text-center'
          }`}>
            {m.image && <img src={m.image} alt="" className="w-full rounded mb-1.5 max-h-24 object-cover" />}
            <span className="font-sans">{m.text}</span>
          </div>
        ))}
        {loading && (
          <div className="bg-kiro-panel2 border border-kiro-border2 rounded-lg p-3 mr-4">
            <div className="dot-pulse flex gap-1.5">
              <span/><span/><span/>
            </div>
          </div>
        )}
      </div>

      {/* Tech chips */}
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {STACKS.map(t => (
          <button
            key={t}
            onClick={() => toggleTech(t)}
            className={`px-2 py-0.5 rounded text-xs transition-all font-sans ${
              techs.includes(t)
                ? 'bg-kiro-accent/20 border border-kiro-accent text-kiro-accent2'
                : 'bg-kiro-panel2 border border-kiro-border text-kiro-muted hover:border-kiro-border2 hover:text-kiro-subtle'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Image preview */}
      {image && (
        <div className="mx-3 mb-2 flex items-center gap-2 bg-kiro-panel2 border border-kiro-border2 rounded p-2">
          <img src={image.preview} alt="" className="h-10 w-10 object-cover rounded" />
          <span className="text-xs text-kiro-muted font-sans flex-1 truncate">{image.name}</span>
          <button onClick={() => setImage(null)} className="text-kiro-muted hover:text-kiro-red text-xs">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-kiro-border">
        <div className="bg-kiro-panel2 border border-kiro-border2 rounded-xl p-2 focus-within:border-kiro-accent/50 transition-colors">
          <textarea
            ref={textRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder={apiOnline ? 'Describe your app…' : 'Demo mode — describe your app…'}
            rows={3}
            className="w-full bg-transparent text-sm text-kiro-text placeholder-kiro-muted outline-none resize-none font-sans leading-relaxed"
          />
          <div className="flex items-center justify-between mt-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-kiro-muted hover:text-kiro-subtle text-xs transition-colors font-sans flex items-center gap-1"
            >
              📎 Image
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <button
              onClick={handleSend}
              disabled={loading || (!prompt.trim() && !image)}
              className="px-3 py-1 rounded-lg bg-kiro-accent hover:bg-kiro-accent2 disabled:opacity-40 text-white text-xs font-semibold transition-all font-sans"
            >
              {loading ? '...' : '⚡ Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
