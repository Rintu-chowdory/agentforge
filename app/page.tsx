'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  Accessibility,
  Activity,
  CloudCog,
  FileWarning,
  Link2Off,
  ServerCog,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  Globe2,
  History,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  MailCheck,
  Link2,
  LockKeyhole,
  Gauge,
  Radar,
  ScanSearch,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type CheckStatus = 'verified' | 'review' | 'failed'

type Verification = {
  id: number
  value: string
  status: CheckStatus
  label: string
  time: string
  detail: string
}

const initialChecks: Verification[] = [
  { id: 1, value: 'https://stripe.com', status: 'verified', label: 'Verified', time: '2 min ago', detail: 'Domain is active and trusted.' },
  { id: 2, value: 'hello@northstar.studio', status: 'verified', label: 'Verified', time: '18 min ago', detail: 'Email format and domain checks passed.' },
  { id: 3, value: 'https://acme-example.co', status: 'review', label: 'Needs review', time: '1 hr ago', detail: 'Some signals need a closer look.' },
  { id: 4, value: 'support@unknown-mail.net', status: 'failed', label: 'Could not verify', time: 'Yesterday', detail: 'We could not confirm this contact.' },
]

const statusMeta = {
  verified: { icon: CheckCircle2, className: 'status-verified' },
  review: { icon: TriangleAlert, className: 'status-review' },
  failed: { icon: XCircle, className: 'status-failed' },
}

function getVerification(value: string): Verification {
  const normalized = value.trim().toLowerCase()
  const hash = Array.from(normalized).reduce((total, char) => total + char.charCodeAt(0), 0)
  const status: CheckStatus = normalized.includes('unknown') || normalized.includes('fake') || hash % 7 === 0 ? 'failed' : hash % 5 === 0 ? 'review' : 'verified'
  const labels = { verified: 'Verified', review: 'Needs review', failed: 'Could not verify' }
  const details = {
    verified: 'The value passed all available verification signals.',
    review: 'The value looks plausible, but a few signals need review.',
    failed: 'We could not confirm this value with enough confidence.',
  }
  return { id: Date.now(), value: value.trim(), status, label: labels[status], time: 'Just now', detail: details[status] }
}

