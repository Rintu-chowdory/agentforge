import { Check, Globe2, Link2, Mail, ShieldCheck, TriangleAlert } from 'lucide-react'
import Verifier from '@/components/Verifier'

export default function Page() {
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">
              <ShieldCheck size={16} />
            </span>
            vercheck
          </a>
          <nav className="nav">
            <a href="#signals">Signals</a>
            <a href="#history">History</a>
            <a href="https://github.com/Rintu-chowdory/agentforge" target="_blank" rel="noreferrer">
              Source
            </a>
          </nav>
        </div>
      </header>

      <main className="shell" id="top">
        <section className="hero">
          <div>
            <h1>
              Know what you are <span>looking at</span>.
            </h1>
            <p className="lede">
              Paste an email address, a domain or a link. vercheck reads the DNS records, makes the
              request and inspects the certificate, then shows you every signal it measured, including
              the ones it could not test.
            </p>
          </div>

          <aside className="hero-aside">
            <h2>What a check reads</h2>
            <ul>
              <li>
                <Check size={13} />
                DNS over HTTPS: A, AAAA and MX records, straight from the resolver
              </li>
              <li>
                <Check size={13} />
                A real HTTP request, with the redirect chain and the status it returns
              </li>
              <li>
                <Check size={13} />
                The TLS certificate: issuer, protocol and days left before expiry
              </li>
              <li>
                <Check size={13} />
                Hardening headers: HSTS, CSP, nosniff and frame protection
              </li>
            </ul>
          </aside>
        </section>

        <Verifier />

        <section className="block" id="signals">
          <h2>Signals, not a black box</h2>
          <p className="sub">
            Every row in a report is one measurement with a plain-language reading. Nothing is
            averaged into a score you cannot inspect.
          </p>

          <div className="grid-3">
            <div className="tile">
              <h3>
                <Mail size={14} /> Email addresses
              </h3>
              <p>The address itself, plus the domain that would have to accept the mail.</p>
              <ul>
                <li>RFC-shaped syntax and length limits</li>
                <li>MX records, with an A-record fallback explanation</li>
                <li>Known throwaway providers</li>
                <li>Role mailboxes such as support@ or noreply@</li>
              </ul>
            </div>

            <div className="tile">
              <h3>
                <Globe2 size={14} /> Domains and links
              </h3>
              <p>Whether the host exists, answers, and does so over a valid certificate.</p>
              <ul>
                <li>Published A and AAAA addresses</li>
                <li>HTTP status, response time and server header</li>
                <li>Redirect chain, capped at five hops</li>
                <li>Certificate validity and remaining days</li>
              </ul>
            </div>

            <div className="tile warn-tile">
              <h3>
                <TriangleAlert size={14} /> What this cannot tell you
              </h3>
              <p>Honest limits, because a green badge is worthless if it means nothing.</p>
              <ul>
                <li>Whether a specific mailbox exists: that needs SMTP or a real send</li>
                <li>Whether a site is trustworthy, only whether it is technically sound</li>
                <li>Content reputation or blocklists, which are not queried</li>
                <li>Anything behind a login or bot wall</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="block">
          <h2>Why it looks like this</h2>
          <p className="sub">
            The first version of this page generated a verdict by hashing the input: a coin flip
            wearing a checkmark. This one performs the lookups, reports each signal with the evidence
            behind it, and marks anything it could not test as untested instead of passing it. Your
            check history stays in your browser.
          </p>
          <div className="grid-3">
            <div className="tile">
              <h3>
                <Link2 size={14} /> One target per check
              </h3>
              <p>Emails, domains and URLs are detected automatically. A bare host is checked over HTTPS.</p>
            </div>
            <div className="tile">
              <h3>
                <ShieldCheck size={14} /> No account
              </h3>
              <p>There is no signup, no database and no server-side log of the values you check.</p>
            </div>
            <div className="tile">
              <h3>
                <Check size={14} /> Built for honesty
              </h3>
              <p>If a resolver is down or a site refuses the request, the report says so rather than guessing.</p>
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <span>
            vercheck · measured with DNS-over-HTTPS, a live HTTP request and a TLS handshake.
          </span>
          <span>
            Source on{' '}
            <a href="https://github.com/Rintu-chowdory/agentforge" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </span>
        </footer>
      </main>
    </>
  )
}
