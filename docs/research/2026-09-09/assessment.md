# GitHub Scout Assessment

## Executive assessment

**Recommendation: continue with a narrow, evidence-based pilot for storefront software decisions. Prioritize Shopify agencies and experienced operators as paying design partners, while keeping a simpler, guided audit for solopreneurs.** The useful product joins cost control and opportunity discovery around one question: which software change is worth making in this particular store?

The concept addresses a credible operational problem, but demand and willingness to pay remain unvalidated. Direct app-cost auditors already exist. Public technology detection, software directories, profit dashboards, and WordPress portfolio management are also established competitive categories. GitHub Scout needs to earn a place through verified costs, store-specific compatibility, practical migration guidance, and follow-up on what changed.

The public V9 website currently overstates the product behind it. Its free-query interface calls itself live but returns predefined results. In a fresh browser test, a Shopify product-review replacement query returned CRM, newsletter, and survey examples. The supplied Perplexity cockpit is explicitly labeled as seeded scenario data, and its Shopify search returned no matches. These are useful prototypes, but neither interaction demonstrates a functioning storefront opportunity engine.[^1][^2]

The current remote repository contains a substantially stronger V2 Shopify scanner, including account sessions, signed payment webhooks, saved scans, quotas, and improved crawl protection. Its status ledger says V2 has never been deployed. It still does not implement the broader GitHub opportunity engine, BigCommerce, or WooCommerce. The immediate opportunity is to evaluate and finish the existing rebuild, then add the missing decision workflow.[^3][^36]

Five decisions should drive the next phase:

1. Sell a documented software decision and its outcome, rather than access to a large repository count.
2. Make public scanning an initial evidence source. Use merchant-provided records or approved integrations for actual billing, activity, and ownership.
3. Offer native features, better commercial apps, consolidation, downgrades, and open-source options on equal terms. Keeping the existing app must be a legitimate result.
4. Separate store optimization from developer business opportunities such as acquiring abandoned projects or building commercial wrappers.
5. Validate repeat usage and delivery economics before selling low-priced, high-volume subscriptions.

## Repository and release assessment

Three implementations were inspected. The local outer checkout is at July 3 commit `6232a6ee`; the GitHub remote is at August 21 commit `d159bcd`. A separate local nested project, `scout-avatar-pages`, is dated September 9 and remains outside the outer repository’s tracked files. None should silently be treated as another version’s deployed capability.

| Capability | Public V9 / legacy code | Current remote V2 |
|---|---|---|
| Public storefront scanning | Single-page signature heuristic | Implemented multi-source Shopify storefront scanner |
| Meaning of source count | Homepage promises 15 discovery platforms | Catalogue declares 10 live storefront-derived sources and 5 planned |
| Actual app spend | Inferred benchmark ranges | Still benchmark estimates, with stronger evidence gates; no merchant invoice ledger |
| Authentication and paid access | Links/forms; no backend plan verification in legacy code | Magic links, secure sessions, signed Stripe subscription lifecycle, full/teaser handling |
| Usage/history | No durable plan-credit workflow | Atomic reservation/release of credits and saved signed-in scans |
| Crawl security | Some private-address/redirect checks; resolve-then-fetch gap | Address validation pinned to the connection, redirects rechecked; shared rate limiting when configured |
| GitHub opportunity discovery | Static query examples and disconnected seed data | No production opportunity ingestion/recommendation system identified |
| BigCommerce / WooCommerce | No implemented connectors | No implemented connectors identified |
| Release readiness | Public experience observed, substantial claims gap | Code present; ledger records configuration and launch blockers |

V2’s ten sources are storefront observations such as homepage, product data, robots, DNS, cart, discovered product pages, script hosts, structured data, headers, and checkout fingerprints. They are not ten independent discovery platforms analogous to GitHub, Product Hunt, and software directories. Several derive from the same storefront evidence. This is a valid scanner architecture, but the marketing must describe its coverage accurately.[^37]

The newer aggregation code suppresses dollar output unless it confirms Shopify, fetches evidence, and detects paid-app signals. It then uses benchmark prices and a 15-40% consolidation/downgrade range. That is an improvement in uncertainty handling, but it still cannot establish the merchant’s real app plan, actual invoice, or avoidable cost.[^38]

The account, payment, and usage work is substantive. The current handler differentiates anonymous teasers from full reports, reserves plan credits atomically, releases them for specified blocked/no-evidence outcomes, and persists account scans. The payment handler checks signatures and event duplication and handles subscription state. The auth code stores hashed magic links and uses secure cookies. These are implemented components to preserve and validate, not features to rebuild from scratch.[^39][^40]