export default function Page() {
  const [value, setValue] = useState('')
  const [checks, setChecks] = useState(initialChecks)
  const [activeCheck, setActiveCheck] = useState<Verification | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState('')

  const stats = useMemo(() => ({
    total: checks.length,
    verified: checks.filter((check) => check.status === 'verified').length,
  }), [checks])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isChecking) return
    const cleanValue = value.trim()
    if (!cleanValue || !cleanValue.includes('@') && !cleanValue.includes('://') && cleanValue.length < 3) {
      setError('Enter a valid email address, URL, or value to verify.')
      return
    }
    setError('')
    setIsChecking(true)
    window.setTimeout(() => {
      const result = getVerification(cleanValue)
      setChecks((current) => [result, ...current.filter((check) => check.value !== result.value)].slice(0, 8))
      setActiveCheck(result)
      setIsChecking(false)
    }, 650)
  }

  const snowflakes = useMemo(() => Array.from({ length: 42 }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    size: `${3 + ((index * 11) % 6)}px`,
    delay: `${-((index * 1.7) % 14)}s`,
    duration: `${9 + ((index * 13) % 10)}s`,
    drift: `${-35 + ((index * 17) % 70)}px`,
    opacity: `${0.28 + ((index * 7) % 55) / 100}`,
  })), [])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="winter-scene" aria-hidden="true">
        <img src="/winter-trees.png" alt="" className="winter-image" />
        <div className="winter-image-tint" />
      </div>
      <div className="snowfall" aria-hidden="true">
        {snowflakes.map((flake) => (
          <span
            key={flake.id}
            className="snowflake"
            style={{
              left: flake.left,
              width: flake.size,
              height: flake.size,
              animationDelay: flake.delay,
              animationDuration: flake.duration,
              ['--snow-drift' as string]: flake.drift,
              opacity: flake.opacity,
            }}
          />
        ))}
      </div>
      <header className="app-header">
        <div className="page-shell header-inner">
          <a href="#top" className="brand" aria-label="vercheck home">
            <span className="brand-mark"><ShieldCheck aria-hidden="true" /></span>
            <span>vercheck</span>
          </a>
          <nav className="header-nav" aria-label="Primary navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#history">History</a>
            <a href="#about">About</a>
          </nav>
          <Button variant="outline" size="sm" className="header-button" onClick={() => document.getElementById('verify-input')?.focus()}>
            Start a check <ArrowUpRight data-icon="inline-end" />
          </Button>
        </div>
      </header>

      <div id="top" className="page-shell main-content">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles aria-hidden="true" /> Simple checks. Clear answers.</div>
            <h1 id="hero-title">Know what you&apos;re<br /><span>looking at.</span></h1>
            <p>Verify emails, domains, and links in seconds. vercheck brings the signals together so you can move forward with confidence.</p>
          </div>
          <div className="hero-note" aria-label="Verification service status">
            <span className="pulse-dot" /> All systems operational
          </div>
        </section>

        <section className="workspace-grid" aria-label="Verification workspace">
          <div className="verify-card surface-card">
            <div className="card-heading">
              <div className="icon-tile"><ClipboardCheck aria-hidden="true" /></div>
              <div><h2>Run a verification</h2><p>Paste anything you want to check.</p></div>
            </div>
            <form onSubmit={handleSubmit} className="verify-form">
              <label htmlFor="verify-input">Email, URL, or domain</label>
              <div className={`input-wrap ${error ? 'input-error' : ''}`}>
                <Search aria-hidden="true" />
                <input id="verify-input" value={value} onChange={(event) => { setValue(event.target.value); setError('') }} placeholder="e.g. hello@example.com" autoComplete="off" />
                {value && <button type="button" className="clear-button" aria-label="Clear value" onClick={() => setValue('')}><XCircle aria-hidden="true" /></button>}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <Button type="submit" size="lg" className="verify-button" disabled={isChecking}>
                {isChecking ? <><Loader2 className="spin" data-icon="inline-start" /> Checking signals...</> : <>Verify now <ArrowUpRight data-icon="inline-end" /></>}
              </Button>
            </form>
            <div className="trust-row"><Check aria-hidden="true" /> No account needed <span /> <Globe2 aria-hidden="true" /> Works worldwide</div>
          </div>

          <div className={`result-card surface-card ${activeCheck ? `result-${activeCheck.status}` : ''}`} aria-live="polite">
            {activeCheck ? (
              <>
                <div className="result-topline"><span>Latest result</span><time>Just now</time></div>
                <div className="result-symbol"><CheckCircle2 aria-hidden="true" /></div>
                <span className={`result-badge ${activeCheck.status}`}>{activeCheck.label}</span>
                <h2>{activeCheck.value}</h2>
                <p>{activeCheck.detail}</p>
                <div className="result-checks"><div><Check aria-hidden="true" /> Format check</div><div><Check aria-hidden="true" /> Signal scan</div><div><Check aria-hidden="true" /> Reputation check</div></div>
                <button className="text-link" onClick={() => setValue(activeCheck.value)}>Run again <ArrowUpRight aria-hidden="true" /></button>
              </>
            ) : (
              <div className="result-empty"><div className="empty-symbol"><FileCheck2 aria-hidden="true" /></div><h2>Your result will appear here</h2><p>Run a check to see a clear, easy-to-understand summary.</p><div className="empty-lines"><span /><span /><span /></div></div>
            )}
          </div>
        </section>

        <section className="overview-strip" aria-label="Workspace overview">
          <div className="overview-item"><span className="overview-icon"><Activity aria-hidden="true" /></span><span><strong>{stats.total}</strong><small>Total checks</small></span></div>
          <div className="overview-item"><span className="overview-icon overview-green"><CheckCircle2 aria-hidden="true" /></span><span><strong>{stats.total ? Math.round((stats.verified / stats.total) * 100) : 0}%</strong><small>Confidence rate</small></span></div>
          <div className="overview-item"><span className="overview-icon overview-blue"><Clock3 aria-hidden="true" /></span><span><strong>&lt; 1 sec</strong><small>Average response</small></span></div>
          <div className="overview-note"><Sparkles aria-hidden="true" /><span>Every result is explained in plain language.</span></div>
        </section>

        <section id="history" className="history-section" aria-labelledby="history-title">
          <div className="section-heading"><div><div className="eyebrow"><History aria-hidden="true" /> Your workspace</div><h2 id="history-title">Recent checks</h2></div><span className="count-pill">{stats.verified} of {stats.total} verified</span></div>
          <div className="history-list">
            {checks.map((check) => {
              const StatusIcon = statusMeta[check.status].icon
              return <button key={check.id} className="history-item" onClick={() => setActiveCheck(check)}><span className={`history-icon ${statusMeta[check.status].className}`}><StatusIcon aria-hidden="true" /></span><span className="history-value"><strong>{check.value}</strong><small>{check.detail}</small></span><span className={`history-status ${check.status}`}>{check.label}</span><time>{check.time}</time><ExternalLink className="history-arrow" aria-hidden="true" /></button>
            })}
          </div>
        </section>

        <section id="tools" className="tools-section" aria-labelledby="tools-title">
          <div className="section-heading"><div><div className="eyebrow"><Radar aria-hidden="true" /> More ways to check</div><h2 id="tools-title">Your verification toolkit.</h2></div><span className="tool-hint">Built into every check</span></div>
          <div className="tools-grid">
            <article className="tool-card"><span className="tool-icon tool-blue"><MailCheck aria-hidden="true" /></span><h3>Email health</h3><p>Spot risky addresses, disposable inboxes, and invalid formats.</p><button type="button" onClick={() => { setValue('hello@example.com'); document.getElementById('verify-input')?.focus() }}>Try an email <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-mint"><Link2 aria-hidden="true" /></span><h3>Link safety</h3><p>Review a URL before you click, share, or send it to your team.</p><button type="button" onClick={() => { setValue('https://example.com'); document.getElementById('verify-input')?.focus() }}>Check a link <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-violet"><ScanSearch aria-hidden="true" /></span><h3>Domain signals</h3><p>Understand domain activity with a quick, readable confidence scan.</p><button type="button" onClick={() => { setValue('example.com'); document.getElementById('verify-input')?.focus() }}>Scan a domain <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-amber"><LockKeyhole aria-hidden="true" /></span><h3>Security posture</h3><p>Spot trust gaps in links and domains before they reach your customers.</p><button type="button" onClick={() => { setValue('https://example.com'); document.getElementById('verify-input')?.focus() }}>Review security <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-cyan"><Gauge aria-hidden="true" /></span><h3>Performance pulse</h3><p>Get a quick signal on whether a web destination is ready to share.</p><button type="button" onClick={() => { setValue('https://example.com'); document.getElementById('verify-input')?.focus() }}>Run pulse check <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-rose"><Accessibility aria-hidden="true" /></span><h3>Accessibility scan</h3><p>Make your important pages easier for every person to use.</p><button type="button" onClick={() => { setValue('https://example.com'); document.getElementById('verify-input')?.focus() }}>Check accessibility <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-sky"><CloudCog aria-hidden="true" /></span><h3>DNS health</h3><p>Inspect domain records and spot configuration issues before they spread.</p><button type="button" onClick={() => { setValue('example.com'); document.getElementById('verify-input')?.focus() }}>Check DNS <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-slate"><ServerCog aria-hidden="true" /></span><h3>Headers audit</h3><p>Review essential HTTP security headers for a safer web presence.</p><button type="button" onClick={() => { setValue('https://example.com'); document.getElementById('verify-input')?.focus() }}>Audit headers <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-orange"><Link2Off aria-hidden="true" /></span><h3>Broken links</h3><p>Find dead destinations and keep the links your visitors rely on healthy.</p><button type="button" onClick={() => { setValue('https://example.com'); document.getElementById('verify-input')?.focus() }}>Find broken links <ArrowUpRight aria-hidden="true" /></button></article>
            <article className="tool-card"><span className="tool-icon tool-yellow"><FileWarning aria-hidden="true" /></span><h3>Uptime watch</h3><p>Confirm a destination is reachable and identify moments that need attention.</p><button type="button" onClick={() => { setValue('https://example.com'); document.getElementById('verify-input')?.focus() }}>Check uptime <ArrowUpRight aria-hidden="true" /></button></article>
          </div>
        </section>

        <section id="how-it-works" className="steps-section" aria-labelledby="steps-title">
          <div><div className="eyebrow"><Clock3 aria-hidden="true" /> Built for momentum</div><h2 id="steps-title">Clarity in three steps.</h2></div>
          <div className="steps-grid"><div className="step"><span>01</span><h3>Paste your value</h3><p>Start with an email, URL, or domain that needs a quick confidence check.</p></div><div className="step"><span>02</span><h3>We check the signals</h3><p>vercheck looks at the details that help you separate signal from noise.</p></div><div className="step"><span>03</span><h3>Make your call</h3><p>Get a direct result that helps you decide what to do next.</p></div></div>
        </section>
      </div>
      <footer id="about" className="app-footer"><div className="page-shell"><span>vercheck</span><a href="mailto:chowdorydevops@gmail.com">chowdorydevops@gmail.com</a><span>© 2026 vercheck</span></div></footer>
    </main>
  )
}

