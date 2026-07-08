// Copy to launch-config.js and fill in. Do NOT commit the filled version.
window.GITHUB_SCOUT_LAUNCH_CONFIG = {
  operatorCheckoutUrl: '<STRIPE_OPERATOR_PAYMENT_LINK>',
  directorCheckoutUrl: '<STRIPE_DIRECTOR_PAYMENT_LINK>',
  operatorAnnualCheckoutUrl: '',
  directorAnnualCheckoutUrl: '',
  pricing: { operatorMonthly: 17, directorMonthly: 37, annualMonthsCharged: 10 },
  agencyContactUrl: 'agency-pricing.html',
  metaPixelId: '',
  analyticsEnabled: true
};
window.GITHUB_SCOUT_ANNUAL_ENABLED = Boolean(
  window.GITHUB_SCOUT_LAUNCH_CONFIG.operatorAnnualCheckoutUrl &&
  window.GITHUB_SCOUT_LAUNCH_CONFIG.directorAnnualCheckoutUrl
);