**Release blockers remain operational and product-related.** The remote status ledger records missing service configuration, unresolved business/legal placeholders, payment-account/key questions, and no demonstrated deployment or completed beta fulfillment. Its checkout readiness flag remains disabled. These are repository-recorded blockers, not independent evidence about the provider accounts’ current state. The live V9 site still exposes payment links; loading a link does not prove successful, appropriate fulfillment.[^36]

V2 also improves the URL-fetch boundary by validating the address used at connection time. That directly addresses the legacy resolve-then-fetch concern. Do not carry an old security finding forward as an unfixed V2 defect. Deployment-specific verification, tenant-isolation checks, safe report rendering, and rate-limit behavior remain necessary before broad use.[^41]

Validation evidence has three levels: fresh browser observations of V9 and the cockpit; direct inspection of current remote code; and locally executed tests for the separate prototype. The separate local prototype passed 13 tests. V2’s ledger reports 143 passing tests, but that suite was not rerun for this assessment. Existing passing code tests do not establish configured infrastructure, payment delivery, or recommendation accuracy.[^36]

The technical priority is to consolidate around the current remote implementation after review, maintain one authoritative source/feature catalogue, and close release blockers. Then build the missing data and decision layers: merchant charge reconciliation, capability/dependency mapping, an evaluated alternatives catalogue, and an agency change/approval workflow. If distribution moves into the Shopify App Store, revalidate billing architecture: Shopify requires a Shopify-provided billing solution for published apps; the external Stripe funnel should not be assumed portable unchanged.[^13]

## Customer groups and positioning

The two customer groups share a software catalogue and evidence model, but need different interfaces and buying reasons. Experience alone is not enough to segment them: decision authority, technical capacity, number of stores, and who bears implementation risk also matter.

| Dimension | Marketing manager / solopreneur | Agency / experienced portfolio operator |
|---|---|---|
| Primary job | Understand spend, avoid bad purchases, choose a manageable next step | Detect changes, standardize client stacks, discover useful alternatives |
| Purchase trigger | Rising bills, slow storefront, conflicting apps, uncertainty about best practices | New client onboarding, renewal, stack change, maintenance problem, new capability |
| First useful result | Three prioritized actions with costs, evidence, effort, and plain-language instructions | Cross-store exceptions and a client-ready recommendation queue |
| Main friction | Limited access, time, technical confidence, or authority to remove apps | False positives, alert noise, client permissions, weak export and approval workflow |
| Recurring value | Renewal reminders, price changes, follow-up after changes | Portfolio history, new installations, maintenance events, policy exceptions, opportunity alerts |
| Poor default | A raw GitHub repository with installation instructions | Repeated generic savings reports without change detection |

**Recommended primary buyer hypothesis:** a Shopify-focused agency managing approximately 5-30 stores, with a named technical owner. This is a proposed recruitment segment, not a measured market-size claim. Agencies can implement recommendations and provide repeat feedback across stores. Their requirements are demanding, so the first version should support a small portfolio and a clear approval workflow before promising dozens of automated integrations.

**Recommended novice offer:** a guided, one-store review with an optional follow-up. A marketing manager may need owner or finance approval for billing access and cancellation. The report should identify an approver and implementation owner rather than assume the reader can act.

Suggested positioning: **“Know what to keep, replace, and test across your storefront software.”** Supporting copy: “Review your app costs and storefront signals, compare suitable alternatives, and get an action plan with evidence and implementation effort.”

“GitHub Scout” is a reasonable internal name for the discovery engine. As the main merchant brand it emphasizes a technical source instead of the buyer’s outcome. Test a storefront-oriented product descriptor before investing in a rebrand. Naming and trademark availability were not assessed.

## Competitor landscape

Prices are publicly displayed amounts checked for this assessment, not negotiated quotes. Unless marked otherwise, dollar prices below are monthly USD amounts; taxes, usage charges, limits, and billing cadence can change the effective cost. Product functionality is vendor-described unless independently observed. Absence of a feature from a listing does not prove the product lacks it.

