const state = { data: null };
const $ = (selector) => document.querySelector(selector);
const fmt = new Intl.NumberFormat("en-US");

function n(value) {
  if (value === null || value === undefined || value === "") return "n/a";
  return typeof value === "number" ? fmt.format(value) : value;
}

function compact(value) {
  if (typeof value !== "number") return n(value);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function date(value) {
  if (!value) return "n/a";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function list(items = []) {
  return items.length ? items.map((item) => `<li>${item}</li>`).join("") : "<li>Not captured yet.</li>";
}

function chips(items = []) {
  return items.length ? items.map((item) => `<span>${item}</span>`).join("") : "<span>Not captured</span>";
}

function pmfScore(item) {
  const scout = item.score ?? 0;
  const pain = item.maintenancePainScore ?? 0;
  const speed = /day/i.test(item.speedToMvp ?? "") ? 95 : /week/i.test(item.speedToMvp ?? "") ? 84 : 64;
  const buyer = item.buyerPersona ? 82 : 40;
  const validation = item.validationTest ? 82 : 45;
  const traction = Math.min(((item.stars ?? 0) / 100000) * 20 + ((item.forks ?? 0) / 10000) * 12 + ((item.contributors ?? 0) / 1000) * 16, 100);
  const cask = caskVerified(item) ? 100 : 0;
  return Math.round(scout * 0.2 + pain * 0.17 + speed * 0.17 + buyer * 0.13 + validation * 0.13 + traction * 0.12 + cask * 0.08);
}

function tractionScore(item) {
  const stars = Math.min((item.stars ?? 0) / 100000, 1) * 35;
  const forks = Math.min((item.forks ?? 0) / 12000, 1) * 20;
  const contributors = Math.min((item.contributors ?? 0) / 1000, 1) * 20;
  const activity = item.pushedAt ? 15 : 0;
  const prLoad = Math.min((item.openPRs ?? 0) / 250, 1) * 10;
  return Math.round(stars + forks + contributors + activity + prLoad);
}

function caskVerified(item) {
  return item.homebrewCask?.verified && item.homebrewCask?.freeOpenSource;
}

function caskText(item) {
  if (!caskVerified(item)) return "No qualifying free open-source Homebrew Cask match.";
  return `${item.homebrewCask.token} is listed in the official Homebrew Cask catalog and passed the open-source/free screen.`;
}

function pricingOptions(item) {
  const model = item.monetizationModel ?? item.pricingHypothesis ?? "Pricing not captured.";
  return [
    { name: "Entry", price: model.match(/\$\d+[^\s,]*/)?.[0] ?? "$49-$199", fit: "Fast validation, template, plugin, or self-serve buyer.", note: item.firstOffer },
    { name: "Managed", price: "$499-$1.5k/mo", fit: "Done-for-you setup, agency workflow, support, reporting, or hosted ops.", note: item.monetization },
    { name: "Enterprise", price: "$2k+ setup", fit: "Teams needing auth, compliance, reliability, migration, or custom integration.", note: item.pricingHypothesis },
  ];
}

function hypotheses(item) {
  return [
    `If ${item.buyerPersona}, then the first paid wedge is: ${item.productWedge}`,
    `If buyers respond to "${item.firstOffer}", then package it as: ${item.monetizationModel}`,
    `If the kill risk shows up early (${item.riskToKill}), then drop or reposition before building more.`,
  ];
}

function experiments(item) {
  return [
    item.validationTest,
    `Run 20 targeted outbound messages using: "${item.outreachDraft}"`,
    `Publish landing page with headline: "${item.landingPageCopy?.headline ?? item.firstOffer}"`,
  ];
}

function redTeam(item) {
  const risks = [item.riskToKill, item.risk].filter(Boolean);
  if ((item.openPRs ?? 0) > 100) risks.push(`High open PR load (${n(item.openPRs)}) may mean maintainer strain or noisy backlog.`);
  if ((item.openIssues ?? 0) > 100) risks.push(`Large issue count (${n(item.openIssues)}) may hide support burden.`);
  if (item.archived) risks.push("Archived repo increases dependency, ownership, and trust risk.");
  return risks;
}

function targetMarkets(item) {
  const markets = [item.buyerPersona];
  if (item.category?.includes("Automation")) markets.push("automation consultants", "marketing operations teams", "agency operators");
  if (item.category?.includes("MCP")) markets.push("AI engineering teams", "agent platform builders", "developer tool startups");
  if (item.category?.includes("Obsidian")) markets.push("PKM power users", "research-heavy founders", "solo operators");
  if (item.category?.includes("Marketing")) markets.push("growth agencies", "CRM operators", "open-source marketing teams");
  return [...new Set(markets.filter(Boolean))];
}

function renderStatus() {
  const items = state.data.opportunities;
  const sorted = [...items].sort((a, b) => pmfScore(b) - pmfScore(a));
  $("#heroSummary").textContent = state.data.summary?.topSignal ?? "Opportunity dossiers are loaded.";
  $("#lastRefresh").textContent = date(state.data.generatedAt);
  $("#totalOpps").textContent = n(items.length);
  $("#doToday").textContent = n(items.filter((item) => item.weeklyLane === "Do today").length);
  $("#totalPrs").textContent = n(items.reduce((sum, item) => sum + (item.openPRs ?? 0), 0));
  $("#bestPmf").textContent = n(pmfScore(sorted[0]));
  $("#caskVerified").textContent = n(items.filter(caskVerified).length);
}

function renderPriorityStack() {
  const sorted = [...state.data.opportunities].sort((a, b) => pmfScore(b) - pmfScore(a));
  $("#priorityStack").innerHTML = sorted
    .map(
      (item, index) => `
        <article class="priorityItem">
          <div class="rank">${index + 1}</div>
          <div>
            <h3>${item.name}</h3>
            <p><b>${item.verdict}</b> · ${item.productWedge}</p>
            <p>${item.validationTest}</p>
            <p>${caskVerified(item) ? `Brew Cask verified: ${item.homebrewCask.token}` : "No Brew Cask verification."}</p>
          </div>
          <div class="pmfBadge" style="--pmf:${pmfScore(item)}">${pmfScore(item)}</div>
        </article>
      `
    )
    .join("");
}

function renderPortfolioStrategy() {
  const items = state.data.opportunities;
  const tiles = [
    ["Fastest validation", items.filter((item) => /day/i.test(item.speedToMvp ?? "")).length, "Prioritize these for landing pages, outbound, and demos."],
    ["Highest pain", Math.max(...items.map((item) => item.maintenancePainScore ?? 0)), "Pain is opportunity only if buyer and budget are clear."],
    ["Template/service candidates", items.filter((item) => /template|service|support|managed/i.test(`${item.verdict} ${item.monetizationModel}`)).length, "Best near-term revenue paths."],
    ["Cask-backed OSS", items.filter(caskVerified).length, "Official Homebrew Cask distribution is a curated adoption signal after free/open-source screening."],
    ["Watchlist", items.filter((item) => item.weeklyLane === "Watch").length, "Useful, but not worth stealing focus yet."],
  ];
  $("#portfolioStrategy").innerHTML = tiles
    .map(([label, value, note]) => `<div class="strategyTile"><span class="label">${label}</span><strong>${value}</strong><p>${note}</p></div>`)
    .join("");
}

function renderActionQueue() {
  const lanes = ["Do today", "This week", "Watch", "Drop"];
  $("#actionQueue").innerHTML = lanes
    .map((lane) => {
      const items = state.data.opportunities.filter((item) => (item.weeklyLane ?? "Watch") === lane);
      return `
        <div class="actionLane">
          <h3>${lane}<span>${items.length}</span></h3>
          ${items
            .sort((a, b) => pmfScore(b) - pmfScore(a))
            .map((item) => `<a class="actionCard" href="#${id(item)}"><b>${item.name}</b><small>${item.next3Actions?.[0] ?? item.validationTest}</small></a>`)
            .join("") || "<p>No items.</p>"}
        </div>
      `;
    })
    .join("");
}

function id(item) {
  return item.name.replace(/[^a-z0-9]/gi, "-");
}

function renderDossiers() {
  $("#dossiers").innerHTML = [...state.data.opportunities]
    .sort((a, b) => pmfScore(b) - pmfScore(a))
    .map(
      (item) => `
        <article class="dossier" id="${id(item)}">
          <header class="dossierHeader">
            <div>
              <h2>${item.name}</h2>
              <p>${item.thesis}</p>
            </div>
            <div class="verdict">${item.verdict}</div>
          </header>
          <div class="dossierBody">
            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Executive Read</span><h3>Decision, score, and immediate product path</h3></div></div>
              <div class="grid4">
                <div class="mini"><span>PMF score</span><strong>${pmfScore(item)}</strong></div>
                <div class="mini"><span>Weekly lane</span><strong>${item.weeklyLane}</strong></div>
                <div class="mini"><span>Speed to MVP</span><strong>${item.speedToMvp}</strong></div>
                <div class="mini"><span>Moat</span><strong>${item.moat}</strong></div>
                <div class="mini"><span>Build/buy/partner</span><strong>${item.buildBuyPartner}</strong></div>
                <div class="mini"><span>Maintenance pain</span><strong>${n(item.maintenancePainScore)}</strong></div>
                <div class="mini"><span>Scout score</span><strong>${n(item.score)}</strong></div>
                <div class="mini"><span>Traction score</span><strong>${tractionScore(item)}</strong></div>
                <div class="mini"><span>Brew Cask</span><strong>${caskVerified(item) ? `+${item.caskBoost ?? 0}` : "No"}</strong></div>
              </div>
              <div class="scoreBand">
                <div class="scoreRing" style="--score:${pmfScore(item)}"><strong>${pmfScore(item)}</strong></div>
                <div class="barSet">
                  <label>Scout score <i><b style="width:${item.score}%"></b></i><span>${item.score}</span></label>
                  <label>Maintenance pain <i><b style="width:${item.maintenancePainScore ?? 0}%"></b></i><span>${item.maintenancePainScore ?? 0}</span></label>
                  <label>Traction <i><b style="width:${tractionScore(item)}%"></b></i><span>${tractionScore(item)}</span></label>
                  <label>Cask verification <i><b style="width:${caskVerified(item) ? 100 : 0}%"></b></i><span>${caskVerified(item) ? "Yes" : "No"}</span></label>
                </div>
              </div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Brew Cask Verification</span><h3>Curated distribution signal with free/open-source guardrails</h3></div></div>
              <div class="grid2">
                <div class="field"><span>Status</span><p>${caskText(item)}</p></div>
                <div class="field"><span>Promotion rule</span><p>Boost only when an official Homebrew Cask maps to this GitHub repo, the GitHub license is open source, and Cask metadata has no paid/trial markers.</p></div>
                <div class="field"><span>Cask description</span><p>${caskVerified(item) ? item.homebrewCask.desc : "Not verified."}</p></div>
                <div class="field"><span>Cask source</span><p>${caskVerified(item) ? item.homebrewCask.caskUrl : "No qualifying Cask source."}</p></div>
              </div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Market Dossier</span><h3>Target markets, buyer, pain, and workflow</h3></div></div>
              <div class="grid2">
                <div class="field"><span>Buyer persona</span><p>${item.buyerPersona}</p></div>
                <div class="field"><span>Pain statement</span><p>${item.painStatement}</p></div>
                <div class="field"><span>Target markets</span><div class="chipRow">${chips(targetMarkets(item))}</div></div>
                <div class="field"><span>Commercial intent signals</span><div class="chipRow">${chips(item.commercialIntentSignals)}</div></div>
              </div>
              <div class="grid2">
                <div class="field"><span>Before workflow</span><p>${item.workflowBeforeAfter?.before ?? "Not captured."}</p></div>
                <div class="field"><span>After workflow</span><p>${item.workflowBeforeAfter?.after ?? "Not captured."}</p></div>
              </div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Product Strategy</span><h3>Wedge, offer, hypotheses, validation</h3></div></div>
              <div class="grid2">
                <div class="field"><span>Product wedge</span><p>${item.productWedge}</p></div>
                <div class="field"><span>First offer</span><p>${item.firstOffer}</p></div>
                <div class="field"><span>Validation test</span><p>${item.validationTest}</p></div>
                <div class="field"><span>Monetization model</span><p>${item.monetizationModel}</p></div>
              </div>
              <div class="grid3">
                ${hypotheses(item).map((value) => `<div class="hypothesis"><span class="label">Hypothesis</span><p>${value}</p></div>`).join("")}
              </div>
              <div class="grid3">
                ${experiments(item).map((value) => `<div class="experiment"><span class="label">Validation experiment</span><p>${value}</p></div>`).join("")}
              </div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Pricing Dossier</span><h3>Options to test, from entry to enterprise</h3></div></div>
              <div class="priceGrid">
                ${pricingOptions(item)
                  .map((price) => `<div class="priceCard"><span>${price.name}</span><h3>${price.price}</h3><p>${price.fit}</p><p>${price.note}</p></div>`)
                  .join("")}
              </div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Competitive Dossier</span><h3>Competitors, alternatives, why this can win</h3></div></div>
              <div class="grid3">
                <div class="field"><span>Direct competitors</span><ul class="clean">${list(item.competitors?.direct)}</ul></div>
                <div class="field"><span>Alternatives / do nothing</span><ul class="clean">${list(item.competitors?.alternatives)}</ul></div>
                <div class="field"><span>Why this can win</span><p>${item.competitors?.whyWin ?? "Not captured."}</p></div>
              </div>
              <div class="prosCons">
                <div class="pros"><span class="label">Pros</span><ul class="clean">${list(item.pros)}</ul></div>
                <div class="cons"><span class="label">Cons</span><ul class="clean">${list(item.cons)}</ul></div>
              </div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Red Team Analysis</span><h3>What could kill this idea or make it painful</h3></div></div>
              <div class="riskGrid">
                ${redTeam(item).map((risk) => `<div class="riskCard"><span>Risk</span><p>${risk}</p></div>`).join("")}
              </div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Go-To-Market Dossier</span><h3>Channels, keywords, communities, and copy</h3></div></div>
              <div class="grid3">
                <div class="field"><span>Distribution channels</span><div class="chipRow">${chips(item.distributionChannels)}</div></div>
                <div class="field"><span>Keywords</span><div class="chipRow">${chips(item.keywords)}</div></div>
                <div class="field"><span>Community hotspots</span><div class="chipRow">${chips(item.communityHotspots)}</div></div>
              </div>
              <div class="grid2">
                <div class="copyBox"><span>Landing page copy</span><h3>${item.landingPageCopy?.headline ?? item.firstOffer}</h3><p>${item.landingPageCopy?.subheadline ?? item.productWedge}</p><p><b>CTA:</b> ${item.landingPageCopy?.cta ?? "Join beta"}</p></div>
                <div class="copyBox"><span>Cold outreach draft</span><p>${item.outreachDraft}</p></div>
              </div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Evidence Dossier</span><h3>GitHubScout signal, live repo evidence, and operating context</h3></div></div>
              <div class="grid2">
                <div class="evidenceBox"><span class="label">Scout signal</span><p>${item.signal}</p></div>
                <div class="evidenceBox"><span class="label">Trend context</span><p>${item.trendContext}</p></div>
                <div class="evidenceBox"><span class="label">Review posture</span><p>${item.reviewPosture}</p></div>
                <div class="evidenceBox"><span class="label">Repository description</span><p>${item.description ?? "No description."}</p></div>
              </div>
              <div class="grid2">
                <div class="field"><span>Evidence points</span><ul class="clean">${list(item.evidence)}</ul></div>
                <div class="field"><span>Issue / PR signals</span><ul class="clean">${list(item.issueSignals)}</ul></div>
              </div>
              <div class="grid4">
                <div class="mini"><span>Stars</span><strong>${n(item.stars)}</strong></div>
                <div class="mini"><span>Forks</span><strong>${n(item.forks)}</strong></div>
                <div class="mini"><span>Contributors</span><strong>${n(item.contributors)}</strong></div>
                <div class="mini"><span>Open PRs</span><strong>${n(item.openPRs)}</strong></div>
                <div class="mini"><span>Open issues</span><strong>${n(item.openIssues)}</strong></div>
                <div class="mini"><span>Language</span><strong>${n(item.language)}</strong></div>
                <div class="mini"><span>License</span><strong>${n(item.license)}</strong></div>
                <div class="mini"><span>Last push</span><strong>${date(item.pushedAt)}</strong></div>
              </div>
              <div class="field"><span>Topics</span><div class="chipRow">${chips(item.topics)}</div></div>
            </section>

            <section class="section">
              <div class="sectionTitle"><i></i><div><span>Execution Dossier</span><h3>Next actions, decision, and links</h3></div></div>
              <div class="grid2">
                <div class="field"><span>Next 3 actions</span><ol class="clean">${list(item.next3Actions)}</ol></div>
                <div class="field"><span>Decision</span><p>${item.decision ?? item.nextAction}</p><p><b>Kill risk:</b> ${item.riskToKill}</p></div>
              </div>
              <div class="links">
                <a href="${item.url}" target="_blank" rel="noreferrer">GitHub repository</a>
                <a href="${state.data.source}" target="_blank" rel="noreferrer">GitHubScout source</a>
              </div>
            </section>
          </div>
        </article>
      `
    )
    .join("");
}

async function init() {
  if (window.location.protocol === "file:" && window.GITHUBSCOUT_DOSSIER_DATA?.opportunities) {
    state.data = window.GITHUBSCOUT_DOSSIER_DATA;
  } else {
    try {
      const response = await fetch("data/opportunities.json", { cache: "no-store" });
      state.data = await response.json();
    } catch (error) {
      if (window.GITHUBSCOUT_DOSSIER_DATA?.opportunities) {
        state.data = window.GITHUBSCOUT_DOSSIER_DATA;
      } else {
        throw error;
      }
    }
  }
  renderStatus();
  renderPriorityStack();
  renderPortfolioStrategy();
  renderActionQueue();
  renderDossiers();
}

init().catch((error) => {
  document.body.innerHTML = `<main class="page"><section class="panel"><div class="panelTitle"><h2>Dashboard data could not be loaded</h2><p>${error.message}</p></div></section></main>`;
});
