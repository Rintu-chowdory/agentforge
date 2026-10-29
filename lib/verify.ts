import { connect as tlsConnect } from 'node:tls'

/**
 * Real verification.
 *
 * Everything here is measured, not guessed: DNS records are read over DNS-over-HTTPS,
 * the target is actually fetched, the certificate is actually inspected, and the security
 * headers are read off the response. A signal that cannot be measured is reported as
 * `skip` with the reason, never as a pass.
 *
 * Server-only: this module uses node:tls and must never be imported by a client component.
 */

export type SignalStatus = 'pass' | 'warn' | 'fail' | 'skip'
export type Verdict = 'verified' | 'review' | 'failed'
export type TargetKind = 'email' | 'url' | 'domain'

export type Signal = {
  key: string
  label: string
  status: SignalStatus
  detail: string
}

export type VerifyResult = {
  target: string
  kind: TargetKind
  verdict: Verdict
  confidence: number | null
  headline: string
  summary: string
  signals: Signal[]
  meta: {
    checkedAt: string
    durationMs: number
    host: string | null
    finalUrl: string | null
  }
}

const DISPOSABLE = new Set([
  '10minutemail.com', '10minutemail.net', 'temp-mail.org', 'tempmail.com', 'tempmail.net',
  'tempmailo.com', 'throwawaymail.com', 'guerrillamail.com', 'guerrillamail.net',
  'sharklasers.com', 'grr.la', 'spam4.me', 'mailinator.com', 'mailinator.net', 'yopmail.com',
  'yopmail.fr', 'getnada.com', 'nada.email', 'discard.email', 'dispostable.com',
  'trashmail.com', 'trashmail.de', 'mintemail.com', 'mailnesia.com', 'maildrop.cc',
  'mohmal.com', 'mytemp.email', 'burnermail.io', 'tempr.email', 'emailondeck.com',
  'fakeinbox.com', 'spamgourmet.com', 'mailsac.com', 'inboxkitten.com', 'moakt.com',
  'tempmailaddress.com', '1secmail.com', '1secmail.net', '1secmail.org', 'instantemailaddress.com',
  'mailcatch.com', 'mail-temp.com', 'harakirimail.com', 'jetable.org', 'tempinbox.com',
  'luxusmail.org', 'vomoto.com', 'eyepaste.com', 'getairmail.com', 'mailbox52.com',
])

const FREEMAIL = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.de', 'gmx.de', 'gmx.net', 'gmx.at', 'web.de', 't-online.de',
  'freenet.de', 'posteo.de', 'mailbox.org', 'icloud.com', 'me.com', 'proton.me',
  'protonmail.com', 'aol.com', 'zoho.com', 'yandex.com', 'mail.ru', 'seznam.cz',
])

const ROLE_ACCOUNTS = new Set([
  'admin', 'administrator', 'abuse', 'billing', 'contact', 'hello', 'help', 'info',
  'kontakt', 'mail', 'noreply', 'no-reply', 'office', 'postmaster', 'press', 'privacy',
  'sales', 'security', 'support', 'team', 'webmaster', 'jobs', 'careers',
])

const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

type DnsAnswer = { name: string; type: number; data: string; TTL: number }
type DnsReply = { Status: number; Answer?: DnsAnswer[] }

const DNS_TYPES = { MX: 15, A: 1, AAAA: 28, TXT: 16 } as const

async function dns(name: string, type: keyof typeof DNS_TYPES): Promise<DnsReply | null> {
  const providers = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  ]
  for (const url of providers) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/dns-json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) return (await res.json()) as DnsReply
    } catch {
      // try the next resolver
    }
  }
  return null
}

