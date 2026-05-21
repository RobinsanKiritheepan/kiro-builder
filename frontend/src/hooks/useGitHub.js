import { useState, useCallback } from 'react'

export function useGitHub({ showToast, code }) {
  const [ghStatus, setGhStatus] = useState('idle')

  const pushToGitHub = useCallback(async ({ repo, token, message }) => {
    if (!repo || !token) {
      showToast('Repo and token required', 'error')
      return
    }
    setGhStatus('pushing')
    try {
      const r = await fetch('/api/github/push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ repo, token, message }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Push failed')
      setGhStatus('ok')
      showToast(`Pushed to github.com/${repo}`, 'success')
      setTimeout(() => setGhStatus('idle'), 5000)
    } catch (err) {
      setGhStatus('error')
      showToast(`GitHub push failed: ${err.message}`, 'error')
      setTimeout(() => setGhStatus('idle'), 5000)
    }
  }, [showToast])

  return { pushToGitHub, ghStatus }
}
