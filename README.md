# vercheck

Paste an email address, a domain or a link; vercheck measures it and shows every signal it
read. Live at https://agentforge-theta-three.vercel.app

## Why it was rebuilt

The first version was a landing page with no verification behind it: the verdict came from
hashing the input (`hash % 7 === 0 ? 'failed' : ...`), and the counters, history and confidence
rate were hardcoded. A green "Verified" badge meant nothing.

Now each report is produced by an actual lookup, and anything that cannot be measured is
reported as **not tested** rather than passed.

## What a check reads

| Target | Signals |
| --- | --- |
| Email | syntax and length limits · MX records (with A-record fallback) · throwaway provider list · role mailbox detection |
| Domain | A and AAAA records over DNS-over-HTTPS · existence (NXDOMAIN is distinguished from empty records) · private-address detection |
| URL | everything above · real HTTP request with status and timing · redirect chain (max five hops) · TLS certificate issuer, protocol and days to expiry · HSTS, CSP, nosniff, frame protection |

Details worth knowing:

- DNS is resolved over **DNS-over-HTTPS** (Cloudflare, then Google as fallback), so it works
  from a serverless function without a resolver library.
- The certificate is read with a real `tls.connect`, which is why `/api/verify` runs on the
  Node runtime instead of the edge.
- A request that times out is reported as *untested*, not *failed*: a slow network is not
  evidence about the target.
- The endpoint refuses local, private and IP-literal hosts, and caps redirects, timeouts and
  body downloads so it cannot be used as a port scanner.
- 12 checks per minute per IP, best effort per instance.

## What it explicitly cannot tell you

- Whether a specific mailbox exists. That needs SMTP probing or sending real mail.
- Whether a site is trustworthy, only whether it is technically sound.
- Reputation or blocklist data, which is not queried.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (build fails on type errors) · CSS custom
properties with automatic dark mode via `prefers-color-scheme` · no database, no account,
history in `localStorage`.

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm build   # typecheck + production build
```

No environment variables are required.

## Layout

```
app/page.tsx            marketing sections, server-rendered
app/api/verify/route.ts POST endpoint, Node runtime, per-IP throttle
components/Verifier.tsx client tool, report rendering, localStorage history
lib/verify.ts           DNS / HTTP / TLS measurements and scoring
```