| Product | Competitive role and published price | Implication for Scout |
|---|---|---|
| CostPilot Pro | Direct Shopify app-cost/overlap auditor; $9.99/month or $79/year. Listing showed no reviews and an August 27, 2026 launch.[^18] | Cost scanning is already a product category. Differentiate with verified billing and implementation outcomes. |
| Shopify App Cost Auditor | Direct Chrome extension: typical prices, redundancy groups, script-performance claims, local history. No price displayed; no ratings.[^19] | Browser-assisted inventory is an existing approach. Typical prices still do not establish actual spend. |
| Shopify admin + Sidekick | Native app billing/history controls and AI assistance; Sidekick is included with Shopify.[^4][^20] | The free baseline is substantial. Scout must make a better, more complete decision easier. |
| Vitals | App-suite consolidation; $29.99/month plus stated usage charges.[^21] | A credible consolidation option, but assess feature coverage and total cost independently. |
| Koala Inspector | Public Shopify stack and competitor research; free tier, Premium $22/month.[^22] | Generic “what apps does this store use?” discovery is inexpensive. |
| Store Leads | Ecommerce store/technology database; paid plans from $75/month, with higher tiers for broader data workflows.[^23] | Agencies already have technology monitoring and data suppliers. Scout should use or complement them where economical. |
| BuiltWith | Public website technology research; core Basic plan $295/month.[^24] | Broad detection coverage is expensive to reproduce and insufficient as a unique advantage. |
| Wappalyzer | Technology lookup/enrichment; free account allowance and paid Pro at $250/month.[^25] | Another established alternative for public stack intelligence. |
| AlternativeTo | Community-based software alternative directory; free browsing.[^26] | A generic alternatives table has little pricing power. |
| awesome-selfhosted | Broad community-maintained self-hosted software catalogue; public GitHub list.[^27] | Useful input source; does not establish commerce compatibility or operational savings. |
| SolvoHQ / OSAlt | Separate, early self-hosted SaaS alternatives project with cost/migration-oriented claims.[^28] | A design reference, not evidence of a mature commerce intelligence competitor. |
| ManageWP | WordPress fleet management; free core and paid per-site add-ons.[^29] | Agencies already expect centralized maintenance, monitoring, and reporting. |
| MainWP | Self-hosted WordPress fleet management; free Essentials, Pro $29/month.[^30] | Potential integration or distribution partner; compete on decisions instead of duplicating updates/backups. |
| WP Umbrella | Managed WordPress operations; $1.99/site/month base, optional security add-on.[^31] | Portfolio monitoring has a low-cost operational baseline. |
| TrueProfit | Merchant profitability analytics; Basic $35/month with order limits.[^32] | App savings should feed financial analysis rather than recreate a full P&L product. |
| Lifetimely | Profit, LTV, cohorts, and attribution; free small-store tier, published paid tier at $149/month.[^33] | Sophisticated merchants already evaluate profitability; Scout needs a narrower software decision advantage. |
| BeProfit | Profit analytics across stores and channels; Shopify listing starts at $49/month.[^34] | Expense visibility is adjacent to, but different from, a safe app replacement decision. |
| Cledara | Corporate SaaS spend controls, renewals, invoices, and usage workflows; eligibility-based Basic offer, otherwise £100/month.[^35] | Strong functional analogue. Commerce-specific dependencies and implementation guidance are the opportunity. |

CostPilot Pro and the Chrome extension are direct competitors, but their public descriptions are not proof that they accurately identify every installed or unused app. A controlled comparison using consenting stores is still needed. Their early status is not grounds to dismiss them: a product can undercut a generic audit while still having limited traction.

The largest competitive pressure for novice users is the combination of Shopify’s existing controls, Sidekick, app-store discovery, and consolidation vendors. For agencies it is existing workflows: a spreadsheet, internal expertise, a technology detector, and a WordPress management dashboard. Switching requires Scout to save analyst time or improve decisions measurably.

The strongest potential advantage is a maintained record connecting **store requirement → installed capability → verified cost → suitable alternative → migration work → observed outcome**. Source aggregation alone is easy to imitate. The harder work is maintaining accurate mappings, rejecting unsuitable substitutions, learning why recommendations were declined, and retaining evidence across changes.

## Platform feasibility and evidence requirements

**Installed, active, observed, used, and billed are different states.** An app may run only in admin, fulfillment, checkout, a scheduled job, or a consented session. A disabled storefront widget may belong to a paid app whose other functions are essential. An annual subscription can remain economically committed after its code is removed. A public scan cannot resolve these distinctions by itself.

| Evidence layer | Reasonable conclusion | Conclusion to avoid |
|---|---|---|
| Public HTML / scripts | A recognizable public signature appeared on a sampled page | Every installed app was found; unobserved apps are unused |
| Authenticated inventory | An app/plugin is installed or enabled, subject to API coverage | It generates value, runs correctly, or incurs a specific charge |
| Merchant invoice / contract | A verified charge and billing period exist | Cancellation produces an immediate refund or all future costs disappear |
| Configuration and activity evidence | A particular feature, event, job, or workflow was active in a stated window | No observed event means no business value |
| Controlled performance comparison | A measured change under stated test conditions | Script count alone caused a revenue loss |
| Post-change billing and business metrics | A charge stopped, and specified metrics changed | The software change caused every observed business improvement |

