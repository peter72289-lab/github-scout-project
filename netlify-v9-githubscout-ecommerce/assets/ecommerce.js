const state = {
  data: null,
  filtered: [],
  track: "merchant",
};

const fmt = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const $ = (selector) => document.querySelector(selector);

const pipelines = {
  merchant: [
    ["Audit the app bill", "List every paid app, monthly cost, owner, and the problem it supposedly solves."],
    ["Find the free or build-once alternative", "Use the opportunity cards to decide whether to keep paying, switch to a free version, or build once."],
    ["Test one swap", "Change one low-risk widget first. Measure conversion, support tickets, and app spend for 14 days."],
    ["Keep the stack lean", "Cancel anything that does not clearly improve revenue, operations, compliance, or customer experience."]
  ],
  builder: [
    ["Mine merchant complaints", "Look for repeated pain in Reddit, app reviews, GitHub issues, Shopify forums, and BigCommerce communities."],
    ["Map the gap", "Name the incumbent, price, complaint, platform constraints, and smallest useful replacement."],
    ["Build a narrow widget", "Ship one focused app or theme component with a clean before/after ROI story."],
    ["Seed with operators", "Give early access to 10 store owners, capture proof, then publish the teardown."]
  ]
};

function n(value) {
  return fmt.format(value);
}

function readSlider(id) {
  return Number(document.getElementById(id).value);
}

async function loadData() {
  try {
    const response = await fetch("http://localhost:7842/api/opportunities");
    if (!response.ok) throw new Error(`API ${response.status}`);
    state.data = await response.json();
    $("#apiStatus").textContent = "API bridge online";
  } catch (error) {
    const response = await fetch("data/ecommerce_opportunities.json");
    state.data = await response.json();
    $("#apiStatus").textContent = "Using static JSON";
  }
  state.filtered = state.data.opportunities;
  render();
}

function render() {
  const items = state.filtered;
  $("#topSignal").textContent = state.data.summary.topSignal;
  $("#totalOpps").textContent = state.data.opportunities.length;
  const avg = Math.round(state.data.opportunities.reduce((sum, item) => sum + (item.currentCost || 0), 0) / state.data.opportunities.length);
  $("#avgSavings").textContent = money.format(avg);
  renderOpportunities(items);
  renderPipeline();
  updateRoi();
}

function renderOpportunities(items) {
  $("#opportunityGrid").innerHTML = items.map((item) => `
    <article class="opp-card" id="${item.id}">
      <div class="opp-top">
        <div>
          <h3>${item.merchantOutcome}</h3>
          <p><b>${item.name}</b> · ${item.pain}</p>
        </div>
        <span class="recommendation">${item.recommendedPath}</span>
      </div>
      <div class="tag-row">
        ${item.platforms.map((platform) => `<span>${platform}</span>`).join("")}
        <span>${item.implementation}</span>
        <span>${item.complexity}</span>
      </div>
      <div class="merchant-complaint">
        Paying now: ${item.currentApp}, about ${money.format(item.currentCost)}/mo. Common complaint: ${item.reviewComplaint}
      </div>
      <div class="path-row">
        <span><b>Keep paying</b><br>${money.format(item.currentCost)}/mo app path.</span>
        <span><b>Free version</b><br>${item.freePath}</span>
        <span><b>Build once</b><br>${item.buildOnce}</span>
      </div>
      <p><b>Source signals:</b> ${item.sourceSignals.join(", ")}.</p>
      <details>
        <summary>What needs to be done</summary>
        <ol>${item.nextSteps.map((step) => `<li>${step}</li>`).join("")}</ol>
      </details>
    </article>
  `).join("");
}

function updateRoi() {
  const gmv = readSlider("gmvSlider");
  const appSpend = readSlider("appSpendSlider");
  const aov = readSlider("aovSlider");
  const supportHours = readSlider("supportSlider");
  $("#gmvOut").textContent = money.format(gmv);
  $("#appSpendOut").textContent = money.format(appSpend);
  $("#aovOut").textContent = money.format(aov);
  $("#supportOut").textContent = `${supportHours} hrs`;

  const appSavings = Math.round(appSpend * 0.35);
  const conversionLift = Math.round(gmv * 0.012);
  const supportSavings = Math.round(supportHours * 45);
  const annual = (appSavings + conversionLift + supportSavings) * 12;

  $("#appSavings").textContent = money.format(appSavings);
  $("#conversionLift").textContent = money.format(conversionLift);
  $("#supportSavings").textContent = money.format(supportSavings);
  $("#annualOpportunity").textContent = money.format(annual);
}

function applyAudit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const gmv = form.get("gmv");
  const platform = form.get("platform");
  const category = form.get("category");
  const pain = form.get("pain");
  state.filtered = state.data.opportunities.filter((item) =>
    item.gmv.includes(gmv) &&
    item.platforms.includes(platform) &&
    item.fit.includes(category) &&
    (item.roiLever === pain || pain === "appSavings")
  );
  if (!state.filtered.length) {
    state.filtered = state.data.opportunities.filter((item) => item.platforms.includes(platform) && item.fit.includes(category));
  }
  $("#matchBanner").textContent = `${state.filtered.length} matched opportunities for ${platform}, ${category}, ${gmv}. Start with the cards below.`;
  renderOpportunities(state.filtered);
}

function renderPipeline() {
  $("#pipelineSteps").innerHTML = pipelines[state.track].map(([title, body], index) => `
    <article class="pipeline-step">
      <h3>${index + 1}. ${title}</h3>
      <p>${body}</p>
    </article>
  `).join("");
}

document.addEventListener("input", (event) => {
  if (event.target.matches("input[type='range']")) updateRoi();
});

$("#auditForm").addEventListener("submit", applyAudit);

document.querySelectorAll(".track-toggle button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".track-toggle button").forEach((node) => node.classList.remove("active"));
    button.classList.add("active");
    state.track = button.dataset.track;
    renderPipeline();
  });
});

loadData();