function isPrivateAddress(address: string): boolean {
  if (address.includes(':')) {
    const lower = address.toLowerCase()
    return (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80') ||
      lower.startsWith('::ffff:127.') ||
      lower.startsWith('::ffff:10.')
    )
  }
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

type TlsInfo = {
  ok: boolean
  protocol?: string
  issuer?: string
  validTo?: string
  daysLeft?: number
  error?: string
}

function probeTls(host: string): Promise<TlsInfo> {
  return new Promise((resolve) => {
    let settled = false
    const done = (info: TlsInfo) => {
      if (settled) return
      settled = true
      resolve(info)
    }

    const socket = tlsConnect({ host, port: 443, servername: host, timeout: 7000 }, () => {
      const certificate = socket.getPeerCertificate()
      const validTo = certificate?.valid_to ? new Date(certificate.valid_to) : null
      done({
        ok: Boolean(certificate && certificate.subject),
        protocol: socket.getProtocol() ?? undefined,
        issuer: certificate?.issuer?.O ?? certificate?.issuer?.CN ?? undefined,
        validTo: validTo ? validTo.toISOString() : undefined,
        daysLeft: validTo ? Math.round((validTo.getTime() - Date.now()) / 86400000) : undefined,
      })
      socket.end()
    })

    socket.on('error', (error: Error) => done({ ok: false, error: error.message }))
    socket.on('timeout', () => {
      socket.destroy()
      done({ ok: false, error: 'TLS handshake timed out' })
    })
  })
}

type HttpInfo = {
  ok: boolean
  status: number | null
  finalUrl: string | null
  chain: string[]
  server: string | null
  contentType: string | null
  elapsedMs: number
  headers: Record<string, string>
  error?: string
}

async function probeHttp(url: string): Promise<HttpInfo> {
  const started = Date.now()
  const chain: string[] = []
  let current = url

  for (let hop = 0; hop < 5; hop += 1) {
    let res: Response
    try {
      res = await fetch(current, {
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(9000),
        headers: {
          'user-agent': 'vercheck/2.0 (+verification report; contact via site)',
          accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
      })
    } catch (error) {
      return {
        ok: false,
        status: null,
        finalUrl: current,
        chain,
        server: null,
        contentType: null,
        elapsedMs: Date.now() - started,
        headers: {},
        error: error instanceof Error ? error.message : 'request failed',
      }
    }

    chain.push(current)
    const location = res.headers.get('location')
    const isRedirect = res.status >= 300 && res.status < 400 && location

    if (!isRedirect) {
      const headers: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value
      })
      // Do not download the body; we only need the response metadata.
      try {
        await res.body?.cancel()
      } catch {
        // ignore
      }
      return {
        ok: true,
        status: res.status,
        finalUrl: res.url || current,
        chain,
        server: headers['server'] ?? null,
        contentType: headers['content-type'] ?? null,
        elapsedMs: Date.now() - started,
        headers,
      }
    }

    const next = new URL(location, current).toString()
    if (chain.includes(next)) {
      return {
        ok: true,
        status: res.status,
        finalUrl: current,
        chain,
        server: null,
        contentType: null,
        elapsedMs: Date.now() - started,
        headers: {},
        error: 'redirect loop',
      }
    }
    current = next
  }

  return {
    ok: false,
    status: null,
    finalUrl: current,
    chain,
    server: null,
    contentType: null,
    elapsedMs: Date.now() - started,
    headers: {},
    error: 'too many redirects',
  }
}

function parseTarget(raw: string): { kind: TargetKind; host: string; url: string | null; email: string | null } | null {
  const value = raw.trim()
  if (!value) return null

  if (value.includes('@') && !value.includes('://')) {
    return { kind: 'email', host: value.split('@').pop()!.toLowerCase(), url: null, email: value.toLowerCase() }
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(withScheme)
    if (!HOST_RE.test(url.hostname)) return null
    const bare = !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    const looksLikeUrl = bare ? value.includes('/') || value.includes('?') || url.port !== '' : true
    return {
      kind: looksLikeUrl ? 'url' : 'domain',
      host: url.hostname.toLowerCase(),
      url: url.toString(),
      email: null,
    }
  } catch {
    return null
  }
}

function summarise(kind: TargetKind, signals: Signal[], host: string | null): { verdict: Verdict; confidence: number | null; headline: string; summary: string } {
  const scored = signals.filter((signal) => signal.status !== 'skip')
  const passed = scored.filter((signal) => signal.status === 'pass').length
  const warned = scored.filter((signal) => signal.status === 'warn').length
  const failed = scored.filter((signal) => signal.status === 'fail').length

  const confidence = scored.length ? Math.round((passed / scored.length) * 100) : null
  const verdict: Verdict = failed > 0 ? 'failed' : warned > 0 ? 'review' : 'verified'

  const noun = kind === 'email' ? 'address' : kind === 'domain' ? 'domain' : 'link'
  const subject = kind === 'email' ? 'This address' : host ? host : `This ${noun}`

  const headline =
    verdict === 'verified'
      ? `${subject} looks sound`
      : verdict === 'review'
        ? `${subject} needs a closer look`
        : `${subject} did not pass`

  const summary =
    verdict === 'verified'
      ? `All ${scored.length} measurable signals passed.`
      : verdict === 'review'
        ? `${passed} of ${scored.length} signals passed and ${warned} ${warned === 1 ? 'needs' : 'need'} attention.`
        : `${failed} of ${scored.length} signals failed; treat this ${noun} as unsafe until you know more.`

  return { verdict, confidence, headline, summary }
}