For performance, add measured third-party transfer and execution effects under stated device/page/consent conditions. Lighthouse provides relevant diagnostics, but page speed and financial value remain different measurements.[^12]

**Shopify.** The admin already exposes app plans, billing cycles, usage charges, extensions, functions, pixels, and history. Use these as the pilot’s merchant-verifiable baseline.[^4] The `currentAppInstallation` query concerns the authenticated app’s own installation and subscriptions; it is not a general ledger of competitor-app bills.[^6] Shopify staff guidance describes `read_apps` access as requiring case-by-case approval, while current reference wording and support discussions are not fully consistent. Validate inventory and billing fields with a development app and written platform confirmation before making universal automatic-access promises.[^7]

Start with an export/upload or guided merchant-confirmation route that works even if privileged API access is unavailable. Keep estimated list prices separate from verified charges. Shopify-billed pending charges can still appear after uninstall, and externally billed subscriptions are managed with their developers.[^4][^5]

**WooCommerce.** WordPress exposes authenticated plugin inventory with active/inactive status through its plugin REST interface; WP-CLI offers another owner-operated inventory path.[^9] This makes technical inventory attractive, but paid plugin renewals and agency license allocations still need separate records. Must-use plugins, multisite, custom theme code, and hosting behavior need explicit coverage decisions. Build as an extension to existing agency operations where possible.

**BigCommerce.** Do not assume the Scripts API is a complete inventory of every vendor script: its documentation limits retrieval and management to scripts created by the API account making the request. The merchant control panel offers a broader view.[^8] Begin with a platform discovery test covering apps, scripts, channels, and billing provenance. Treat cross-platform support as separate adapters with separate acceptance criteria.

Recommended order: Shopify pilot first, WooCommerce second if agency demand supports it, BigCommerce after a successful data-access prototype. This sequence is a judgment about focus and the existing product assets, not a claim that Shopify is technically the easiest platform in every respect.

## Savings calculator and recommendation model

The calculator should distinguish **potential savings, approved savings, realized cash savings, and first-year net benefit**. Billing cadence, currency, taxes, usage fees, committed annual terms, refunds, shared agency licenses, and migration labor should be explicit. Annualizing a 30-day bill requires a stated convention; treating every charge as a calendar-month subscription introduces avoidable error.

The legacy V9 calculator is a scenario model: tool count × average price × a user-selected waste percentage, followed by an assumed 75% recovery rate and subtraction of $444 annual Scout cost. Its default inputs produce $2,436 annual net savings and about 1.9 months of displayed payback. That payback divides a full year’s Scout fees by assumed monthly gross recovery; it does not measure a merchant’s migration payback or actual unused spend. Retain the interactive format, expose the assumptions, and separate it from a verified audit.[^42]

Recommended economic model, using consistently normalized monthly amounts:

- Recurring monthly benefit = avoidable current software cost − replacement subscriptions − incremental hosting/operations − Scout’s allocated recurring fee.
- Annualized steady-state benefit = 12 × recurring monthly benefit. This assumes the replacement is fully operating and the old charge is avoidable immediately.
- Actual first-year net cash benefit = sum of the first 12 months’ avoided charges minus each month’s replacement/hosting/Scout costs, implementation payments, transition overlap, and other switching costs. Start avoided charges at the earliest contractually avoidable billing date.
- Payback occurs when cumulative net cash benefit first becomes nonnegative after the initial outlay. With immediate cancellation and constant monthly benefit, the shortcut is one-time switching costs ÷ positive recurring monthly benefit; otherwise use the monthly schedule.

Avoid subtracting a shared replacement or Scout portfolio fee separately for every recommendation. Compute the combined portfolio scenario after deduplication. Sunk annual payments are not immediate recoverable cash; show the earliest cancellation/renewal effect separately. Conversion gains should remain a separate scenario until supported by a suitable experiment.

**Illustrative calculation, not observed customer savings:** assume immediate cancellation, a full 12 months of constant benefit, and no transition overlap. An avoidable $120 monthly charge replaced with $30 software, $15 hosting/operations, and $17 allocated Scout cost yields $58 monthly recurring benefit. With $300 setup, first-year net benefit is $396 and payback is about 5.2 months. At $900 setup, first-year net benefit becomes −$204 even though recurring spend falls. This is why “free code” cannot be equated with a free replacement.

Each recommended row should include: store; business problem; current tool and essential features; evidence and date; proposed action; candidate alternative; platform compatibility; verified/estimated cost; setup and ongoing effort; feature loss; dependencies; risk; owner/approver; rollback; and validation status. Default to the three most useful actions, with a searchable evidence table underneath.

