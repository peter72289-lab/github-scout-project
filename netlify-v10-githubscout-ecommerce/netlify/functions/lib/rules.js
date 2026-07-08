'use strict';
// rules.js — versioned detection ruleset.
// Every `cost` is a BENCHMARK (typical published mid-tier pricing), never the
// store's actual bill. The UI must label it as such. `pricingUrl` cites the
// vendor pricing page where the benchmark came from. Apps with cost 0 are
// free/native and are never counted toward savings.
// Changes vs v10: removed the fabricated "PayPal $80/mo" cost (PayPal has no
// monthly app fee — it is transaction-fee based, cost set to 0 and note added).

const RULES_VERSION = '2.0.0';

const categoryRules = {
  'Email/SMS': {threshold: 150, native: 'Shopify Email or platform automations', cheaper: 'MailerLite / Omnisend lower tier'},
  'Upsell': {threshold: 120, native: 'Shopify Bundles and Functions', cheaper: 'Essentialwolf / Selleasy'},
  'Support': {threshold: 100, native: 'Shopify Inbox plus macros', cheaper: 'HelpScout / Crisp'},
  'Reviews': {threshold: 40, native: 'Theme-integrated review section', cheaper: 'Judge.me'},
  'Loyalty': {threshold: 100, native: 'Shopify customer accounts and discounts', cheaper: 'Smile lower tier'},
  'Analytics': {threshold: 80, native: 'Shopify reports plus GA4', cheaper: 'Plausible / Umami'},
  'Search': {threshold: 120, native: 'Shopify Search & Discovery', cheaper: 'Searchanise'},
  'Subscriptions': {threshold: 160, native: 'Shopify Subscriptions', cheaper: 'Seal Subscriptions'},
  'Personalization': {threshold: 140, native: 'Shopify customer segments', cheaper: 'Rules-based personalization'},
  'Payments': {threshold: 120, native: 'Shopify Payments / Shop Pay', cheaper: 'Platform-native checkout options'},
  'Shipping': {threshold: 100, native: 'Shopify Shipping', cheaper: 'Shippo / Pirate Ship'},
  'Quiz': {threshold: 90, native: 'Theme-native quiz section', cheaper: 'RevenueHunt'},
  'Referral': {threshold: 80, native: 'Shopify discount links and segments', cheaper: 'ReferralCandy lower tier'},
  'Testing': {threshold: 120, native: 'Theme-level split test plus analytics events', cheaper: 'Intelligems focused test'},
  'Forms': {threshold: 70, native: 'Shopify Forms', cheaper: 'Tally / Typeform lower tier'}
};

