(function () {
  const config = window.GITHUB_SCOUT_LAUNCH_CONFIG || {};
  const eventKey = 'githubscout_launch_events';

  function record(name, detail) {
    // First-party, functional event log (no third parties). Kept for the operator.
    try {
      const events = JSON.parse(localStorage.getItem(eventKey) || '[]');
      events.unshift({name, detail: detail || {}, path: location.pathname, search: location.search, at: new Date().toISOString()});
      localStorage.setItem(eventKey, JSON.stringify(events.slice(0, 100)));
    } catch (error) {}
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', name, detail || {});
    }
  }
  window.githubScoutTrack = record;

  // Meta pixel is a third-party tracker: it ONLY loads after explicit consent.
  // consent.js calls this once the visitor opts in (or if prior consent stored).
  let pixelLoaded = false;
  window.githubScoutInitPixel = function () {
    if (pixelLoaded || !config.metaPixelId) return;
    pixelLoaded = true;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', config.metaPixelId);
    window.fbq('track', 'PageView');
  };

  record('page_view', {title: document.title});
})();