Use evidence gates before ranking: a recommendation must fit the platform and required capabilities, have an acceptable license and operating model, and identify missing data. A weighted score can help order qualified candidates, but a high popularity score should never cancel out an incompatible integration or an unresolved license question. Label confidence as evidence completeness, not a fabricated probability of business success.

## GitHub opportunity engine

Keep two distinct categories: **adopt for a storefront** and **build a software business**. The current cockpit mixes merchant-relevant tooling with commercial wrappers, abandoned projects, acquisition ideas, and developer infrastructure. A poorly maintained project might be an interesting business opportunity while being a poor recommendation for a merchant’s live checkout.

Begin with a curated catalogue of approximately 30-50 commerce-relevant candidates across a few categories, not a promise to search the entire open-source universe. This is a proposed scope for a pilot. Attach a canonical repository ID, source URL, release/commit reference, last verification date, license evidence, maintainer activity, security notices, installation path, platform integration status, data-migration requirements, and total operating-cost assumptions.

Use GitHub’s documented APIs with caching, bounded queues, incremental refresh, and explicit source failures. GitHub search returns at most 1,000 results for a query and has separate rate limits; do not claim exhaustive discovery from a broad query.[^11] Track actual changes in releases, maintenance, pricing, integrations, and advisories. Stars and mentions are discovery signals, not direct evidence of commercial demand or safety.

Public code visibility does not automatically grant reuse rights. A repository without a license has materially different permissions from an MIT-licensed project. Store license evidence at the evaluated revision, and distinguish permissive, copyleft, source-available, mixed, and unknown cases.[^10]

| Illustrative candidate | Relevant use and verified source fact | Required evaluation before recommendation |
|---|---|---|
| Umami | Analytics platform with self-hosted/cloud deployment; repository identifies MIT licensing.[^14] | Validate required ecommerce events, attribution, consent handling, checkout visibility, hosting and maintenance. Not automatic feature parity with a merchant’s current analytics stack. |
| listmonk | Self-hosted newsletter/mailing-list manager using PostgreSQL; AGPL-3.0.[^15] | Verify SMTP cost, deliverability work, contact/consent migration, segmentation, automations and store integration. Do not call it a complete $0 replacement for every email platform. |
| Typesense | Search engine; repository documents search integrations including a WooCommerce community integration.[^16] | Validate catalogue sync, relevance, merchandising, storefront integration, availability and operational ownership. A search engine is not a drop-in replacement for every search app. |
| n8n | Public source with Sustainable Use and separate enterprise-license boundaries.[^17] | Treat internal automation and resale/embedded service scenarios separately. Check the relevant license and deployment model before an agency builds a client-facing offering. |

These are examples of how the catalogue should reason, not endorsed installations for an unidentified store. The primary conclusion is that useful recommendations require an integration and operating model. For novices, prioritize native features and supported commercial options when they produce the best total result; expose self-hosted options when someone can own them.

## Live product walkthrough

The live experience has a consistent dark visual system and a distinctive yellow primary action. The Shopify-specific page is much closer to the intended merchant problem than the general homepage. The cockpit’s filtering, action queue, and transparent seed label are useful patterns to retain. The principal issues are evidence, relevance, and the path from recommendation to action.

| Step | Inspected state | Health and actionable finding |
|---|---|---|
| 1 | V9 homepage | Weak fit. Broad intelligence positioning and developer examples obscure storefront savings. Review counts, testimonials, media logos, early-discovery claims, and scarce seats need independently verifiable support. |
| 2 | Free query | Critical trust issue. A Shopify product-review query returns CRM/newsletter/survey examples; code confirms predefined keyword buckets. Label as sample or connect a real, adequately scoped engine. |
| 3 | Perplexity command centre | Useful prototype. Navigation and action queues provide structure, but this is explicitly a seeded scenario, not observed commercial opportunities. |
| 4 | Shopify entry page | Better fit. It names the merchant problem and offers a sample. Explain public-scan limits prominently and avoid presuming that software is the store’s primary problem. |
| 5 | Sample report | Incomplete decision support. The example shows $164 potential waste and action categories but lacks line-item billing evidence, named replacement comparisons, implementation cost, and an auditable calculation. |
| 6 | Opportunity explorer | Useful filtering pattern. Existing pools emphasize broad developer categories and business-creation ideas; add commerce capability, platform, skill, total cost, and compatibility filters. |
| 7 | Shopify search in cockpit | Poor relevance. Search yields zero matches and says to loosen filters. Offer a supported-category explanation or a research-request path rather than imply the merchant asked incorrectly. |
| 8 | Intake form | Excess friction before value. It asks for email and ad spend but does not capture actual app charges. Ask for storefront/platform and primary concern first, then request the evidence needed for the chosen audit. |

