import { useState, useCallback } from 'react'

/* ── Error classification ──────────────────────────────────────────── */
function classifyError(err, httpStatus) {
  const msg    = (err?.message || '').toLowerCase()
  const status = httpStatus || 0

  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('network request failed')
  ) {
    return {
      type: 'fetch_failed', severity: 'error',
      message: 'Backend hors ligne. Lance uvicorn brain:app --reload --port 8000 dans ton terminal.',
      actionLabel: 'Réessayer', retryable: true,
    }
  }
  if (msg.includes('cors') || msg.includes('blocked by cors')) {
    return {
      type: 'cors_error', severity: 'error',
      message: 'Erreur CORS — le backend bloque les requêtes frontend. Vérifie les origines dans brain.py.',
    }
  }
  if (status === 401 || msg.includes('invalid_api_key') || msg.includes('authentication_error') || msg.includes('unauthorized')) {
    return {
      type: 'api_key_missing', severity: 'error',
      message: 'Clé API invalide ou manquante. Vérifie ANTHROPIC_API_KEY dans backend/.env',
    }
  }
  if (status === 429 || msg.includes('rate_limit') || msg.includes('quota') || msg.includes('too many requests')) {
    return {
      type: 'api_quota', severity: 'warning',
      message: 'Quota API dépassé. Attends quelques secondes puis réessaie.',
      actionLabel: 'Réessayer', retryable: true,
    }
  }
  if (msg.includes('model_not_found') || (status === 404 && msg.includes('model'))) {
    return {
      type: 'model_not_found', severity: 'warning',
      message: 'Modèle introuvable. Vérifie la config dans backend/.env',
    }
  }
  if (msg.includes('json') || msg.includes('unexpected token') || msg.includes('syntaxerror')) {
    return {
      type: 'json_parse_error', severity: 'warning',
      message: 'Réponse IA malformée. Nouvelle tentative automatique...',
      autoRetry: true,
    }
  }
  if (err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('aborted') || status === 504) {
    return {
      type: 'timeout', severity: 'warning',
      message: 'Délai dépassé — le modèle prend trop de temps. Essaie un prompt plus court.',
      actionLabel: 'Réessayer', retryable: true,
    }
  }
  if (status === 500) {
    return {
      type: 'server_error', severity: 'error',
      message: 'Erreur serveur backend. Consulte les logs uvicorn dans ton terminal.',
    }
  }
  if (status === 422) {
    return {
      type: 'validation_error', severity: 'error',
      message: 'Format de requête invalide — données non reconnues par le backend.',
    }
  }
  return {
    type: 'unknown', severity: 'error',
    message: `Génération échouée : ${err?.message || 'Erreur inconnue'}`,
  }
}

/* ── Single fetch attempt ──────────────────────────────────────────── */
async function doFetch(body, extraHeaders = {}) {
  const r = await fetch('/api/generate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body:    JSON.stringify(body),
  })
  const httpStatus = r.status
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    const err    = new Error(detail.detail || `API error ${r.status}`)
    err.httpStatus = httpStatus
    throw err
  }
  return r.json()
}

/* ── Hook ──────────────────────────────────────────────────────────── */
export function useGenerate({ apiOnline, showToast, onSuccess, authHeaders }) {
  const [loading, setLoading]     = useState(false)
  const [lastStats, setLastStats] = useState(null)

  const generate = useCallback(async (
    prompt,
    techs          = [],
    imageBase64    = null,
    stack          = {},
    analysisMode   = 'clone',
    imageMediaType = 'image/png',
    provider       = 'auto',
    projectId      = null,
    contextFiles   = null,
  ) => {
    if (!prompt.trim() && !imageBase64) return

    if (!apiOnline) {
      return {
        __error: true,
        type: 'fetch_failed', severity: 'error',
        message: 'Backend hors ligne. Lance uvicorn brain:app --reload --port 8000 dans ton terminal.',
        actionLabel: 'Réessayer',
      }
    }

    setLoading(true)
    const t0 = Date.now()

    const body = {
      prompt,
      techs,
      stack,
      mode:             'auto',
      provider,
      image_base64:     imageBase64    || undefined,
      image_media_type: imageBase64    ? imageMediaType : undefined,
      analysis_mode:    imageBase64    ? analysisMode   : undefined,
      project_id:       projectId      || undefined,
      context_files:    contextFiles   || undefined,
    }

    let lastClassified = null
    let jsonRetries    = 0
    let timeoutRetries = 0
    const MAX_JSON    = 2
    const MAX_TIMEOUT = 1

    while (true) {
      try {
        const data = await doFetch(body, authHeaders ? authHeaders() : {})
        setLastStats({ model: data.model, tokens: data.tokens, ms: Date.now() - t0 })
        setLoading(false)
        onSuccess(data, prompt)
        return data

      } catch (err) {
        const classified = classifyError(err, err.httpStatus)
        lastClassified   = classified

        // Auto-retry for JSON parse errors (silent)
        if (classified.autoRetry && jsonRetries < MAX_JSON) {
          jsonRetries++
          await new Promise(r => setTimeout(r, 1000))
          continue
        }

        // Single retry for timeout (with message)
        if (classified.type === 'timeout' && timeoutRetries < MAX_TIMEOUT) {
          timeoutRetries++
          continue
        }

        break
      }
    }

    setLoading(false)
    return { __error: true, ...lastClassified }

  }, [apiOnline, onSuccess]) // showToast kept for potential future use

  return { generate, loading, lastStats }
}
