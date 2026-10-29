'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleSlash,
  Copy,
  Loader2,
  Mail,
  ScanSearch,
  Timer,
  XCircle,
} from 'lucide-react'

export type SignalStatus = 'pass' | 'warn' | 'fail' | 'skip'
export type Verdict = 'verified' | 'review' | 'failed'

export type VerifyResult = {
  target: string
  kind: 'email' | 'url' | 'domain'
  verdict: Verdict
  confidence: number | null
  headline: string
  summary: string
  signals: { key: string; label: string; status: SignalStatus; detail: string }[]
  meta: { checkedAt: string; durationMs: number; host: string | null; finalUrl: string | null }
}

const STORAGE_KEY = 'vercheck.history.v2'
const MAX_HISTORY = 12

const VERDICT_LABEL: Record<Verdict, string> = {
  verified: 'Verified',
  review: 'Needs review',
  failed: 'Failed',
}

const STATUS_ICON: Record<SignalStatus, typeof Check> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  skip: CircleSlash,
}

const EXAMPLES = ['https://stripe.com', 'hello@nordmail.de', 'github.com', 'temp-mail.org']

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function Verifier() {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [history, setHistory] = useState<VerifyResult[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as VerifyResult[]
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, MAX_HISTORY))
      }
    } catch {
      // a broken or blocked storage must not break the tool
    }
  }, [])

  const persist = useCallback((next: VerifyResult[]) => {
    setHistory(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // private mode: keep it in memory only
    }
  }, [])

  const stats = useMemo(() => {
    if (!history.length) return null
    const verified = history.filter((item) => item.verdict === 'verified').length
    const durations = history.map((item) => item.meta.durationMs).sort((a, b) => a - b)
    const median = durations[Math.floor(durations.length / 2)]
    return {
      total: history.length,
      verified,
      passRate: Math.round((verified / history.length) * 100),
      median,
    }
  }, [history])

  async function run(target: string) {
    const clean = target.trim()
    if (!clean || busy) return
    setBusy(true)
    setError('')
    setCopied(false)
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: clean }),
      })
      const payload = (await res.json()) as VerifyResult & { error?: string; detail?: string }
      if (!res.ok) {
        setError(payload.error ? `${payload.error}${payload.detail ? ` ${payload.detail}` : ''}` : 'The check failed.')
        return
      }
      setResult(payload)
      setValue('')
      persist([payload, ...history.filter((item) => item.target.toLowerCase() !== payload.target.toLowerCase())].slice(0, MAX_HISTORY))
    } catch {
      setError('Could not reach the verifier. Check the connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function copyReport() {
    if (!result) return
    const lines = [
      `vercheck report · ${new Date(result.meta.checkedAt).toLocaleString('en-GB')}`,
      `Target: ${result.target}`,
      `Verdict: ${VERDICT_LABEL[result.verdict]} (${result.confidence ?? 0}% of signals passed)`,
      '',
      ...result.signals.map((signal) => `[${signal.status.toUpperCase()}] ${signal.label}: ${signal.detail}`),
      '',
      'Measured with DNS-over-HTTPS, a live HTTP request and a TLS handshake.',
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setError('Clipboard access was blocked by the browser.')
    }
  }

  return (
    <>
      <div className="verifier">
        <form
          className="verifier-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(value)
          }}
        >
          <div className="input-row">
            <label className="input-wrap">
              <ScanSearch size={17} />
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="hello@example.com, example.com or https://example.com"
                aria-label="Email, domain or URL to verify"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button className="btn primary" type="submit" disabled={busy || !value.trim()}>
              {busy ? <Loader2 size={16} className="spin" /> : <ScanSearch size={16} />}
              {busy ? 'Checking' : 'Verify'}
            </button>
          </div>

          <div className="form-note">
            <span>
              <Mail size={11} /> No signup, no tracking of what you check
            </span>
            <span>
              <Timer size={11} /> Live DNS, HTTP and TLS lookups take 1 to 8 seconds
            </span>
          </div>

          <div className="examples">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="example"
                onClick={() => {
                  setValue(example)
                  void run(example)
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </form>

        {error && <div className="alert">{error}</div>}

        {busy && !result && (
          <div style={{ padding: '18px 16px 22px', display: 'grid', gap: 10 }}>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="skeleton-row" style={{ width: `${88 - index * 11}%` }} />
            ))}
          </div>
        )}

        {result && (
          <div className="result">
            <div className="result-head">
              <div>
                <h2 className="result-title">{result.headline}</h2>
                <p className="result-target">
                  {result.target} · {result.kind}
                </p>
              </div>
              <span className={`verdict ${result.verdict}`}>
                {result.verdict === 'verified' ? (
                  <CheckCircle2 size={13} />
                ) : result.verdict === 'review' ? (
                  <AlertTriangle size={13} />
                ) : (
                  <XCircle size={13} />
                )}
                {VERDICT_LABEL[result.verdict]}
              </span>
            </div>

            <p className="result-summary">{result.summary}</p>

            <div className="meter">
              <div className="meter-top">
                <span>Signals passed</span>
                <span>
                  {result.confidence ?? 0}% · {result.meta.durationMs} ms
                </span>
              </div>
              <div className="meter-bar">
                <div
                  className={`meter-fill ${result.verdict}`}
                  style={{ width: `${result.confidence ?? 0}%` }}
                />
              </div>
            </div>

            <ul className="signals">
              {result.signals.map((signal) => {
                const Icon = STATUS_ICON[signal.status]
                return (
                  <li key={signal.key} className="signal">
                    <span className={`signal-icon ${signal.status}`}>
                      <Icon size={13} />
                    </span>
                    <span className="signal-body">
                      <span className="signal-label">
                        {signal.label}
                        {signal.status === 'skip' && <code>not tested</code>}
                      </span>
                      <span className="signal-detail">{signal.detail}</span>
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="result-foot">
              <span>
                Checked {new Date(result.meta.checkedAt).toLocaleTimeString('en-GB')} · measured, not inferred
              </span>
              <button className="btn" onClick={() => void copyReport()} type="button">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy report'}
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="history" id="history">
        <div className="section-head">
          <h2>Your recent checks</h2>
          {history.length > 0 && (
            <button
              className="hint"
              onClick={() => persist([])}
              type="button"
              style={{ color: 'var(--muted)', textDecoration: 'underline' }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="stat-row">
          <div className="stat">
            <span>Checks run</span>
            <strong>{stats ? stats.total : '—'}</strong>
            <small>{stats ? 'stored in this browser only' : 'run a check to start counting'}</small>
          </div>
          <div className="stat">
            <span>Pass rate</span>
            <strong>{stats ? `${stats.passRate}%` : '—'}</strong>
            <small>{stats ? `${stats.verified} of ${stats.total} fully verified` : 'no checks yet'}</small>
          </div>
          <div className="stat">
            <span>Median time</span>
            <strong>{stats ? `${(stats.median / 1000).toFixed(1)}s` : '—'}</strong>
            <small>time to complete a check</small>
          </div>
        </div>

        <div className="history-list">
          {history.length === 0 && (
            <div className="empty-history">
              Nothing here yet. This list lives in your browser and is never uploaded.
            </div>
          )}
          {history.map((item) => (
            <button
              key={`${item.target}-${item.meta.checkedAt}`}
              className="history-item"
              onClick={() => {
                setResult(item)
                setError('')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              type="button"
            >
              <span className={`verdict ${item.verdict}`} style={{ flexShrink: 0 }}>
                {VERDICT_LABEL[item.verdict]}
              </span>
              <span className="history-value">{item.target}</span>
              <span className="history-time">{timeAgo(item.meta.checkedAt)}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
