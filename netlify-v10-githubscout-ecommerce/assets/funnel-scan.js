// Free store check for the conversational funnel pages.
// Posts to the existing scan function and renders the result in plain words.
// Every figure shown comes from the engine response (or, when a visitor asks
// for it, from assets/funnel-example.js, which the engine generated and which
// is labelled as an example). Nothing here invents a number.
;(function () {
  'use strict'

  var PLAIN_CATEGORY = {
    'Email/SMS': 'email and text marketing',
    Support: 'customer chat and help desk',
    Subscriptions: 'subscriptions',
    Upsell: 'upsells and bundles',
    Reviews: 'product reviews',
    Loyalty: 'loyalty and rewards',
    Search: 'site search',
    Analytics: 'analytics and tracking',
    Personalization: 'personalization',
    Shipping: 'shipping and delivery',
    Payments: 'payments',
    Forms: 'forms and popups',
    Quiz: 'product quizzes',
    Referral: 'referrals',
    Testing: 'A/B testing',
  }

  var SURE = {
    detected: { text: 'Clearly running', cls: 'sure' },
    likely: { text: 'Probably running', cls: 'sure maybe' },
    possible: { text: 'Possibly running', cls: 'sure maybe' },
  }

  var ICON_OF = {
    'Email/SMS': 'i-mail',
    Support: 'i-chat',
    Subscriptions: 'i-refresh',
    Upsell: 'i-cart',
    Reviews: 'i-star',
    Loyalty: 'i-gift',
    Search: 'i-search',
    Analytics: 'i-chart',
    Personalization: 'i-sparkle',
    Shipping: 'i-truck',
    Payments: 'i-coins',
    Forms: 'i-popup',
    Quiz: 'i-list',
    Referral: 'i-users',
    Testing: 'i-sliders',
  }

  var SPRITE = 'assets/funnel-icons.svg#'

  function icon(id) {
    var ns = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('class', 'ic')
    svg.setAttribute('aria-hidden', 'true')
    var use = document.createElementNS(ns, 'use')
    use.setAttribute('href', SPRITE + id)
    svg.appendChild(use)
    return svg
  }

  function alertBox(iconId, title, body) {
    return el('div', { cls: 'alert' }, [
      icon(iconId),
      el('div', {}, [el('strong', { text: title }), body]),
    ])
  }

  function plain(category) {
    return PLAIN_CATEGORY[category] || String(category || 'other').toLowerCase()
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag)
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k]
      else if (k === 'cls') node.className = attrs[k]
      else node.setAttribute(k, attrs[k])
    })
    ;(children || []).forEach(function (c) {
      if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
    })
    return node
  }

  function normalise(raw) {
    var v = String(raw || '').trim()
    if (!v) return ''
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v
    return v
  }

  function auditLink(storeUrl, label) {
    var href = 'reviewed-audit.html' + (storeUrl ? '?store=' + encodeURIComponent(storeUrl) : '')
    return el('a', { cls: 'btn', href: href, text: label || 'Get the reviewed audit' })
  }

  function renderLoading(box, url) {
    box.hidden = false
    box.textContent = ''
    box.appendChild(
      el('div', { cls: 'panel' }, [
        el('p', { cls: 'status' }, [
          el('span', { cls: 'spinner' }),
          'Looking at ' + url.replace(/^https?:\/\//, '') + '. This usually takes under a minute.',
        ]),
      ]),
    )
  }

  function renderError(box, message, opts) {
    box.textContent = ''
    var tryExample = el('button', {
      cls: 'btn ghost',
      type: 'button',
      text: 'Show me an example result',
    })
    tryExample.addEventListener('click', function () {
      if (window.FUNNEL_EXAMPLE)
        render(
          box,
          window.FUNNEL_EXAMPLE,
          '',
          Object.assign({}, opts, { example: true, onResult: null }),
        )
    })
    box.appendChild(
      el('div', { cls: 'panel' }, [
        alertBox(
          'i-clock',
          'We could not run the check just now.',
          message || 'Please try again in a minute.',
        ),
        window.FUNNEL_EXAMPLE ? tryExample : null,
      ]),
    )
  }

  function render(box, report, storeUrl, opts) {
    opts = opts || {}
    box.hidden = false
    box.textContent = ''
    var panel = el('div', { cls: 'panel' })
    box.appendChild(panel)

    if (opts.example)
      panel.appendChild(el('span', { cls: 'tag', text: 'Example store, not yours' }))

    var crawl = report.crawl || {}
    var summary = report.summary || {}
    var apps = report.detectedApps || []
    var overlaps = report.overlaps || []
    var hidden = (report.teaser && report.teaser.hiddenApps) || 0

    if (crawl.blocked) {
      panel.appendChild(
        alertBox(
          'i-shield',
          'Your store’s security stopped us from looking.',
          'That is common on bigger stores, and it says nothing bad about yours. It just means an outside check cannot see your apps. The reviewed audit works from your own app list instead.',
        ),
      )
      if (!opts.noOffer)
        panel.appendChild(
          el('div', { cls: 'next' }, [auditLink(storeUrl, 'Audit it from my app list')]),
        )
      return done(report, opts)
    }

    if (!crawl.ok || !(crawl.pagesFetched || []).length) {
      panel.appendChild(
        alertBox(
          'i-store',
          'We could not reach that store.',
          'Check the address and try again. Nothing is estimated from a check that did not run.',
        ),
      )
      return done(report, opts)
    }

    if (crawl.shopifyConfirmed === false && !apps.length) {
      panel.appendChild(
        alertBox(
          'i-store',
          'This does not look like a Shopify store.',
          'GitHub Scout only checks Shopify stores for now.',
        ),
      )
      return done(report, opts)
    }

    if (!apps.length) {
      panel.appendChild(el('h3', { text: 'We did not spot any paid apps from the outside.' }))
      panel.appendChild(
        el('p', {
          text: 'That can mean a lean store, or apps that only run behind the scenes where an outside check cannot see. Your full list lives in Shopify admin, under Settings, then Apps and sales channels. If that list is short, you probably do not need an audit.',
        }),
      )
      return done(report, opts)
    }

    var total = summary.detectedCount || apps.length
    panel.appendChild(
      el('h3', {
        text:
          'We spotted ' +
          total +
          ' app' +
          (total === 1 ? '' : 's') +
          ' running on ' +
          (opts.example ? 'this store' : 'your store') +
          '.',
      }),
    )

    overlaps.forEach(function (o) {
      var count = typeof o.apps === 'number' ? o.apps : (o.apps || []).length
      panel.appendChild(
        alertBox(
          'i-copy',
          'You may be paying twice for ' + plain(o.category) + '.',
          'We found ' + count + ' tools doing that one job. Usually one is enough.',
        ),
      )
    })

    var overlapCats = overlaps.map(function (o) {
      return o.category
    })
    var list = el('ul', { cls: 'apps' })
    apps.forEach(function (a) {
      var sure = SURE[a.strength] || SURE.possible
      list.appendChild(
        el('li', {}, [
          el('span', { cls: 'ic-badge' + (overlapCats.indexOf(a.category) > -1 ? ' coral' : '') }, [
            icon(ICON_OF[a.category] || 'i-sparkle'),
          ]),
          el('div', { cls: 'name' }, [
            el('b', { text: a.name }),
            el('div', { cls: 'what', text: 'For ' + plain(a.category) }),
          ]),
          el('span', { cls: sure.cls, text: sure.text }),
        ]),
      )
    })
    panel.appendChild(list)

    if (hidden > 0) {
      panel.appendChild(
        el('p', {
          cls: 'fineprint',
          text:
            'Plus ' + hidden + ' more. The reviewed audit lists every one, with how we spotted it.',
        }),
      )
    }

    if (summary.monthlySavings) {
      panel.appendChild(
        el('div', { cls: 'estimate' }, [
          el('span', { cls: 'eyebrow', text: 'Possible savings, estimated' }),
          el('b', { text: summary.monthlySavings }),
          el('p', {
            text: 'Based on public list prices for the paid apps we spotted, not your actual bills. Results vary. Your real numbers come from your own app list.',
          }),
        ]),
      )
    }

    var nextText = overlaps.length
      ? 'Want to know which one to cut, and what to do first? We check this against your real app list and send you a plain-English plan.'
      : 'Want a second pair of eyes on the whole list, including the apps we cannot see from outside? We check your real app list and send you a plain-English plan.'
    // Pages that place their own offer (the quiz result) pass noOffer.
    if (!opts.noOffer)
      panel.appendChild(
        el('div', { cls: 'next' }, [el('p', { text: nextText }), auditLink(storeUrl)]),
      )

    return done(report, opts)
  }

  function done(report, opts) {
    if (typeof opts.onResult === 'function') opts.onResult(report, opts)
    return report
  }

  function run(rawUrl, box, opts) {
    var url = normalise(rawUrl)
    if (!url) return Promise.resolve(null)
    renderLoading(box, url)
    var body = new URLSearchParams({
      store_url: url,
      intent: 'analyze',
      landing_page: location.pathname,
      referrer: document.referrer || '',
    }).toString()
    return fetch('/.netlify/functions/operator-url-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    })
      .then(function (res) {
        return res.json().then(function (payload) {
          if (!res.ok || !payload.ok)
            throw new Error(payload.error || 'The check returned an error.')
          return render(box, payload.analysis || {}, url, opts)
        })
      })
      .catch(function (err) {
        var msg =
          err && err.message && !/fetch|network|json|unexpected/i.test(err.message)
            ? err.message
            : 'The checker is not reachable from here.'
        renderError(box, msg, opts)
        return null
      })
  }

  function bind(form) {
    var box = document.getElementById(form.getAttribute('data-scan'))
    var input = form.querySelector('input')
    var button = form.querySelector('button')
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      if (!input.value.trim()) {
        input.focus()
        return
      }
      button.disabled = true
      run(input.value, box, { noOffer: form.hasAttribute('data-no-offer') }).then(function () {
        button.disabled = false
      })
    })
  }

  document.querySelectorAll('form[data-scan]').forEach(bind)
  document.querySelectorAll('[data-show-example]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var box = document.getElementById(a.getAttribute('data-show-example'))
      if (!box || !window.FUNNEL_EXAMPLE) return
      e.preventDefault()
      render(box, window.FUNNEL_EXAMPLE, '', { example: true })
      box.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })

  window.FunnelScan = { run: run, render: render, plain: plain }
})()
