const money = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
const MAX_HTML_CHARS = 180000;
const MAX_CONTENT_LENGTH = 900000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 12;
const rateBuckets = new Map();

const categoryRules = {
  'Email/SMS': {threshold: 150, native: 'Shopify Email or platform automations', cheaper: 'MailerLite / Omnisend lower tier', replacement: 'Compare the current email/SMS platform against a lower-cost tier before adding another capture tool.'},
  'Upsell': {threshold: 120, native: 'Shopify Bundles and Functions', cheaper: 'Essentialwolf / Selleasy', replacement: 'Test native bundles, Shopify Functions, or a smaller upsell app first.'},
  'Support': {threshold: 100, native: 'Shopify Inbox plus macros', cheaper: 'HelpScout / Crisp', replacement: 'Reduce tickets with better macros and help content before replacing the helpdesk.'},
  'Reviews': {threshold: 40, native: 'Theme-integrated review section', cheaper: 'Judge.me', replacement: 'Keep paid reviews only if review volume and product-page placement clearly support conversion.'},
  'Loyalty': {threshold: 100, native: 'Shopify customer accounts and discounts', cheaper: 'Smile lower tier', replacement: 'Check whether points are actually used before paying for loyalty complexity.'},
  'Analytics': {threshold: 80, native: 'Shopify reports plus GA4', cheaper: 'Plausible / Umami', replacement: 'Use cleaner analytics only if it changes a weekly decision.'},
  'Search': {threshold: 120, native: 'Shopify Search & Discovery', cheaper: 'Searchanise', replacement: 'Measure search revenue before buying or rebuilding discovery tools.'},
  'Subscriptions': {threshold: 160, native: 'Shopify Subscriptions', cheaper: 'Seal Subscriptions', replacement: 'Keep if subscription revenue is core; otherwise avoid custom billing logic.'},
  'Personalization': {threshold: 140, native: 'Shopify customer segments', cheaper: 'Nosto lower tier', replacement: 'Keep only if uplift is measured; otherwise start with rules-based personalization.'},
  'Payments': {threshold: 120, native: 'Shopify Payments / Shop Pay', cheaper: 'Platform-native checkout options', replacement: 'Avoid custom payment work unless fees or approval rates justify it.'},
  'Shipping': {threshold: 100, native: 'Shopify Shipping', cheaper: 'Shippo / Pirate Ship', replacement: 'Review label volume and support burden before switching shipping tools.'},
  'Quiz': {threshold: 90, native: 'Theme-native quiz or guided selling section', cheaper: 'Octane lower tier / RevenueHunt', replacement: 'Keep quiz software only when it improves email quality, PDP routing, or product discovery.'},
  'Referral': {threshold: 80, native: 'Shopify discount links and customer segments', cheaper: 'ReferralCandy lower tier / Social Snowball audit', replacement: 'Measure referred revenue before paying for affiliate or referral complexity.'},
  'Testing': {threshold: 120, native: 'Theme-level split test plus analytics events', cheaper: 'Intelligems focused test / Convert lower tier', replacement: 'Run one revenue-backed test instead of paying for broad experimentation tooling.'},
  'Forms': {threshold: 70, native: 'Shopify Forms', cheaper: 'Tally / Typeform lower tier', replacement: 'Consolidate quiz, survey, and lead capture surfaces before adding another form tool.'}
};

