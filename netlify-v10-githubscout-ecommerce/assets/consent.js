(function () {
  // Lightweight consent gate for the Meta pixel (the only third-party tracker).
  // Functional first-party storage (session cookie, event log) is exempt.
  var KEY = 'githubscout_consent'; // 'granted' | 'denied'
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}

  function apply(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    if (v === 'granted' && typeof window.githubScoutInitPixel === 'function') {
      window.githubScoutInitPixel();
    }
  }

  if (stored === 'granted') { apply('granted'); return; }
  if (stored === 'denied') { return; }

  function banner() {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:720px;margin:0 auto;background:#15181d;color:#e8e6e1;border:1px solid #3a3f47;border-radius:12px;padding:16px 18px;font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.4)';
    bar.innerHTML = '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:space-between">' +
      '<span style="flex:1;min-width:220px">We use a first-party cookie to keep you signed in. With your consent we also load the Meta pixel to measure ads. <a href="/privacy.html" style="color:#f5b642">Privacy</a>.</span>' +
      '<span style="display:flex;gap:8px">' +
      '<button id="gs-consent-no" style="background:#1a1e25;color:#e8e6e1;border:1px solid #3a3f47;border-radius:8px;padding:9px 14px;cursor:pointer">Decline</button>' +
      '<button id="gs-consent-yes" style="background:#f5b642;color:#151004;border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer">Accept</button>' +
      '</span></div>';
    document.body.appendChild(bar);
    document.getElementById('gs-consent-yes').onclick = function () { apply('granted'); bar.remove(); };
    document.getElementById('gs-consent-no').onclick = function () { apply('denied'); bar.remove(); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', banner);
  else banner();
})();