The sample and intake pages also expose internal acquisition language, such as references to ad traffic and lead capture. Replace it with merchant-facing expectations: what will be examined, what evidence is needed, how long it takes, and what the customer receives. Standardize refund terms: the homepage’s Operator card shows seven days while its FAQ describes fourteen days for both plans.[^1]

The visual treatment uses substantial small, low-emphasis text, uppercase labels, and dense dark cards. These create readability risks visible in the captures; measured contrast, zoom/reflow, focus behavior, and screen-reader semantics still need testing. The operator form has visible labels, a useful starting point. The free-query filters appear as text controls in the accessibility snapshot, so keyboard and semantic behavior deserve explicit verification.

![Step 1: Homepage](screenshots/01-homepage.png)

![Step 2: Free query result](screenshots/02-free-query.png)

![Step 3: Seeded cockpit command centre](screenshots/03-cockpit.png)

![Step 4: Shopify audit entry](screenshots/04-shopify-entry.png)

![Step 5: Sample savings report](screenshots/05-sample-report.png)

![Step 6: Opportunity explorer](screenshots/06-opportunity-explorer.png)

![Step 7: Shopify search with zero results and visible seed label](screenshots/07-shopify-no-results.png)

![Step 8: Intake form, upper portion](screenshots/08-intake.png)

## Business model and validation plan

The V9 plans advertise $17 for 10 storefront analyses and $37 for 30 per month.[^1] At full use, that is $1.70 and $1.23 revenue per analysis. If review takes 15 minutes per scan, the gross revenue equivalent is $6.80/hour and $4.93/hour before acquisition, support, software, payment fees, and refunds. The calculation is a full-utilization scenario, not a forecast of actual utilization.

Those prices may be viable for bounded automated scans with low support demand. They are poorly matched to substantial manual verification and migration advice. Also, a successful one-time cleanup can remove the customer’s reason to stay subscribed. Recurring pricing needs recurring value: price changes, renewals, new installations, broken integrations, maintenance risk, and vetted new opportunities.

Test three offers rather than locking a permanent founding rate:

| Proposed experiment | Scope | Price hypothesis to test |
|---|---|---|
| Public scan | Visible signals, coverage limits, optional saved report | Free, with strict usage limits |
| Verified one-store review | Merchant evidence, 3-5 actions, clear turnaround and follow-up | $99-249 one time |
| Agency pilot | Up to 10 stores, shared evidence, change queue, client-ready exports | $149-299/month; onboarding/manual work priced separately |

These are experiment ranges, not market-validated prices or revenue projections. Compare them with completion cost, buyer objections, and actual renewal behavior. An agency may prefer an onboarding audit fee plus ongoing monitoring rather than pay for a quota of interchangeable scans.

Recruit approximately five agencies and ten individual merchants for a consented discovery and pilot programme. Ask about recent app-purchase/cancellation decisions, current audit methods, implementation ownership, and the last costly mistake. Observe them completing an audit with their current tools before demonstrating Scout. Do not lead with the expectation that their stack must contain waste.

Before collecting invoices or charge records, establish an approved evidence intake: request only necessary fields, provide redaction instructions, use controlled transfer/storage with tenant-specific access, and define consent, revocation, retention and deletion. Keep confidential records out of prototype/demo telemetry. Until that path is verified, use synthetic records or merchant-confirmed totals for discovery; begin invoice reconciliation only after this gate passes.

Suggested pilot gates, set in advance:

- At least 80% of the top three recommendations per store are judged relevant and feasible by the merchant or agency, measured against a written rubric.
- Every monetary recommendation has verified charge evidence or is visibly labeled as an estimate; no unknown cost is silently treated as zero.
- At least half of participating stores approve one action, and at least five actions reach verified completion with a documented outcome.
- At least three of five agencies request a second monitoring cycle at a stated price. This is a directional pilot signal, not a statistically reliable market estimate.
- Record analyst minutes, crawl/API expense, support time, refunds, false positives, and time-to-action before deciding automated-plan pricing.

Acquisition should begin through agency design partnerships, transparent example reports, and high-intent content about app overlap, renewal audits, and migration choices. Avoid scaling paid traffic until the offer matches delivered capability. Any affiliate revenue should be disclosed and excluded from ranking logic so recommendations remain credible.

## Delivery sequence

| Period | Priority | Exit condition |
|---|---|---|
| Days 1-14 | Reconcile deployed claims with the current rebuild; validate platform access; specify pilot offer and secure evidence intake | Demonstration data unmistakable, source coverage accurate, billing/fulfilment path understood, redaction/access/retention controls verified before private records are collected |
| Days 15-30 | Deliver manual evidence-backed Shopify audits; curate initial alternative catalogue | Actual invoice reconciliation, merchant-approved actions, costs/time measured, failure states explicit |
| Days 31-60 | Productize repeatable work and agency change monitoring; consolidate tested code | Tenant boundaries, reliable scan jobs, history, approvals, verified plan/usage enforcement, auditable recommendations |
| Days 61-90 | Evaluate retention and outcomes; add WooCommerce only if justified; prototype BigCommerce access | A paying repeat workflow, acceptable delivery margin, measured data quality, platform-specific acceptance gates |

