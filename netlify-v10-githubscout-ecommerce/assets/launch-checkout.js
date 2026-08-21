(function () {
  function checkoutUrl(plan) {
    const config = window.GITHUB_SCOUT_LAUNCH_CONFIG || {};
    const rawUrl = plan === 'operator' ? config.operatorCheckoutUrl : config.directorCheckoutUrl;
    if (!rawUrl) return '';

    const link = new URL(rawUrl, window.location.href);
    const currentParams = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
      const value = currentParams.get(key) || sessionStorage.getItem(key);
      if (value) link.searchParams.set(key, value);
    });
    return link.toString();
  }

  window.githubScoutCheckoutUrl = checkoutUrl;
  window.githubScoutOpenCheckout = function (plan) {
    const url = checkoutUrl(plan);
    if (!url) return false;
    window.githubScoutTrack?.(`${plan}_checkout_opened`, {href: url});
    window.open(url, '_blank', 'noopener');
    return true;
  };

  function wireCheckoutLinks() {
    document.querySelectorAll('[data-checkout-plan]').forEach((link) => {
      const plan = link.getAttribute('data-checkout-plan');
      const url = checkoutUrl(plan);
      if (url && link.tagName === 'A') {
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
      }
      link.addEventListener('click', (event) => {
        window.githubScoutTrack?.(`${plan}_checkout_clicked`, {href: link.href || url});
        if (url && link.tagName !== 'A') {
          event.preventDefault();
          window.open(url, '_blank', 'noopener');
        }
      });
    });
  }

  // Stripe Customer Portal. Same gate-on-config rule as the checkout CTAs: with
  // no URL configured the control is removed, never left pointing nowhere. A
  // cancel link that 404s is worse than no link — California's ARL requires the
  // online cancel path to actually work. [data-portal-missing] elements say what
  // to do instead, and are removed once the URL is set.
  function wirePortalLinks() {
    const url = (window.GITHUB_SCOUT_LAUNCH_CONFIG || {}).stripeCustomerPortalUrl || '';
    document.querySelectorAll('[data-portal-link]').forEach((el) => {
      if (!url) { el.remove(); return; }
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener';
      el.hidden = false;
      el.addEventListener('click', () => window.githubScoutTrack?.('customer_portal_opened', {href: url}));
    });
    document.querySelectorAll('[data-portal-missing]').forEach((el) => {
      if (url) el.remove(); else el.hidden = false;
    });
  }

  function wire() {
    wireCheckoutLinks();
    wirePortalLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
