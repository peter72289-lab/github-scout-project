# Data retention & deletion

## What's stored
| Data | Table | Purpose |
|---|---|---|
| Email | `accounts` | Login identity, billing |
| Sign-in tokens (hashed) | `magic_links` | Passwordless auth |
| Session tokens (hashed) | `sessions` | Keeping you signed in |
| Subscription status | `subscriptions` | Entitlement |
| Saved scan reports | `scans` | Dashboard history |
| Monthly counters | `usage` | Quota enforcement |
| Stripe event ids | `stripe_events` | Webhook idempotency |

Tokens are stored as SHA-256 hashes, never in plaintext.

## Automatic cleanup
`cleanup-scheduled.js` runs daily and purges expired magic links, dead sessions,
and stale rate-limit rows. It does **not** delete scans or accounts.

## User-initiated deletion (GDPR/CCPA erasure)
Signed-in users can delete everything from the dashboard "Danger zone", which
calls `account-delete.js` (requires `{confirm:true}`). It removes scans,
sessions, magic links, usage, subscriptions, then the account row. Foreign keys
also cascade. This is irreversible.

For requests by email instead of self-service, verify identity (they must
control the account email — e.g. complete a sign-in) before deleting.

## Retention defaults to review with counsel
- Scans persist until the user deletes them. Consider a max age (e.g. 24 months)
  for inactive accounts.
- Stripe holds billing records independently per its own retention.
- Set the real retention windows in privacy.html once counsel reviews (the
  `[[placeholders]]` there must be completed first).