Treat this as a proposed sequence rather than a staffing or completion-time guarantee. Reuse the current V2 implementation wherever its tests and behavior satisfy the requirements. The first technical milestone is a clear inventory of deployed versus undeployed capability, not another visual rewrite.

## Evidence and limitations

Assessment observations were gathered September 9, 2026 in America/Chicago. They include current source code, fresh desktop browser captures of the V9 site and Perplexity cockpit, official platform documentation, and public competitor listings/pricing. The detailed technical and competitor appendices preserve additional evidence and scope limits.

No merchant account, private invoice, customer analytics, paid entitlement, or production payment/lead submission was exercised. The live URL scanner was reviewed in code; its full submitted-lead flow was not completed. Competitor products were researched from published material rather than installed or benchmarked. No customer demand, revenue uplift, savings rate, market size, or willingness to pay is claimed as established.

The visual audit covers the captured desktop states. It does not establish mobile usability, keyboard completion, contrast ratios, screen-reader conformance, or complete accessibility compliance. These require targeted follow-up tests. Current prices and API access can change, and the recommendation to validate them with a platform prototype is a substantive feasibility gate.

## Sources

Sources were accessed for this assessment on September 9, 2026, local time. Undated product and pricing pages are current-page observations; they are not historical price guarantees. Repository sources are maintainer statements and source code, not independent certifications. Citations to the Scout site document what it displays, not the truth of its marketing claims.