export async function verifyTarget(raw: string): Promise<VerifyResult> {
  const started = Date.now()
  const parsed = parseTarget(raw)

  if (!parsed) {
    return {
      target: raw.trim().slice(0, 200),
      kind: 'domain',
      verdict: 'failed',
      confidence: null,
      headline: 'That is not an email, domain or link',
      summary: 'Enter something like hello@example.com, example.com or https://example.com/page.',
      signals: [
        {
          key: 'syntax',
          label: 'Format',
          status: 'fail',
          detail:
            'The value could not be parsed as an email address, domain or URL. Local hosts, IP addresses and internal names are not checked.',
        },
      ],
      meta: { checkedAt: new Date().toISOString(), durationMs: Date.now() - started, host: null, finalUrl: null },
    }
  }

  const signals: Signal[] = []

  if (parsed.kind === 'email') {
    const email = parsed.email!
    const domain = parsed.host
    const local = email.split('@')[0]

    const valid = EMAIL_RE.test(email) && email.length <= 254 && local.length <= 64
    signals.push({
      key: 'syntax',
      label: 'Address syntax',
      status: valid ? 'pass' : 'fail',
      detail: valid ? `${email.length} characters, valid local part and domain.` : 'The address does not match a valid email format.',
    })

    const mx = await dns(domain, 'MX')
    const records = (mx?.Answer ?? []).filter((answer) => answer.type === DNS_TYPES.MX)
    if (!mx) {
      signals.push({ key: 'mx', label: 'Mail exchanger', status: 'skip', detail: 'DNS lookup did not answer.' })
    } else if (records.length) {
      const hosts = records.map((record) => record.data.split(/\s+/).pop()).filter(Boolean)
      signals.push({
        key: 'mx',
        label: 'Mail exchanger',
        status: 'pass',
        detail: `${records.length} MX record${records.length === 1 ? '' : 's'}: ${hosts.slice(0, 3).join(', ')}`,
      })
    } else {
      const addresses = await dns(domain, 'A')
      const hasAddress = (addresses?.Answer ?? []).some((answer) => answer.type === DNS_TYPES.A)
      signals.push({
        key: 'mx',
        label: 'Mail exchanger',
        status: hasAddress ? 'warn' : 'fail',
        detail: hasAddress
          ? 'No MX record. Mail falls back to the A record, so delivery is unreliable.'
          : 'No MX record and no A record: this domain cannot receive mail.',
      })
    }

    signals.push({
      key: 'disposable',
      label: 'Disposable provider',
      status: DISPOSABLE.has(domain) ? 'fail' : 'pass',
      detail: DISPOSABLE.has(domain)
        ? `${domain} is a throwaway mailbox provider.`
        : `${domain} is not on the throwaway provider list.`,
    })

    signals.push({
      key: 'role',
      label: 'Mailbox type',
      status: ROLE_ACCOUNTS.has(local) ? 'warn' : 'pass',
      detail: ROLE_ACCOUNTS.has(local)
        ? `"${local}@" is a role address, which usually reaches a queue rather than a person.`
        : FREEMAIL.has(domain)
          ? `Personal address on a free mail provider (${domain}).`
          : 'Looks like a named mailbox.',
    })

    signals.push({
      key: 'mailbox',
      label: 'Mailbox existence',
      status: 'skip',
      detail: 'Not tested. Confirming a mailbox exists requires sending mail or SMTP probing, which this tool does not do.',
    })
  } else {
    const url = parsed.url!
    const host = parsed.host

    const validHost = HOST_RE.test(host)
    signals.push({
      key: 'format',
      label: 'Hostname',
      status: validHost ? 'pass' : 'fail',
      detail: validHost ? `${host} is a syntactically valid public hostname.` : 'The hostname is not valid.',
    })

    const a = await dns(host, 'A')
    const aaaa = await dns(host, 'AAAA')
    const addresses = [
      ...(a?.Answer ?? []).filter((answer) => answer.type === DNS_TYPES.A).map((answer) => answer.data),
      ...(aaaa?.Answer ?? []).filter((answer) => answer.type === DNS_TYPES.AAAA).map((answer) => answer.data),
    ]

    if (!a && !aaaa) {
      signals.push({ key: 'dns', label: 'DNS records', status: 'skip', detail: 'DNS lookup did not answer.' })
    } else if (addresses.length === 0) {
      signals.push({
        key: 'dns',
        label: 'DNS records',
        status: 'fail',
        detail: a?.Status === 3 ? 'The domain does not exist (NXDOMAIN).' : 'The domain has no A or AAAA record.',
      })
    } else {
      const privateHit = addresses.find(isPrivateAddress)
      signals.push({
        key: 'dns',
        label: 'DNS records',
        status: privateHit ? 'warn' : 'pass',
        detail: privateHit
          ? `Resolves to a private address (${privateHit}), so it is not reachable from the public internet.`
          : `${addresses.length} address${addresses.length === 1 ? '' : 'es'} published: ${addresses.slice(0, 4).join(', ')}`,
      })
    }

    const reachable = addresses.length > 0 && !addresses.some(isPrivateAddress)
    if (!reachable) {
      signals.push({
        key: 'http',
        label: 'HTTP response',
        status: 'skip',
        detail: 'Skipped because the host does not resolve to a public address.',
      })
      signals.push({ key: 'tls', label: 'Certificate', status: 'skip', detail: 'Skipped: no public address to connect to.' })
    } else {
      const http = await probeHttp(url)
      const timedOut = Boolean(http.error && /abort|timeout|timed out/i.test(http.error))
      if (!http.ok && timedOut) {
        signals.push({
          key: 'http',
          label: 'HTTP response',
          status: 'warn',
          detail: 'The request did not finish in time. That can be a slow site or a slow network, so it stays untested rather than failed.',
        })
      } else if (!http.ok) {
        signals.push({
          key: 'http',
          label: 'HTTP response',
          status: 'fail',
          detail: http.error ? `Request failed: ${http.error}` : 'The site did not answer.',
        })
      } else if (http.status !== null && http.status < 400) {
        signals.push({
          key: 'http',
          label: 'HTTP response',
          status: 'pass',
          detail: `${http.status} in ${http.elapsedMs} ms${http.server ? ` from ${http.server}` : ''}.`,
        })
      } else if (http.status !== null && http.status < 500) {
        signals.push({
          key: 'http',
          label: 'HTTP response',
          status: 'warn',
          detail: `${http.status} means the host answered but refused this request.`,
        })
      } else {
        signals.push({
          key: 'http',
          label: 'HTTP response',
          status: 'fail',
          detail: `${http.status ?? 'No status'} means the service behind it is failing.`,
        })
      }

      if (http.chain.length > 1) {
        signals.push({
          key: 'redirects',
          label: 'Redirects',
          status: http.chain.length > 3 ? 'warn' : 'pass',
          detail: `${http.chain.length - 1} redirect${http.chain.length - 1 === 1 ? '' : 's'} · ended at ${http.finalUrl}`,
        })
      }

      if (url.startsWith('https://')) {
        const tls = await probeTls(host)
        if (!tls.ok) {
          signals.push({ key: 'tls', label: 'Certificate', status: 'fail', detail: `TLS handshake failed: ${tls.error ?? 'unknown error'}.` })
        } else if (tls.daysLeft !== undefined && tls.daysLeft < 0) {
          signals.push({ key: 'tls', label: 'Certificate', status: 'fail', detail: `Certificate expired ${Math.abs(tls.daysLeft)} days ago.` })
        } else if (tls.daysLeft !== undefined && tls.daysLeft < 14) {
          signals.push({ key: 'tls', label: 'Certificate', status: 'warn', detail: `Valid, but expires in ${tls.daysLeft} days.` })
        } else {
          signals.push({
            key: 'tls',
            label: 'Certificate',
            status: 'pass',
            detail: `${tls.protocol ?? 'TLS'} from ${tls.issuer ?? 'an unknown issuer'}, valid for ${tls.daysLeft ?? '?'} more days.`,
          })
        }
      } else {
        signals.push({
          key: 'tls',
          label: 'Certificate',
          status: 'warn',
          detail: 'This URL is plain HTTP, so traffic is not encrypted in transit.',
        })
      }

      const headers = http.headers
      const present = [
        headers['strict-transport-security'] ? 'HSTS' : null,
        headers['content-security-policy'] ? 'CSP' : null,
        headers['x-content-type-options'] ? 'nosniff' : null,
        headers['x-frame-options'] || headers['content-security-policy']?.includes('frame-ancestors') ? 'frame' : null,
      ].filter(Boolean) as string[]

      if (!http.ok || http.status === null) {
        signals.push({ key: 'headers', label: 'Security headers', status: 'skip', detail: 'Skipped: no successful response to read.' })
      } else {
        signals.push({
          key: 'headers',
          label: 'Security headers',
          status: present.length >= 3 ? 'pass' : present.length >= 1 ? 'warn' : 'fail',
          detail: present.length ? `${present.length} of 4 hardening headers set: ${present.join(', ')}` : 'None of HSTS, CSP, nosniff or frame protection are set.',
        })
      }
    }
  }

  const summary = summarise(parsed.kind, signals, parsed.host)

  return {
    target: raw.trim().slice(0, 200),
    kind: parsed.kind,
    ...summary,
    signals,
    meta: {
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      host: parsed.host,
      finalUrl: parsed.url,
    },
  }
}
