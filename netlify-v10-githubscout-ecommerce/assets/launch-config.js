// Checkout + plan config. Payment URLs should be injected at deploy time or
// kept out of a public repo (see LAUNCH-CHECKLIST). Annual options activate the
// pricing toggle automatically when their URLs are filled in.
window.GITHUB_SCOUT_LAUNCH_CONFIG = {
  operatorCheckoutUrl: 'https://buy.stripe.com/5kQ8wO0H268D5Hqh2zcQU00',
  directorCheckoutUrl: 'https://buy.stripe.com/dRm28q61m2Wrd9SfYvcQU01',
  // Fill these with annual Stripe payment links to enable the annual toggle.
  operatorAnnualCheckoutUrl: '',
  directorAnnualCheckoutUrl: '',
  // Monthly prices (used to compute the annual saving badge).
  pricing: {
    operatorMonthly: 17,
    directorMonthly: 37,
    // Months charged on the annual plan (10 = two months free).
    annualMonthsCharged: 10
  },
  agencyContactUrl: 'agency-pricing.html',
  // Stripe Customer Portal login link (Stripe Dashboard -> Settings -> Billing
  // -> Customer portal -> "Create a login link"). Empty until the owner creates
  // it; every [data-portal-link] control stays out of the DOM while it is empty
  // rather than shipping a dead cancel link.
  stripeCustomerPortalUrl: '',
  metaPixelId: '',
  analyticsEnabled: true
};
window.GITHUB_SCOUT_ANNUAL_ENABLED = Boolean(
  window.GITHUB_SCOUT_LAUNCH_CONFIG.operatorAnnualCheckoutUrl &&
  window.GITHUB_SCOUT_LAUNCH_CONFIG.directorAnnualCheckoutUrl
);
