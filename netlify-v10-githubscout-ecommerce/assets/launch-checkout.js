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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireCheckoutLinks);
  } else {
    wireCheckoutLinks();
  }
})();
