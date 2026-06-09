const state = {
  data: null,
  filter: "all",
};

const fmt = new Intl.NumberFormat("en-US");

const $ = (selector) => document.querySelector(selector);

function listItems(values = []) {
  return values.map((value) => `<li>${value}</li>`).join("");
}

function chips(values = []) {
  return values.map((value) => `<span>${value}</span>`).join("");
}

function text(value, fallback = "Not captured yet.") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function metric(value) {
  if (value === null || value === undefined || value === "") return "n/a";
  return typeof value === "number" ? fmt.format(value) : value;
}

function compactMetric(value) {
  if (typeof value !== "number") return metric(value);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function dateLabel(value) {
  if (!value) return "Pending first refresh";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function shortDate(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function scoreColor(score) {
  if (score >= 88) return "high";
  if (score >= 74) return "medium";
  return "low";
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

function caskLabel(item) {
  if (!caskVerified(item)) return "Not Cask-verified";
  return `Cask: ${item.homebrewCask.token}`;
}

function caskEvidence(item) {
  if (!caskVerified(item)) {
    return "No official free open-source Homebrew Cask match was found for this repo.";
  }
  return `${item.homebrewCask.desc ?? "Official Homebrew Cask listing"} Boosted +${item.caskBoost ?? 0} after open-source/free screening.`;
}

function fallbackPros(item) {
  return item.pros ?? [
    `${compactMetric(item.stars)} stars`,
    `${compactMetric(item.forks)} forks`,
    `${metric(item.language)} codebase`,
  ];
}

function fallbackCons(item) {
  const cons = item.cons ?? [];
  if (cons.length) return cons;
  const generated = [];
  if (item.archived) generated.push("Archived repo");
  if ((item.openPRs ?? 0) > 100) generated.push("High PR backlog");
  if ((item.openIssues ?? 0) > 100) generated.push("Large issue surface");
  return generated.length ? generated : ["Needs deeper diligence"];
}

function filteredOpportunities() {
  const items = state.data?.opportunities ?? [];
  if (state.filter === "all") return items;
  return items.filter((item) => scoreColor(item.score) === state.filter);
}

function renderSummary() {
  const { summary, generatedAt, source } = state.data;
  setText("generatedAt", dateLabel(generatedAt));
  setText("sourceLabel", source.replace("https://github.com/", "github.com/"));
  $("#sourceLink").href = source;

  const topScore = Math.max(...state.data.opportunities.map((item) => item.score));
  const doToday = state.data.opportunities.filter((item) => item.weeklyLane === "Do today").length;
  const fastMvp = state.data.opportunities.filter((item) => /day|week/i.test(item.speedToMvp ?? "")).length;
  const buildMoves = state.data.opportunities.filter((item) =>
    /build|fork|acquire|template|saaS/i.test(`${item.verdict} ${item.buildBuyPartner}`)
  ).length;
  const caskVerifiedCount = state.data.opportunities.filter(caskVerified).length;
  const avgPain = Math.round(
    state.data.opportunities.reduce((total, item) => total + (item.maintenancePainScore ?? 0), 0) /
      Math.max(state.data.opportunities.length, 1)
  );
  const avgScore = Math.round(
    state.data.opportunities.reduce((total, item) => total + item.score, 0) /
      Math.max(state.data.opportunities.length, 1)
  );

  setText("kpiOpportunities", metric(doToday));
  setText("kpiReviews", metric(fastMvp));
  setText("kpiChecks", metric(buildMoves));
  setText("kpiPRs", metric(avgPain));
  setText("kpiTopScore", metric(caskVerifiedCount));
  setText("topSignal", summary.topSignal);

  $("#scoreRing").style.setProperty("--score", avgScore);
  setText("avgScore", avgScore);
}

function renderActionBoard() {
  const lanes = ["Do today", "This week", "Watch", "Drop"];
  $("#actionColumns").innerHTML = lanes
    .map((lane) => {
      const laneItems = state.data.opportunities.filter((item) => (item.weeklyLane ?? "Watch") === lane);
      return `
        <article class="action-column">
          <div class="action-heading">
            <span>${lane}</span>
            <strong>${laneItems.length}</strong>
          </div>
          <div class="action-list">
            ${
              laneItems.length
                ? laneItems
                    .sort((a, b) => b.score - a.score)
                    .map(
                      (item) => `
                        <a class="action-item" href="#${item.name.replace(/[^a-z0-9]/gi, "-")}">
                          <b>${item.name}</b>
                          <span>${item.verdict} · ${item.speedToMvp} · ${caskLabel(item)}</span>
                          <small>${item.productWedge}</small>
                        </a>
                      `
                    )
                    .join("")
                : `<div class="empty small">No items here.</div>`
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMarketGrid() {
  const sorted = [...state.data.opportunities].sort((a, b) => b.score - a.score).slice(0, 6);
  $("#marketGrid").innerHTML = sorted
    .map(
      (item) => `
        <article class="market-tile">
          <div class="market-top">
            <span>${item.verdict}</span>
            <strong>${item.speedToMvp}</strong>
          </div>
          <h3>${item.name}</h3>
          <p>${item.firstOffer}</p>
          <div class="tile-bars">
            <label>Scout score <i><b style="width:${item.score}%"></b></i></label>
            <label>Maintenance pain <i><b style="width:${item.maintenancePainScore ?? 0}%"></b></i></label>
            <label>Traction <i><b style="width:${tractionScore(item)}%"></b></i></label>
            <label>Cask verification <i><b style="width:${caskVerified(item) ? 100 : 0}%"></b></i></label>
          </div>
        </article>
      `
    )
    .join("");
}

function renderBars() {
  const items = [...state.data.opportunities].sort((a, b) => b.score - a.score).slice(0, 7);
  $("#barList").innerHTML = items
    .map(
      (item) => `
        <div class="bar-row">
          <div class="bar-name" title="${item.name}">${item.name}</div>
          <div class="bar-track" aria-label="${item.name} score ${item.score}">
            <div class="bar-fill" style="--width:${item.score}%"></div>
          </div>
          <div class="bar-score">${item.score}</div>
        </div>
      `
    )
    .join("");
}

function renderCategoryLanes() {
  const groups = new Map();
  state.data.opportunities.forEach((item) => {
    const key = item.category ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  $("#categoryLanes").innerHTML = [...groups.entries()]
    .map(([category, items]) => {
      const avg = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
      const stars = items.reduce((sum, item) => sum + (item.stars ?? 0), 0);
      return `
        <article class="lane">
          <div class="lane-top">
            <span>${category}</span>
            <strong>${avg}</strong>
          </div>
          <div class="lane-bar"><i style="width:${avg}%"></i></div>
          <div class="lane-meta">${items.length} opportunities · ${compactMetric(stars)} stars</div>
        </article>
      `;
    })
    .join("");
}

function renderCards() {
  const items = filteredOpportunities();
  $("#opportunityGrid").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="opportunity" id="${item.name.replace(/[^a-z0-9]/gi, "-")}">
              <div class="opportunity-top">
                <div>
                  <div class="repo-name">${item.name}</div>
                  <div class="panel-subtitle">${item.category} · ${item.status} · ${item.buildBuyPartner}</div>
                </div>
                <span class="pill ${String(item.priority).toLowerCase()}">${item.verdict}</span>
              </div>
              <section class="dossier-section">
                <h3>Decision Snapshot</h3>
              <div class="snapshot-grid compact-snapshot">
                <div><span>Weekly lane</span><strong>${item.weeklyLane}</strong></div>
                <div><span>Speed to MVP</span><strong>${item.speedToMvp}</strong></div>
                <div><span>Moat</span><strong>${item.moat}</strong></div>
                <div><span>Pain score</span><strong>${metric(item.maintenancePainScore)}</strong></div>
                <div><span>Verdict</span><strong>${item.verdict}</strong></div>
                <div><span>Build / buy / partner</span><strong>${item.buildBuyPartner}</strong></div>
                <div><span>Scout score</span><strong>${metric(item.score)}</strong></div>
                <div><span>Live traction</span><strong>${tractionScore(item)}</strong></div>
                <div><span>Brew Cask</span><strong>${caskVerified(item) ? `Verified +${item.caskBoost ?? 0}` : "No match"}</strong></div>
              </div>
              </section>
              <h3 class="section-heading">Market And Customer Dossier</h3>
              <section class="business-hero">
                <div>
                  <span>Buyer</span>
                  <p>${item.buyerPersona}</p>
                </div>
                <div>
                  <span>Pain</span>
                  <p>${item.painStatement}</p>
                </div>
              </section>
              <h3 class="section-heading">Live GitHub Traction</h3>
              <div class="visual-strip">
                <div class="mini-ring" style="--score:${item.score}">
                  <strong>${item.score}</strong>
                  <span>Scout</span>
                </div>
                <div class="traction">
                  <div class="traction-top"><span>Live traction</span><strong>${tractionScore(item)}</strong></div>
                  <div class="traction-track"><i style="width:${tractionScore(item)}%"></i></div>
                  <small>${compactMetric(item.stars)} stars · ${compactMetric(item.forks)} forks · ${compactMetric(item.openPRs)} PRs</small>
                </div>
              </div>
              <div class="metrics">
                <div class="metric"><span>Score</span><strong>${metric(item.score)}</strong></div>
                <div class="metric"><span>Stars</span><strong>${metric(item.stars)}</strong></div>
                <div class="metric"><span>Forks</span><strong>${metric(item.forks)}</strong></div>
                <div class="metric"><span>Contributors</span><strong>${metric(item.contributors)}</strong></div>
                <div class="metric"><span>Open PRs</span><strong>${metric(item.openPRs)}</strong></div>
                <div class="metric"><span>Open issues</span><strong>${metric(item.openIssues)}</strong></div>
                <div class="metric"><span>Language</span><strong>${metric(item.language)}</strong></div>
                <div class="metric"><span>Last push</span><strong>${shortDate(item.pushedAt)}</strong></div>
              </div>
              <div class="repo-meta">
                <span>${item.archived ? "Archived" : "Active"}</span>
                <span>${metric(item.license)} license</span>
                <span>${metric(item.watchers)} watchers</span>
                <span>${metric(item.subscribers)} subscribers</span>
                <span>${caskLabel(item)}</span>
              </div>
              <h3 class="section-heading">Brew Cask Verification</h3>
              <section class="intel-panel">
                <div class="intel-main">
                  <span>Curated distribution signal</span>
                  <p>${caskEvidence(item)}</p>
                </div>
                <div class="intel-metrics">
                  <div><span>Policy</span><p>Promote only official Homebrew Casks that map to the GitHub repo, carry an open-source license, and do not show paid/trial markers.</p></div>
                  <div><span>Cask token</span><p>${caskVerified(item) ? item.homebrewCask.token : "Not verified"}</p></div>
                  <div><span>Cask name</span><p>${caskVerified(item) ? item.homebrewCask.name : "Not verified"}</p></div>
                  <div><span>Source</span><p>${caskVerified(item) ? "formulae.brew.sh Cask API" : "No qualifying source"}</p></div>
                </div>
              </section>
              <h3 class="section-heading">GitHubScout Intelligence</h3>
              <section class="intel-panel">
                <div class="intel-main">
                  <span>Scout signal</span>
                  <p>${text(item.signal)}</p>
                </div>
                <div class="intel-main">
                  <span>Thesis</span>
                  <p>${text(item.thesis)}</p>
                </div>
                <div class="intel-main">
                  <span>Repo description</span>
                  <p>${text(item.description, "No GitHub description available.")}</p>
                </div>
                <div class="intel-metrics">
                  <div><span>Review posture</span><p>${text(item.reviewPosture)}</p></div>
                  <div><span>Risk</span><p>${text(item.risk)}</p></div>
                  <div><span>Monetization angle</span><p>${text(item.monetization)}</p></div>
                  <div><span>Topics</span><p>${(item.topics ?? []).join(", ") || "No topics listed."}</p></div>
                </div>
                <div class="evidence-strip">
                  <span>Evidence from GitHubScout + live GitHub</span>
                  <ul>${listItems(item.evidence ?? [])}</ul>
                </div>
              </section>
              <h3 class="section-heading">Product, Offer, Pricing, Validation</h3>
              <div class="offer-grid">
                <div class="offer-card hot">
                  <span>Product wedge</span>
                  <p>${item.productWedge}</p>
                </div>
                <div class="offer-card">
                  <span>First offer</span>
                  <p>${item.firstOffer}</p>
                </div>
                <div class="offer-card">
                  <span>Pricing hypothesis</span>
                  <p>${item.pricingHypothesis}</p>
                </div>
                <div class="offer-card">
                  <span>Validation test</span>
                  <p>${item.validationTest}</p>
                </div>
              </div>
              <h3 class="section-heading">Pros, Cons, Tradeoffs</h3>
              <div class="pros-cons">
                <div class="pros">
                  <span>Pros</span>
                  <ul>${listItems(fallbackPros(item))}</ul>
                </div>
                <div class="cons">
                  <span>Cons</span>
                  <ul>${listItems(fallbackCons(item))}</ul>
                </div>
              </div>
              <h3 class="section-heading">Competition, Marketing, Demand</h3>
              <div class="strategy-grid">
                <div class="strategy-card">
                  <span>Competitors</span>
                  <p><b>Direct:</b> ${(item.competitors?.direct ?? []).join(", ")}</p>
                  <p><b>Alternative:</b> ${(item.competitors?.alternatives ?? []).join(", ")}</p>
                  <p><b>Why win:</b> ${item.competitors?.whyWin ?? "Narrower workflow focus."}</p>
                </div>
                <div class="strategy-card">
                  <span>Marketing angles</span>
                  <div class="chip-row">${chips(item.distributionChannels)}</div>
                  <p><b>Keywords:</b> ${(item.keywords ?? []).join(", ")}</p>
                </div>
                <div class="strategy-card">
                  <span>Commercial intent</span>
                  <div class="chip-row intent">${chips(item.commercialIntentSignals)}</div>
                  <p><b>Communities:</b> ${(item.communityHotspots ?? []).join(", ")}</p>
                </div>
                <div class="strategy-card">
                  <span>Trend context</span>
                  <p>${item.trendContext}</p>
                  <p><b>Moat:</b> ${item.moat}</p>
                </div>
              </div>
              <h3 class="section-heading">Workflow Transformation</h3>
              <div class="workflow-card">
                <div><span>Before</span><p>${item.workflowBeforeAfter?.before ?? "Manual workflow."}</p></div>
                <div><span>After</span><p>${item.workflowBeforeAfter?.after ?? "Automated workflow."}</p></div>
              </div>
              <h3 class="section-heading">Validation Copy</h3>
              <div class="copy-grid">
                <div class="copy-box">
                  <span>Landing page copy</span>
                  <h3>${item.landingPageCopy?.headline ?? item.firstOffer}</h3>
                  <p>${item.landingPageCopy?.subheadline ?? item.productWedge}</p>
                  <b>${item.landingPageCopy?.cta ?? "Join the beta"}</b>
                </div>
                <div class="copy-box">
                  <span>Cold outreach</span>
                  <p>${item.outreachDraft}</p>
                </div>
              </div>
              <h3 class="section-heading">Execution Plan And Kill Criteria</h3>
              <div class="action-steps">
                <span>Next 3 actions</span>
                <ol>${listItems(item.next3Actions)}</ol>
              </div>
              <div class="detail-grid">
                <div class="detail-block compact"><span>Issue / PR evidence</span><ul>${listItems(item.issueSignals)}</ul></div>
                <div class="detail-block compact"><span>Kill risk</span><p>${item.riskToKill}</p></div>
              </div>
              <div class="next"><strong>Product move:</strong> ${item.monetizationModel}</div>
              <div class="decision"><strong>Decision:</strong> ${item.decision ?? item.nextAction}</div>
              <div class="link-row">
                <a class="card-link" href="${item.url}" target="_blank" rel="noreferrer">GitHub repo -></a>
                <a class="card-link secondary-link" href="${state.data.source}" target="_blank" rel="noreferrer">GitHubScout source -></a>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty">No opportunities match this view.</div>`;
}

function renderTable() {
  $("#opportunityRows").innerHTML = [...state.data.opportunities]
    .sort((a, b) => b.score - a.score)
    .map(
      (item) => `
        <tr>
          <td><strong>${item.name}</strong><br><span class="panel-subtitle">${item.category}</span></td>
          <td>${item.score}</td>
          <td>${caskVerified(item) ? `+${item.caskBoost ?? 0}` : "-"}</td>
          <td>${item.verdict}</td>
          <td>${metric(item.stars)}</td>
          <td>${metric(item.forks)}</td>
          <td>${metric(item.contributors)}</td>
          <td>${metric(item.openPRs)}</td>
          <td>${metric(item.openIssues)}</td>
          <td>${metric(item.reviews)}</td>
          <td>${metric(item.language)}</td>
          <td>${shortDate(item.pushedAt)}</td>
          <td><strong>${item.productWedge}</strong><br><span class="table-note">${item.validationTest}</span></td>
        </tr>
      `
    )
    .join("");
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.filter = tab.dataset.filter;
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      renderCards();
    });
  });
}

async function init() {
  wireTabs();
  try {
    if (window.location.protocol === "file:" && window.GITHUBSCOUT_DATA) {
      state.data = window.GITHUBSCOUT_DATA;
    } else {
      const response = await fetch("data/opportunities.json", { cache: "no-store" });
      state.data = await response.json();
    }
    renderSummary();
    renderBars();
    renderCategoryLanes();
    renderActionBoard();
    renderMarketGrid();
    renderCards();
    renderTable();
  } catch (error) {
    if (window.GITHUBSCOUT_DATA) {
      state.data = window.GITHUBSCOUT_DATA;
      renderSummary();
      renderBars();
      renderCategoryLanes();
      renderActionBoard();
      renderMarketGrid();
      renderCards();
      renderTable();
      return;
    }
    $("#opportunityGrid").innerHTML = `<div class="empty">Dashboard data could not be loaded.</div>`;
    console.error(error);
  }
}

init();
