# Purging secrets from git history

The repo is public and its history contains at least one previously-live Stripe
key plus payment links, site IDs, and internal runbooks. Making the repo private
does **not** remove them from already-cloned copies or from history. Do this in
order.

## 1. Rotate first (rotation beats redaction)
A leaked secret is compromised the moment it's public. **Rotate it in the source
system before touching git history:**
- Stripe → Developers → API keys → roll the secret key. Update it in Netlify env, not in code.
- If the payment links in `assets/launch-config.js` were meant to be private, regenerate them.
Rotation is what actually protects you; history rewriting just reduces exposure of the dead value.

## 2. Make the repo private
GitHub → repo → Settings → Danger Zone → Change visibility → Private.

## 3. Scan history for secrets
```bash
# install gitleaks (https://github.com/gitleaks/gitleaks) then:
gitleaks detect --source . --report-path gitleaks-report.json
```
Review the report so you know every path/commit to purge.

## 4. Rewrite history with git filter-repo
```bash
pip install git-filter-repo   # or brew install git-filter-repo

# Work on a fresh mirror clone so a mistake is recoverable:
git clone --mirror git@github.com:<you>/github-scout-project.git gs-mirror
cd gs-mirror

# Replace known secret strings everywhere in history. Put each secret on its own
# line in replacements.txt as:   sk_live_OLDKEY==>REDACTED
git filter-repo --replace-text ../replacements.txt

# If secrets sit in whole files that should never have been committed:
git filter-repo --path assets/launch-config.js --invert-paths   # example

git push --force
```
After force-push, anyone with an old clone must re-clone; old commit SHAs die.

## 5. Prevent recurrence
- Add pre-commit secret scanning: `gitleaks protect --staged`.
- Move payment links / IDs to Netlify env or an untracked `launch-config.local.js`
  and add it to `.gitignore`; commit only a `launch-config.example.js`.
- Never commit `sk_live_*`, `whsec_*`, `SUPABASE_SERVICE_ROLE_KEY`.

## 6. Assume anything ever public is burned
Even after a clean rewrite, treat every credential that was ever in a public
commit as compromised and rotate it. GitHub, forks, and archives may retain copies.