const appSignatures = [
  {name: 'Klaviyo', category: 'Email/SMS', cost: 180, patterns: ['klaviyo', 'static.klaviyo.com', '_learnq']},
  {name: 'Attentive', category: 'Email/SMS', cost: 300, patterns: ['attentive', 'attn.tv', 'attentivemobile']},
  {name: 'Postscript', category: 'Email/SMS', cost: 250, patterns: ['postscript', 'postscript.io']},
  {name: 'Gorgias', category: 'Support', cost: 120, patterns: ['gorgias', 'gorgias.chat', 'config.gorgias']},
  {name: 'Shopify Inbox', category: 'Support', cost: 0, patterns: ['shopifyinbox', 'shopify inbox']},
  {name: 'Tidio', category: 'Support', cost: 39, patterns: ['tidio', 'tidio.co']},
  {name: 'Crisp', category: 'Support', cost: 95, patterns: ['crisp.chat', 'crisp-client']},
  {name: 'Recharge', category: 'Subscriptions', cost: 299, patterns: ['recharge', 'rechargepayments', 'subscriptions.recharge']},
  {name: 'Bold Subscriptions', category: 'Subscriptions', cost: 199, patterns: ['boldsubscriptions', 'boldcommerce', 'bold-subscriptions']},
  {name: 'Seal Subscriptions', category: 'Subscriptions', cost: 49, patterns: ['sealsubscriptions', 'seal-subscriptions']},
  {name: 'Rebuy', category: 'Upsell', cost: 249, patterns: ['rebuy', 'rebuyengine', 'rebuyengine.com']},
  {name: 'Yotpo', category: 'Reviews', cost: 149, patterns: ['yotpo', 'staticw2.yotpo.com', 'yotpo-widget']},
  {name: 'Judge.me', category: 'Reviews', cost: 15, patterns: ['judge.me', 'judgeme', 'cdn.judge.me']},
  {name: 'Okendo', category: 'Reviews', cost: 99, patterns: ['okendo', 'okendo.io']},
  {name: 'LoyaltyLion', category: 'Loyalty', cost: 157, patterns: ['loyaltylion', 'loyaltylion.net']},
  {name: 'Smile.io', category: 'Loyalty', cost: 49, patterns: ['smile.io', 'smile-ui', 'smile-shopify']},
  {name: 'Algolia', category: 'Search', cost: 120, patterns: ['algolia', 'algolia.net', 'algoliasearch']},
  {name: 'Searchanise', category: 'Search', cost: 39, patterns: ['searchanise', 'searchserverapi']},
  {name: 'Triple Whale', category: 'Analytics', cost: 129, patterns: ['triplewhale', 'triple whale']},
  {name: 'Hotjar', category: 'Analytics', cost: 80, patterns: ['hotjar', 'hjid', 'hotjar.com']},
  {name: 'Google Analytics', category: 'Analytics', cost: 0, patterns: ['google-analytics', 'gtag(', 'google tag manager', 'googletagmanager']},
  {name: 'Nosto', category: 'Personalization', cost: 180, patterns: ['nosto', 'nosto.com', 'nostojs']},
  {name: 'Dynamic Yield', category: 'Personalization', cost: 300, patterns: ['dynamicyield', 'dynamic yield', 'dy-api']},
  {name: 'AfterShip', category: 'Shipping', cost: 89, patterns: ['aftership', 'aftership.com']},
  {name: 'ShipBob', category: 'Shipping', cost: 150, patterns: ['shipbob', 'shipbob.com']},
  {name: 'Route', category: 'Shipping', cost: 120, patterns: ['route.com', 'routeapp', 'route-widget']},
  {name: 'PayPal', category: 'Payments', cost: 80, patterns: ['paypal', 'paypalobjects']},
  {name: 'Shop Pay', category: 'Payments', cost: 0, patterns: ['shop.app', 'shop-pay', 'shopify_pay']},
  {name: 'Shopify Forms', category: 'Forms', cost: 0, patterns: ['shopify-forms', 'shopify forms', 'shopify_form']},
  {name: 'Privy', category: 'Email/SMS', cost: 70, patterns: ['privy.com', 'privy-', 'privySettings']},
  {name: 'Omnisend', category: 'Email/SMS', cost: 120, patterns: ['omnisend', 'omnisnippet', 'omnisend.com']},
  {name: 'Mailchimp', category: 'Email/SMS', cost: 90, patterns: ['mailchimp', 'chimpstatic', 'mcjs']},
  {name: 'Justuno', category: 'Email/SMS', cost: 99, patterns: ['justuno', 'justuno.com']},
  {name: 'OptiMonk', category: 'Email/SMS', cost: 79, patterns: ['optimonk', 'optimonk.com']},
  {name: 'Loox', category: 'Reviews', cost: 35, patterns: ['loox', 'loox.io', 'loox-rating']},
  {name: 'Stamped', category: 'Reviews', cost: 99, patterns: ['stamped.io', 'stamped-reviews', 'stamped-main']},
  {name: 'Reviews.io', category: 'Reviews', cost: 89, patterns: ['reviews.io', 'widget.reviews.io']},
  {name: 'Fera', category: 'Reviews', cost: 39, patterns: ['fera.ai', 'fera-product']},
  {name: 'Junip', category: 'Reviews', cost: 74, patterns: ['junip', 'juniphq']},
  {name: 'Stamped Loyalty', category: 'Loyalty', cost: 159, patterns: ['stamped-loyalty', 'stamped rewards']},
  {name: 'Yotpo Loyalty', category: 'Loyalty', cost: 199, patterns: ['yotpo loyalty', 'swell_rewards', 'swellrewards']},
  {name: 'Loop Subscriptions', category: 'Subscriptions', cost: 99, patterns: ['loop-subscriptions', 'loopsubscriptions']},
  {name: 'Skio', category: 'Subscriptions', cost: 299, patterns: ['skio', 'skio.com', 'skio-subscription']},
  {name: 'Appstle Subscriptions', category: 'Subscriptions', cost: 49, patterns: ['appstle', 'appstle-subscription']},
  {name: 'Zipify OCU', category: 'Upsell', cost: 35, patterns: ['zipify', 'zipifyapps', 'oneclickupsell']},
  {name: 'Bold Upsell', category: 'Upsell', cost: 89, patterns: ['bold-upsell', 'boldcommerce upsell']},
  {name: 'Vitals', category: 'Upsell', cost: 30, patterns: ['vitals.co', 'vitals app', 'vitals-']},
  {name: 'Searchspring', category: 'Search', cost: 399, patterns: ['searchspring', 'searchspring.net']},
  {name: 'Klevu', category: 'Search', cost: 349, patterns: ['klevu', 'klevu.com']},
  {name: 'Replo', category: 'Personalization', cost: 99, patterns: ['replo', 'replo.app']},
  {name: 'Shogun', category: 'Personalization', cost: 149, patterns: ['getshogun', 'shogunpage']},
  {name: 'GemPages', category: 'Personalization', cost: 59, patterns: ['gempages', 'gempage']},
  {name: 'Octane AI', category: 'Quiz', cost: 200, patterns: ['octaneai', 'octane.ai']},
  {name: 'RevenueHunt', category: 'Quiz', cost: 69, patterns: ['revenuehunt', 'product-recommendation-quiz']},
  {name: 'Typeform', category: 'Forms', cost: 59, patterns: ['typeform', 'typeform.com']},
  {name: 'Tally', category: 'Forms', cost: 29, patterns: ['tally.so', 'tally-embed']},
  {name: 'ReferralCandy', category: 'Referral', cost: 59, patterns: ['referralcandy', 'referralcandy.com']},
  {name: 'Social Snowball', category: 'Referral', cost: 99, patterns: ['socialsnowball', 'social-snowball']},
  {name: 'UpPromote', category: 'Referral', cost: 89, patterns: ['uppromote', 'secomapp']},
  {name: 'Intelligems', category: 'Testing', cost: 99, patterns: ['intelligems', 'intelligems.io']},
  {name: 'Convert', category: 'Testing', cost: 199, patterns: ['convert.com', 'convertexperiments']},
  {name: 'VWO', category: 'Testing', cost: 199, patterns: ['vwo.com', 'visualwebsiteoptimizer']},
  {name: 'Lucky Orange', category: 'Analytics', cost: 80, patterns: ['luckyorange', 'lucky orange']},
  {name: 'Microsoft Clarity', category: 'Analytics', cost: 0, patterns: ['clarity.ms', 'microsoft clarity']},
  {name: 'PostHog', category: 'Analytics', cost: 0, patterns: ['posthog', 'posthog.com']}
];

