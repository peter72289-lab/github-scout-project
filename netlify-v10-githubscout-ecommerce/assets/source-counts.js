// Fills every [data-source-count] element from the live catalog so a page can
// never drift from lib/adapters.js. The static text already in the element is
// the honest no-JS fallback; preflight asserts it matches the catalog, so a
// failed fetch leaves a correct page rather than a blank one.
(function () {
  'use strict';
  var nodes = document.querySelectorAll('[data-source-count]');
  if (!nodes.length) return;
  fetch('/.netlify/functions/sources', {headers: {Accept: 'application/json'}})
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.ok) return;
      for (var i = 0; i < nodes.length; i++) {
        var key = nodes[i].getAttribute('data-source-count');
        if (typeof data[key] === 'number') nodes[i].textContent = String(data[key]);
      }
    })
    .catch(function () { /* keep the static fallback */ });
})();