// patterns: substrings matched in page HTML/scripts. hosts: third-party script
// hosts (matched against parsed <script src>/<link href> hostnames — stronger
// evidence than a raw substring). dns: TXT/MX/CNAME fragments.
const appSignatures = [
  {id: 'klaviyo', name: 'Klaviyo', category: 'Email/SMS', cost: 180, pricingUrl: 'https://www.klaviyo.com/pricing', patterns: ['klaviyo', '_learnq'], hosts: ['static.klaviyo.com', 'a.klaviyo.com'], dns: ['klaviyo']},
  {id: 'attentive', name: 'Attentive', category: 'Email/SMS', cost: 300, pricingUrl: 'https://www.attentive.com/pricing', patterns: ['attentivemobile', 'attn.tv'], hosts: ['cdn.attn.tv']},
  {id: 'postscript', name: 'Postscript', category: 'Email/SMS', cost: 250, pricingUrl: 'https://postscript.io/pricing', patterns: ['postscript.io'], hosts: ['sdk.postscript.io']},
  {id: 'privy', name: 'Privy', category: 'Email/SMS', cost: 70, pricingUrl: 'https://www.privy.com/pricing', patterns: ['privy-', 'privySettings'], hosts: ['widget.privy.com']},
  {id: 'omnisend', name: 'Omnisend', category: 'Email/SMS', cost: 120, pricingUrl: 'https://www.omnisend.com/pricing/', patterns: ['omnisnippet', 'omnisend'], hosts: ['omnisnippet1.com', 'omnisend.com']},
  {id: 'mailchimp', name: 'Mailchimp', category: 'Email/SMS', cost: 90, pricingUrl: 'https://mailchimp.com/pricing/', patterns: ['chimpstatic', 'mcjs'], hosts: ['chimpstatic.com'], dns: ['mcsv.net', 'mandrillapp']},
  {id: 'justuno', name: 'Justuno', category: 'Email/SMS', cost: 99, patterns: ['justuno'], hosts: ['cdn.justuno.com']},
  {id: 'optimonk', name: 'OptiMonk', category: 'Email/SMS', cost: 79, patterns: ['optimonk'], hosts: ['onsite.optimonk.com']},
  {id: 'gorgias', name: 'Gorgias', category: 'Support', cost: 120, pricingUrl: 'https://www.gorgias.com/pricing', patterns: ['gorgias.chat', 'config.gorgias'], hosts: ['config.gorgias.chat']},
  {id: 'shopify-inbox', name: 'Shopify Inbox', category: 'Support', cost: 0, patterns: ['shopifyinbox', 'shopify inbox']},
  {id: 'tidio', name: 'Tidio', category: 'Support', cost: 39, pricingUrl: 'https://www.tidio.com/pricing/', patterns: ['tidio'], hosts: ['code.tidio.co']},
  {id: 'crisp', name: 'Crisp', category: 'Support', cost: 95, pricingUrl: 'https://crisp.chat/en/pricing/', patterns: ['crisp-client'], hosts: ['client.crisp.chat']},
  {id: 'recharge', name: 'Recharge', category: 'Subscriptions', cost: 299, pricingUrl: 'https://getrecharge.com/pricing/', patterns: ['rechargepayments', 'subscriptions.recharge'], hosts: ['static.rechargecdn.com']},
  {id: 'bold-subscriptions', name: 'Bold Subscriptions', category: 'Subscriptions', cost: 199, patterns: ['boldsubscriptions', 'bold-subscriptions'], hosts: ['static.boldcommerce.com']},
  {id: 'seal', name: 'Seal Subscriptions', category: 'Subscriptions', cost: 49, pricingUrl: 'https://www.sealsubscriptions.com/pricing', patterns: ['sealsubscriptions', 'seal-subscriptions']},
  {id: 'loop-subscriptions', name: 'Loop Subscriptions', category: 'Subscriptions', cost: 99, patterns: ['loop-subscriptions', 'loopsubscriptions']},
  {id: 'skio', name: 'Skio', category: 'Subscriptions', cost: 299, pricingUrl: 'https://skio.com/pricing/', patterns: ['skio-subscription', 'skio.com']},
  {id: 'appstle', name: 'Appstle Subscriptions', category: 'Subscriptions', cost: 49, patterns: ['appstle']},
  {id: 'rebuy', name: 'Rebuy', category: 'Upsell', cost: 249, pricingUrl: 'https://www.rebuyengine.com/pricing', patterns: ['rebuyengine'], hosts: ['cdn.rebuyengine.com']},
  {id: 'zipify', name: 'Zipify OCU', category: 'Upsell', cost: 35, patterns: ['zipify', 'oneclickupsell'], hosts: ['zipifyapps.com']},
  {id: 'bold-upsell', name: 'Bold Upsell', category: 'Upsell', cost: 89, patterns: ['bold-upsell']},
  {id: 'vitals', name: 'Vitals', category: 'Upsell', cost: 30, pricingUrl: 'https://vitals.co/pricing', patterns: ['vitals.co', 'vitals-'], hosts: ['cdn.vitals.co']},
  {id: 'yotpo', name: 'Yotpo', category: 'Reviews', cost: 149, pricingUrl: 'https://www.yotpo.com/pricing/', patterns: ['yotpo-widget', 'yotpo'], hosts: ['staticw2.yotpo.com', 'cdn-loyalty.yotpo.com']},
  {id: 'judgeme', name: 'Judge.me', category: 'Reviews', cost: 15, pricingUrl: 'https://judge.me/pricing', patterns: ['judgeme', 'judge.me'], hosts: ['cdn.judge.me']},
  {id: 'okendo', name: 'Okendo', category: 'Reviews', cost: 99, pricingUrl: 'https://www.okendo.io/pricing/', patterns: ['okendo'], hosts: ['cdn-static.okendo.io']},
  {id: 'loox', name: 'Loox', category: 'Reviews', cost: 35, pricingUrl: 'https://loox.app/pricing', patterns: ['loox-rating', 'loox.io'], hosts: ['loox.io']},
  {id: 'stamped', name: 'Stamped', category: 'Reviews', cost: 99, patterns: ['stamped-reviews', 'stamped-main', 'stamped.io'], hosts: ['cdn-stamped-io.azureedge.net']},
  {id: 'reviewsio', name: 'Reviews.io', category: 'Reviews', cost: 89, patterns: ['widget.reviews.io'], hosts: ['widget.reviews.io']},
  {id: 'fera', name: 'Fera', category: 'Reviews', cost: 39, patterns: ['fera.ai', 'fera-product'], hosts: ['cdn.fera.ai']},
  {id: 'junip', name: 'Junip', category: 'Reviews', cost: 74, patterns: ['juniphq', 'junip'], hosts: ['scripts.juniphq.com']},
  {id: 'loyaltylion', name: 'LoyaltyLion', category: 'Loyalty', cost: 157, pricingUrl: 'https://loyaltylion.com/pricing', patterns: ['loyaltylion'], hosts: ['sdk.loyaltylion.net']},
  {id: 'smile', name: 'Smile.io', category: 'Loyalty', cost: 49, pricingUrl: 'https://smile.io/pricing', patterns: ['smile-ui', 'smile-shopify', 'smile.io'], hosts: ['cdn.smile.io']},
  {id: 'stamped-loyalty', name: 'Stamped Loyalty', category: 'Loyalty', cost: 159, patterns: ['stamped-loyalty', 'stamped rewards']},
  {id: 'yotpo-loyalty', name: 'Yotpo Loyalty', category: 'Loyalty', cost: 199, patterns: ['swell_rewards', 'swellrewards']},
  {id: 'algolia', name: 'Algolia', category: 'Search', cost: 120, pricingUrl: 'https://www.algolia.com/pricing/', patterns: ['algoliasearch', 'algolia.net'], hosts: ['cdn.jsdelivr.net/npm/algoliasearch']},
  {id: 'searchanise', name: 'Searchanise', category: 'Search', cost: 39, patterns: ['searchanise', 'searchserverapi'], hosts: ['searchserverapi.com']},
  {id: 'searchspring', name: 'Searchspring', category: 'Search', cost: 399, patterns: ['searchspring'], hosts: ['cdn.searchspring.net']},
  {id: 'klevu', name: 'Klevu', category: 'Search', cost: 349, patterns: ['klevu'], hosts: ['js.klevu.com']},
  {id: 'triplewhale', name: 'Triple Whale', category: 'Analytics', cost: 129, pricingUrl: 'https://www.triplewhale.com/pricing', patterns: ['triplewhale'], hosts: ['api.config-security.com']},
  {id: 'hotjar', name: 'Hotjar', category: 'Analytics', cost: 80, pricingUrl: 'https://www.hotjar.com/pricing/', patterns: ['hjid', 'hotjar'], hosts: ['static.hotjar.com']},
  {id: 'ga4', name: 'Google Analytics', category: 'Analytics', cost: 0, patterns: ['google-analytics', 'gtag(', 'googletagmanager'], hosts: ['www.googletagmanager.com', 'www.google-analytics.com'], dns: ['google-site-verification']},
  {id: 'luckyorange', name: 'Lucky Orange', category: 'Analytics', cost: 80, patterns: ['luckyorange'], hosts: ['tools.luckyorange.com']},
  {id: 'clarity', name: 'Microsoft Clarity', category: 'Analytics', cost: 0, patterns: ['clarity.ms'], hosts: ['www.clarity.ms']},
  {id: 'posthog', name: 'PostHog', category: 'Analytics', cost: 0, patterns: ['posthog'], hosts: ['app.posthog.com', 'us.i.posthog.com']},
  {id: 'nosto', name: 'Nosto', category: 'Personalization', cost: 180, patterns: ['nostojs', 'nosto'], hosts: ['connect.nosto.com']},
  {id: 'dynamicyield', name: 'Dynamic Yield', category: 'Personalization', cost: 300, patterns: ['dynamicyield', 'dy-api'], hosts: ['cdn.dynamicyield.com']},
  {id: 'replo', name: 'Replo', category: 'Personalization', cost: 99, patterns: ['replo'], hosts: ['assets.replocdn.com']},
  {id: 'shogun', name: 'Shogun', category: 'Personalization', cost: 149, patterns: ['getshogun', 'shogunpage'], hosts: ['lib.getshogun.com']},
  {id: 'gempages', name: 'GemPages', category: 'Personalization', cost: 59, patterns: ['gempages', 'gempage']},
  {id: 'aftership', name: 'AfterShip', category: 'Shipping', cost: 89, patterns: ['aftership'], hosts: ['button.aftership.com']},
  {id: 'shipbob', name: 'ShipBob', category: 'Shipping', cost: 150, patterns: ['shipbob']},
  {id: 'route', name: 'Route', category: 'Shipping', cost: 120, patterns: ['routeapp', 'route-widget'], hosts: ['cdn.routeapp.io']},
  {id: 'paypal', name: 'PayPal', category: 'Payments', cost: 0, note: 'Transaction-fee based; no fixed monthly app cost.', patterns: ['paypalobjects'], hosts: ['www.paypalobjects.com']},
  {id: 'shop-pay', name: 'Shop Pay', category: 'Payments', cost: 0, patterns: ['shop-pay', 'shopify_pay', 'shop.app']},
  {id: 'shopify-forms', name: 'Shopify Forms', category: 'Forms', cost: 0, patterns: ['shopify-forms', 'shopify_form']},
  {id: 'typeform', name: 'Typeform', category: 'Forms', cost: 59, patterns: ['typeform'], hosts: ['embed.typeform.com']},
  {id: 'tally', name: 'Tally', category: 'Forms', cost: 29, patterns: ['tally.so', 'tally-embed'], hosts: ['tally.so']},
  {id: 'octane', name: 'Octane AI', category: 'Quiz', cost: 200, patterns: ['octaneai', 'octane.ai'], hosts: ['app.octaneai.com']},
  {id: 'revenuehunt', name: 'RevenueHunt', category: 'Quiz', cost: 69, patterns: ['revenuehunt', 'product-recommendation-quiz'], hosts: ['static.revenuehunt.com']},
  {id: 'referralcandy', name: 'ReferralCandy', category: 'Referral', cost: 59, patterns: ['referralcandy'], hosts: ['portal.referralcandy.com']},
  {id: 'socialsnowball', name: 'Social Snowball', category: 'Referral', cost: 99, patterns: ['socialsnowball', 'social-snowball']},
  {id: 'uppromote', name: 'UpPromote', category: 'Referral', cost: 89, patterns: ['uppromote', 'secomapp'], hosts: ['cdn.secomapp.com']},
  {id: 'intelligems', name: 'Intelligems', category: 'Testing', cost: 99, patterns: ['intelligems'], hosts: ['cdn.intelligems.io']},
  {id: 'convert', name: 'Convert', category: 'Testing', cost: 199, patterns: ['convertexperiments'], hosts: ['cdn-4.convertexperiments.com']},
  {id: 'vwo', name: 'VWO', category: 'Testing', cost: 199, patterns: ['visualwebsiteoptimizer'], hosts: ['dev.visualwebsiteoptimizer.com']}
];

module.exports = {RULES_VERSION, categoryRules, appSignatures};