function spendProfile(range = '') {
  if (range.includes('250,000')) return {monthly: '$1.8k-$6.5k', annual: '$21.6k-$78k', low: 1800, high: 6500, annualLow: 21600, annualHigh: 78000, score: 94, urgency: 'Critical', note: 'At this traffic level, slow scripts and weak widgets compound quickly.'};
  if (range.includes('100,000')) return {monthly: '$850-$2.9k', annual: '$10.2k-$34.8k', low: 850, high: 2900, annualLow: 10200, annualHigh: 34800, score: 89, urgency: 'High', note: 'Your app stack should be conversion-accountable, not just feature-rich.'};
  if (range.includes('10,000 to')) return {monthly: '$320-$1.2k', annual: '$3.8k-$14.4k', low: 320, high: 1200, annualLow: 3840, annualHigh: 14400, score: 84, urgency: 'High', note: 'This is the sweet spot for consolidation and better CRO tooling.'};
  return {monthly: '$120-$420', annual: '$1.4k-$5k', low: 120, high: 420, annualLow: 1440, annualHigh: 5040, score: 76, urgency: 'Medium', note: 'Lean software choices matter most when every paid click has to work.'};
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Store URL is required.');
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https storefront URLs can be scanned.');
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === 'metadata.google.internal' ||
    host === '169.254.169.254' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error('Private or local URLs cannot be scanned.');
  }
  return url;
}

