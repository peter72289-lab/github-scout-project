# Email deliverability setup (Resend)

Sign-in links and purchase fulfillment go through transactional email. If SPF,
DKIM, and DMARC aren't set, links land in spam and sign-ins silently fail —
which looks exactly like a broken product to a paying customer.

## 1. Verify a sending domain in Resend
Resend → Domains → Add domain (use a subdomain you control, e.g.
`transactional.yourdomain.com`). Resend gives you DNS records to add.

## 2. Add the DNS records at your registrar
- **SPF** (TXT on the sending subdomain): `v=spf1 include:resend.com ~all`
- **DKIM** (CNAME records Resend provides): add each exactly as shown.
- **DMARC** (TXT at `_dmarc.yourdomain.com`): start monitoring-only:
  `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
  Tighten to `p=quarantine` then `p=reject` once reports look clean.

## 3. Set the app env vars
- `RESEND_API_KEY` = your Resend API key
- `AUTH_EMAIL_FROM` = `Scout <login@transactional.yourdomain.com>`
  (the from-domain must match the verified domain).

## 4. Verify end to end
- Health check: `/.netlify/functions/health` should report `"email": true`.
- Request a sign-in link to an inbox you control; confirm it arrives and is not
  flagged. Check headers show `dkim=pass` and `spf=pass`.

## Fallback behavior (by design)
If `RESEND_API_KEY` is unset, magic links are **logged to the function logs**
instead of emailed, so the flow is testable pre-launch without a mail provider.
Never rely on this in production — it means anyone with log access sees links.

## If you switch providers
Only `sendMagicEmail()` in `netlify/functions/lib/auth.js` talks to Resend.
Swap that one function for Postmark/SES/etc.; the rest of auth is unchanged.
