# Deploy to the staging site

A staging site already exists on your Netlify account:
**githubscout-v2-staging** → https://githubscout-v2-staging.netlify.app
(site id `84089b10-225b-4e0f-9d34-1a2b7d0bc466`)

It's empty — the deploy upload has to run from your Mac, because the build
sandbox can't reach Netlify's upload host. The build folder is synced to your
computer, so this is quick.

## One-time deploy (from your Mac)

Open Terminal and run, from inside the synced `github-scout-build` folder:

```bash
cd "<path-to>/github-scout-build"
npx netlify-cli deploy --site 84089b10-225b-4e0f-9d34-1a2b7d0bc466 --dir . --prod
```

If it asks you to log in: `npx netlify-cli login` first.

## Before you run real scans on it
The scan function needs no keys for free/teaser scans, so a bare deploy will let
you verify the crawler on real stores immediately. For accounts, quotas, and
paid depth, set the env vars from SETUP.md on this staging site first
(Netlify → githubscout-v2-staging → Site configuration → Environment variables).

## Note on visibility
Your Netlify plan (team dev/free) doesn't offer password protection, so this
staging URL is public if someone guesses it. It's noindex-friendly but not
private. Don't point ads at it, and don't put real Stripe *live* keys on staging
— use Stripe test mode.

## After deploy — the live verification I couldn't run from the sandbox
1. Scan 3-5 real Shopify stores; expect 7-10/10 sources to succeed, detections with evidence.
2. Stripe test-mode purchase → confirm subscription row, sign-in email, full-depth scan, quota decrement.
3. Confirm anonymous scans return teaser depth (shallower than paid).
Report back and I'll fix anything that surfaces.