function clientIp(event) {
  return event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown';
}

function checkRateLimit(key) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || {count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS};
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return {
    allowed: bucket.count <= RATE_LIMIT_MAX,
    resetAt: bucket.resetAt,
    remaining: Math.max(0, RATE_LIMIT_MAX - bucket.count)
  };
}

async function readLimitedText(response) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_CONTENT_LENGTH) {
    throw new Error(`Storefront response is too large to scan safely (${contentLength.toLocaleString('en-US')} bytes).`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
    throw new Error(`Storefront returned ${contentType}; only public HTML can be scanned.`);
  }

  if (!response.body?.getReader) {
    return (await response.text()).slice(0, MAX_HTML_CHARS);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let done = false;
  while (!done && html.length < MAX_HTML_CHARS) {
    const chunk = await reader.read();
    done = chunk.done;
    if (chunk.value) html += decoder.decode(chunk.value, {stream: !done});
  }
  try {
    await reader.cancel();
  } catch (error) {}
  return html.slice(0, MAX_HTML_CHARS);
}

async function crawlStorefront(storeUrl) {
  const url = normalizeUrl(storeUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GitHubScoutOperatorScan/1.0; +https://githubscout-ecommerce-v9-20260609.netlify.app)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    const html = await readLimitedText(response);
    return {
      ok: response.ok,
      url: url.toString(),
      finalUrl: response.url,
      status: response.status,
      bytes: html.length,
      html,
      statusLabel: `Fetched ${url.hostname} with HTTP ${response.status}; inspected ${html.length.toLocaleString('en-US')} characters of public HTML.`
    };
  } finally {
    clearTimeout(timeout);
  }
}

function detectApps(html) {
  const haystack = String(html || '').toLowerCase();
  return appSignatures
    .map((signature) => {
      const matched = signature.patterns.filter((pattern) => haystack.includes(pattern.toLowerCase()));
      return {
        ...signature,
        matched,
        confidence: Math.min(98, 58 + matched.length * 14),
        monthlyCost: money.format(signature.cost)
      };
    })
    .filter((signature) => signature.matched.length)
    .sort((a, b) => b.cost - a.cost);
}

function categoryApps(detectedApps, category) {
  return detectedApps.filter((app) => app.category === category);
}

function detectedLine(detectedApps, category, fallback) {
  const apps = categoryApps(detectedApps, category);
  return apps.length ? `Detected ${apps.map((app) => app.name).join(', ')} in public storefront HTML.` : fallback;
}

function evidenceDetail(detectedApps, category, fallback) {
  const apps = categoryApps(detectedApps, category);
  if (!apps.length) return fallback;
  return apps
    .slice(0, 3)
    .map((app) => `${app.name}: matched ${app.matched.slice(0, 3).join(', ')}; benchmark ${money.format(app.cost)}/mo`)
    .join(' | ');
}

function categorySavings(profile, detectedApps, category, minShare, maxShare) {
  const apps = categoryApps(detectedApps, category);
  const detectedMonthly = apps.reduce((sum, app) => sum + Number(app.cost || 0), 0);
  const low = detectedMonthly ? Math.max(Math.round(detectedMonthly * .18), Math.round(profile.low * minShare)) : Math.round(profile.low * minShare);
  const high = detectedMonthly ? Math.max(Math.round(detectedMonthly * .42), Math.round(profile.high * maxShare)) : Math.round(profile.high * maxShare);
  return `${money.format(low)}-${money.format(high)}/mo`;
}

function buildRecommendations(detectedApps, profile, goal) {
  const totalDetectedCost = detectedApps.reduce((sum, app) => sum + Number(app.cost || 0), 0);
  const recs = [
    {
      category: 'Reviews + UGC',
      title: 'Consolidate the proof surface',
      severity: categoryApps(detectedApps, 'Reviews').length > 1 ? 'High' : 'Medium',
      current: detectedLine(detectedApps, 'Reviews', 'No review-platform signature was visible in the initial crawl. Proof may be missing, bundled, or hidden behind a tag manager.'),
      currentDetail: evidenceDetail(detectedApps, 'Reviews', 'If reviews, Q&A, UGC, and product proof are split across multiple widgets, shoppers see noise while you pay for overlap.'),
      recommend: 'Use one review platform that supports photo reviews, Q&A, product-level placement, and import/export control.',
      recommendDetail: 'The paid Operator scan compares review tools by cost, proof depth, speed impact, and whether the widget supports the products getting paid traffic.',
      monthly: categorySavings(profile, detectedApps, 'Reviews', .16, .22),
      percent: '12-18% waste risk',
      confidence: categoryApps(detectedApps, 'Reviews').length ? 'Detected' : 'Check first',
      why: 'Review proof affects every paid click. Waiting means another billing cycle passes before you know whether the proof layer is helping conversion or just adding script weight.',
      action: 'Export current review volume, check product-page placement, and compare one lighter alternative before renewing another paid review tier.'
    },
    {
      category: 'Email/SMS capture',
      title: 'Replace blunt popups with intent capture',
      severity: categoryApps(detectedApps, 'Email/SMS').length ? 'High' : 'Medium',
      current: detectedLine(detectedApps, 'Email/SMS', 'No email/SMS platform signature was visible in the first crawl. Capture may be absent or injected through a tag manager.'),
      currentDetail: evidenceDetail(detectedApps, 'Email/SMS', 'Generic popups often collect low-intent emails while interrupting shoppers who came from expensive paid traffic.'),
      recommend: 'Use behavior-based capture that changes by traffic source, returning visitor state, cart value, and product category.',
      recommendDetail: 'Scout looks for leaner capture tools, lower-cost tiers, and open alternatives when the current platform is too heavy for the store stage.',
      monthly: categorySavings(profile, detectedApps, 'Email/SMS', .18, .28),
      percent: '15-24% spend leverage',
      confidence: categoryApps(detectedApps, 'Email/SMS').length ? 'Detected' : 'Check first',
      why: 'If capture is weak, every ad dollar has a shorter payback window. Fixing the capture surface today gives the next campaign a better chance to create owned traffic.',
      action: 'Segment capture by paid source, suppress repeat annoyance, and compare your current platform tier against one lower-cost alternative.'
    },
    {
      category: 'Upsell + AOV',
      title: 'Test AOV lift before buying more traffic',
      severity: categoryApps(detectedApps, 'Upsell').length || goal === 'Improve conversion' ? 'High' : 'Medium',
      current: detectedLine(detectedApps, 'Upsell', 'No upsell or bundle signature was visible in the first crawl. The store may be missing an AOV lever on paid-traffic products.'),
      currentDetail: evidenceDetail(detectedApps, 'Upsell', 'Many stores pay for traffic before product pages have bundles, quantity breaks, post-purchase offers, or cart-level lift.'),
      recommend: 'Start with one bundle, quantity break, or post-purchase offer on the products already receiving paid clicks.',
      recommendDetail: 'Operator compares native Shopify options, lighter widgets, and conversion-focused third-party tools before recommending another broad CRO app.',
      monthly: categorySavings(profile, detectedApps, 'Upsell', .22, .34),
      percent: '8-15% AOV upside target',
      confidence: categoryApps(detectedApps, 'Upsell').length ? 'Detected' : 'Opportunity',
      why: 'AOV improvements can pay back faster than new traffic. If you wait, you keep sending expensive visitors into the same under-monetized cart path.',
      action: 'Choose the top paid-traffic product, add one offer test, and measure add-to-cart, checkout progression, and revenue per visitor for seven days.'
    },
    {
      category: 'Script bloat',
      title: 'Remove inactive third-party scripts',
      severity: totalDetectedCost > 300 || detectedApps.length >= 4 ? 'High' : 'Medium',
      current: detectedApps.length ? `The crawl found ${detectedApps.length} public software signal${detectedApps.length === 1 ? '' : 's'} with roughly ${money.format(totalDetectedCost)}/mo in benchmarked app cost.` : 'The crawl did not expose many app signatures, which often means scripts are bundled, tag-managed, or loaded after consent.',
      currentDetail: 'Old promo apps, inactive widgets, duplicate analytics, and abandoned experiments can keep loading after the team stops using them.',
      recommend: 'Audit every script touching product pages, cart, checkout, analytics, reviews, popups, chat, and post-purchase.',
      recommendDetail: 'Scout prioritizes the scripts most likely to hurt speed or duplicate another tool, then turns that into a keep, replace, remove, or test list.',
      monthly: `${money.format(Math.max(Math.round(totalDetectedCost * .12), Math.round(profile.low * .20)))}-${money.format(Math.max(Math.round(totalDetectedCost * .32), Math.round(profile.high * .30)))}/mo`,
      percent: '18-30% cleanup target',
      confidence: detectedApps.length ? 'Detected' : 'Always inspect',
      why: 'Script bloat taxes every session. The longer it stays live, the more paid clicks get routed through a slower and harder-to-measure storefront.',
      action: 'Pull the theme/app embed list today, remove one inactive script, and document the owner for every remaining third-party tool.'
    },
    {
      category: 'Measurement',
      title: 'Make every app prove revenue impact',
      severity: goal === 'Cut app costs' || categoryApps(detectedApps, 'Analytics').length > 1 ? 'High' : 'Medium',
      current: detectedLine(detectedApps, 'Analytics', 'No analytics signature was visible in the first crawl. Attribution may be missing, server-side, or tag-managed.'),
      currentDetail: evidenceDetail(detectedApps, 'Analytics', 'Without clean event tracking, the team cannot tell whether a paid app helps conversion or simply feels useful.'),
      recommend: 'Tie app decisions to app cost, site speed, conversion rate, add-to-cart rate, AOV, and checkout progression.',
      recommendDetail: 'Operator turns the scan into a monthly review cadence so software decisions happen before renewal, not after the invoice hits.',
      monthly: categorySavings(profile, detectedApps, 'Analytics', .12, .20),
      percent: '7-day proof window',
      confidence: categoryApps(detectedApps, 'Analytics').length ? 'Detected' : 'Check first',
      why: 'If measurement is vague, the safest default becomes keeping every app. That is exactly how stack cost creeps up.',
      action: 'Mark each tool as revenue, support, compliance, or convenience. Cancel, downgrade, or replace anything with no weekly owner.'
    }
  ];

  if (goal === 'Cut app costs') return [recs[3], recs[4], recs[0], recs[1], recs[2]];
  if (goal === 'Improve conversion') return [recs[2], recs[1], recs[0], recs[4], recs[3]];
  if (goal === 'Speed up storefront') return [recs[3], recs[4], recs[0], recs[1], recs[2]];
  if (goal === 'Find better widgets') return [recs[0], recs[1], recs[2], recs[4], recs[3]];
  return recs;
}

function buildActionPlan(profile) {
  return [
    ['Today', 'Save the current app list and identify every script, widget, embed, pixel, popup, review tool, cart tool, and analytics tag touching the storefront.'],
    ['24 hours', `Challenge at least ${profile.urgency === 'Critical' ? 'three paid app renewals' : 'one paid app renewal'} before the next billing cycle. Start with the tool with the weakest owner or least measurable revenue impact.`],
    ['48 hours', 'Pick one compare-and-contrast test: current widget versus lower-cost replacement, or current popup versus intent-based capture.'],
    ['7 days', 'Measure app cost, speed, add-to-cart rate, checkout progression, AOV, and revenue per visitor before making the next software purchase.']
  ];
}

async function analyzeSubmission(submission) {
  const profile = spendProfile(submission.monthly_ad_spend || '');
  let crawl = {ok: false, statusLabel: 'Live crawl unavailable. Showing conservative recommendations from submitted context.'};
  let detectedApps = [];

  try {
    crawl = await crawlStorefront(submission.store_url);
    detectedApps = detectApps(crawl.html);
  } catch (error) {
    crawl = {ok: false, statusLabel: `Live crawl unavailable: ${error.message}`};
  }

  const detectedCost = detectedApps.reduce((sum, app) => sum + Number(app.cost || 0), 0);
  const score = Math.min(98, profile.score + Math.min(8, detectedApps.length * 2) + (detectedCost > 350 ? 4 : 0));

  return {
    crawl: {
      ok: Boolean(crawl.ok),
      status: crawl.status || null,
      bytes: crawl.bytes || 0,
      statusLabel: crawl.statusLabel
    },
    summary: {
      monthlySavings: profile.monthly,
      annualSavings: profile.annual,
      score,
      urgency: profile.urgency,
      detectedCount: detectedApps.length
    },
    detectedApps: detectedApps.map((app) => ({
      name: app.name,
      category: app.category,
      confidence: app.confidence,
      monthlyCost: app.monthlyCost,
      matched: app.matched
    })),
    recommendations: buildRecommendations(detectedApps, profile, submission.primary_goal || ''),
    actionPlan: buildActionPlan(profile)
  };
}

function publicSubmission(submission) {
  return {
    email: submission.email || null,
    store_url: submission.store_url || null,
    monthly_ad_spend: submission.monthly_ad_spend || null,
    monthly_app_spend: submission.monthly_app_spend || null,
    primary_goal: submission.primary_goal || null,
    priority: submission.priority || null,
    notes: submission.notes || null,
    intent: submission.intent || 'lead',
    utm_source: submission.utm_source || null,
    utm_medium: submission.utm_medium || null,
    utm_campaign: submission.utm_campaign || null,
    utm_content: submission.utm_content || null,
    utm_term: submission.utm_term || null,
    landing_page: submission.landing_page || null,
    referrer: submission.referrer || null,
    received_at: new Date().toISOString()
  };
}

async function sendWebhook(submission, analysis) {
  const webhookUrl = process.env.GHL_WEBHOOK_URL || process.env.LEAD_WEBHOOK_URL;
  if (!webhookUrl) return {sent: false, reason: 'not_configured'};

  const payload = {
    source: 'github-scout-operator',
    submission: publicSubmission(submission),
    analysis_summary: analysis ? {
      crawl_ok: Boolean(analysis.crawl?.ok),
      detected_count: analysis.detectedApps?.length || 0,
      urgency: analysis.summary?.urgency || null,
      score: analysis.summary?.score || null,
      monthly_savings: analysis.summary?.monthlySavings || null,
      annual_savings: analysis.summary?.annualSavings || null
    } : null
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    return {sent: response.ok, status: response.status};
  } catch (error) {
    console.error('lead-webhook-error', error.message);
    return {sent: false, reason: error.message};
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {'Allow': 'POST'},
      body: JSON.stringify({ok: false, error: 'Method not allowed'})
    };
  }

  const params = new URLSearchParams(event.body || '');
  const submission = Object.fromEntries(params.entries());
  const ip = clientIp(event);
  const limit = checkRateLimit(`${ip}:${submission.intent || 'lead'}`);
  if (!limit.allowed) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000))
      },
      body: JSON.stringify({ok: false, error: 'Too many scan requests. Please wait a minute and try again.'})
    };
  }

  console.log('operator-url-scan', publicSubmission(submission));

  if (submission.intent === 'lead') {
    const webhook = await sendWebhook(submission, null);
    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ok: true, webhook})
    };
  }

  const analysis = await analyzeSubmission(submission);
  const webhook = await sendWebhook(submission, analysis);

  return {
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ok: true, analysis, webhook})
  };
};