[^1]: GitHub Scout. [V9 public website](https://githubscout-ecommerce-v9-20260609.netlify.app/), [Shopify audit entry](https://githubscout-ecommerce-v9-20260609.netlify.app/operator-shopify-savings), and [sample report](https://githubscout-ecommerce-v9-20260609.netlify.app/sample-shopify-url-analysis). Fresh browser observations; captures in the walkthrough.
[^2]: GitHubScout. [V2.1 Opportunity Intelligence Cockpit](https://www.perplexity.ai/computer/a/e1cb2eaa-c6cd-465f-8724-ab3a08790421). Embedded app labels scenario data generated May 11, 2026; fresh browser observations.
[^3]: peter72289-lab. [GitHub Scout repository at remote head d159bcd](https://github.com/peter72289-lab/github-scout-project/tree/d159bcd28c7971d214989978b275a9dd2ee6ec8f), August 21, 2026. Local legacy checkout: 6232a6ee, July 3, 2026. Detailed code evidence appears in the accompanying technical appendix.
[^4]: Shopify Help Center. [Managing apps](https://help.shopify.com/en/manual/apps/managing-apps).
[^5]: Shopify Help Center. [App charges on your Shopify bills](https://help.shopify.com/en/manual/your-account/manage-billing/billing-charges/types-of-charges/third-party-charges/app-charges).
[^6]: Shopify Developer Documentation. [currentAppInstallation](https://shopify.dev/docs/api/admin-graphql/latest/queries/currentAppInstallation), GraphQL Admin reference.
[^7]: Shopify Developer Community. [How to fetch all active apps installed in a store](https://community.shopify.dev/t/how-to-fetch-all-active-apps-installed-in-a-store-including-theme-embedded-apps/24456), Shopify staff replies October-December 2025; [appInstallations reference](https://shopify.dev/docs/api/admin-graphql/latest/queries/appInstallations). Access remains a validation requirement.
[^8]: BigCommerce Developer Documentation. [Scripts](https://docs.bigcommerce.com/developer/docs/admin/widgets-and-scripts/scripts), API account ownership and visibility limits.
[^9]: WordPress Developer Resources. [Plugins REST API](https://developer.wordpress.org/rest-api/reference/plugins/), updated January 16, 2024; [WP-CLI plugin list](https://developer.wordpress.org/cli/commands/plugin/list/).
[^10]: GitHub Docs. [Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).
[^11]: GitHub Docs. [REST API endpoints for search](https://docs.github.com/en/rest/search/search), result caps and rate limits.
[^12]: Chrome for Developers. [Reduce the impact of third-party code](https://developer.chrome.com/docs/lighthouse/performance/third-party-summary), Lighthouse performance guidance.
[^13]: Shopify Developer Documentation. [About billing for your app](https://shopify.dev/docs/apps/launch/billing), distribution and billing requirements.
[^14]: Umami Software. [Umami repository](https://github.com/umami-software/umami) and [MIT license](https://github.com/umami-software/umami/blob/master/LICENSE).
[^15]: Kailash Nadh and contributors. [listmonk repository](https://github.com/knadh/listmonk), application requirements and AGPL-3.0 license.
[^16]: Typesense. [Typesense repository](https://github.com/typesense/typesense), search functionality and framework/community integrations.
[^17]: n8n. [Repository license](https://github.com/n8n-io/n8n/blob/master/LICENSE.md), Sustainable Use License and enterprise-file boundaries.
[^18]: Shopify App Store / joycraft. [CostPilot Pro](https://apps.shopify.com/spendlens), listing, pricing, launch date, and reviews.
[^19]: Chrome Web Store. [Shopify App Cost Auditor](https://chromewebstore.google.com/detail/shopify-app-cost-auditor/fpihciibgdefggkdjmdiodgmkomogbda), version 1.0.0, updated May 13, 2026.
[^20]: Shopify. [Sidekick Help Center](https://help.shopify.com/en/manual/ai-powered-tools/sidekick) and [included feature listing](https://apps.shopify.com/built-in-features/sidekick).
[^21]: Shopify App Store / Vitals. [Vitals: Reviews, Bundles & 40+](https://apps.shopify.com/vitals), pricing and usage conditions.
[^22]: Koala Apps. [Pricing](https://koala-apps.io/pricing/) and [Inspector capabilities](https://koala-apps.io/learn-more/).
[^23]: Store Leads. [Ecommerce data platform and pricing](https://storeleads.app/).
[^24]: BuiltWith. [Plans](https://builtwith.com/plans) and [product pricing](https://builtwith.com/all-products).
[^25]: Wappalyzer. [Pricing](https://www.wappalyzer.com/pricing/) and [technology lookup API](https://www.wappalyzer.com/docs/api/v2/lookup/).
[^26]: AlternativeTo. [About AlternativeTo](https://alternativeto.net/about/).
[^27]: awesome-selfhosted contributors. [awesome-selfhosted repository](https://github.com/awesome-selfhosted/awesome-selfhosted).
[^28]: SolvoHQ. [Awesome Self-Hostable SaaS Alternatives](https://github.com/SolvoHQ/awesome-self-host-saas-alternatives). Distinct from awesome-selfhosted; early project, not independently validated.
[^29]: ManageWP. [Features](https://managewp.com/features/) and [pricing](https://managewp.com/pricing/).
[^30]: MainWP. [Product](https://mainwp.com/) and [pricing](https://mainwp.com/signup/).
[^31]: WP Umbrella. [Pre-sales FAQ and pricing](https://support.wp-umbrella.com/en/articles/61-top-pre-sales-faqs-about-wp-umbrella) and [security add-on](https://support.wp-umbrella.com/en/articles/94-what-s-included-in-the-wp-umbrella-security-add-on-and-what-s-not).
[^32]: TrueProfit. [Pricing](https://trueprofit.io/pricing), plan/order caps and overages.
[^33]: Lifetimely by AMP. [Pricing](https://www.lifetimely.io/pricing) and [Shopify listing](https://apps.shopify.com/lifetimely-lifetime-value-and-profit-analytics).
[^34]: Shopify App Store / BeProfit. [BeProfit profit analytics](https://apps.shopify.com/beprofit-profit-tracker).
[^35]: Cledara. [Product](https://www.cledara.com/) and [pricing](https://www.cledara.com/pricing), eligibility-based offer and GBP fallback.
[^36]: GitHub Scout. [STATUS.md at d159bcd](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/STATUS.md), August 21, 2026. Release blockers and reported test status.
[^37]: GitHub Scout. [V2 source adapters](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/lib/adapters.js#L151), source catalogue and collection logic.
[^38]: GitHub Scout. [V2 aggregation logic](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/lib/aggregate.js#L136), evidence gates and benchmark savings.
[^39]: GitHub Scout. [V2 scan handler](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/operator-url-scan.js#L38) and [database schema](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/supabase/schema.sql), identity, quota and scan persistence.
[^40]: GitHub Scout. [Stripe webhook](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/stripe-webhook.js#L70) and [authentication](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/lib/auth.js), signed payment events and sessions.
[^41]: GitHub Scout. [V2 network guard](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/lib/guard.js), connection-time validation.
[^42]: GitHub Scout. [Legacy V9 calculator source](https://github.com/peter72289-lab/github-scout-project/blob/6232a6ee551c52a127afe66736ac6339a9bfb83a/netlify-v9-githubscout-ecommerce/index.html#L1756), inputs, 75% recovery assumption, annual fee, and payback formula.
