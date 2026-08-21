# Cross-stream handoffs

The channel for one stream or session to ask another for work, clarification, or a decision that
sits outside its own turf, and the durable record of what each session left behind. The rules
live here so every session finds them with the file.

## How it works

1. **Write the entry first** (durable). Add a row under the target stream's section: next `HX-n`
   id, your stream, a **bold one-line executive summary** (at most 140 chars), and a link to the
   detailed context (your ledger section, an ADR, a PR). Detail lives at the link; this file is
   an index, not an essay.
2. **Then nudge, if the owning session is live** (fast path). `ListAgents` shows live peer
   sessions; `SendMessage` them one line: the HX id plus "see status/HANDOFFS.md". The message is
   the doorbell; this file is the package. Never put the substance only in a chat message.
3. **Owning stream**: check your section at session start and when a message arrives. Answer by
   doing the work or replying in your own ledger; flip the entry to `answered` with a one-line
   resolution and link. Move fully-closed entries to History.
4. **Never** edit another stream's ledger, never stall waiting: file the handoff, continue your
   own work. If the ask needs the USER (not a stream), it goes to `TASKS_FOR_USER.md` instead.
5. **Id allocation.** Check this file immediately before writing an id and take the highest id
   present plus one, not the highest you remember. Two sessions reading at different moments
   have produced duplicate ids before.
6. **Session handoff entries** (one session leaving state for the next, same stream) go under
   `## Session log` below with the same bold-lead rule and a pointer to the ledger.

Entry states: `open` -> `answered` (resolution linked) -> History.

## Template

| ID   | From     | Ask                                                              | State |
| ---- | -------- | ---------------------------------------------------------------- | ----- |
| HX-n | <stream> | **<bold one-line ask, impact stated.>** Detail: `<path#section>` | open  |

## -> platform

| ID  | From | Ask | State |
| --- | ---- | --- | ----- |

None open.

## Session log

| ID   | Date       | Session  | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HX-1 | 2026-08-20 | platform | **Repo adopted from `peter72289-lab/github-scout-project` at `5761f1e`; conventions, ledgers, CI, hygiene files, and gap analysis written; no code or git state changed.** Readers audited product, tech, history, and ops and produced `docs/GAP-TO-MARKET.md`, `docs/PRODUCT-OVERVIEW.md`, `docs/ARCHITECTURE.md`. This session added `CLAUDE.md`, `STATUS.md`, `status/platform.md`, this file, `TASKS_FOR_USER.md`, `.github/` (PR template, issue templates, `ci.yml`), root `.gitignore` additions, `.prettierrc.json`, `.prettierignore`. Verified: `bun tests/run-tests.js` 49 pass; `bun scripts/preflight.js` exits 1 on legal placeholders (expected). Four blockers opened (PLT-1..4), all waiting on the user. Next session: start with `STATUS.md` "Next 3 actions". |
| HX-2 | 2026-08-21 | platform | **Ten PRs (#2-#10) closed every code-side defect in `docs/GAP-TO-MARKET.md`; 143 tests pass and nothing is deployed.** Money path (#3), evidence-gated savings (#4), client honesty and the "15 sources" claim (#5), quota/blocked-crawl handling (#6), account lifecycle (#7), checkout gate and test integrity (#8), deploy surface and dead weight (#9), scan telemetry (#10). Checkout is disarmed by `fulfillmentReady: false` — flipping it is the launch action. Every remaining milestone is owner-blocked: see `TASKS_FOR_USER.md` items 1-4 and 11-13. Next session: do not start engineering; check whether the owner has answered.                                                                                                                                     |

## History

None.
