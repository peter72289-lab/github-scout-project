// Copy to launch-config.js and fill in. Do NOT commit the filled version.
window.GITHUB_SCOUT_LAUNCH_CONFIG = {
  // MASTER SWITCH. False = no page can charge a card, whatever the URLs below
  // say. Flip to true only when /.netlify/functions/health reports
  // productionReady: true on the deployed site AND a test-mode purchase has
  // been observed provisioning an account and sending the sign-in email.
  // See TASKS_FOR_USER.md and netlify-v10-githubscout-ecommerce/SETUP.md.
  fulfillmentReady: false,
  operatorCheckoutUrl: '<STRIPE_OPERATOR_PAYMENT_LINK>',
  directorCheckoutUrl: '<STRIPE_DIRECTOR_PAYMENT_LINK>',
  operatorAnnualCheckoutUrl: '',
  directorAnnualCheckoutUrl: '',
  pricing: { operatorMonthly: 17, directorMonthly: 37, annualMonthsCharged: 10 },
  // Stripe Dashboard -> Settings -> Billing -> Customer portal -> login link.
  stripeCustomerPortalUrl: '',
  agencyContactUrl: 'agency-pricing.html',
  metaPixelId: '',
  analyticsEnabled: true
};
window.GITHUB_SCOUT_ANNUAL_ENABLED = Boolean(
  window.GITHUB_SCOUT_LAUNCH_CONFIG.operatorAnnualCheckoutUrl &&
  window.GITHUB_SCOUT_LAUNCH_CONFIG.directorAnnualCheckoutUrl
);
