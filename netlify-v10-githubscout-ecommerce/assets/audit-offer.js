// The one-time reviewed audit. Both values stay null until the owner sets a
// price and creates a one-time Stripe Payment Link (TASKS_FOR_USER.md item 11).
// While they are null the pages say the price is confirmed by email before any
// payment and route the button to the intake form, so no page shows a made-up
// price or a dead checkout. This is separate from the subscription switch
// (`fulfillmentReady` in launch-config.js); the audit is fulfilled by hand.
window.AUDIT_OFFER = {
  price: null,
  paymentLink: null,
}

;(function () {
  'use strict'
  var offer = window.AUDIT_OFFER
  var params = new URLSearchParams(location.search)
  var store = params.get('store') || ''

  document.querySelectorAll('[data-audit-price]').forEach(function (node) {
    node.textContent = offer.price
      ? offer.price + ', one time. No subscription.'
      : 'One time, no subscription. We confirm the price with you by email before you pay anything.'
  })

  document.querySelectorAll('[data-audit-cta]').forEach(function (a) {
    if (offer.paymentLink) {
      a.href = offer.paymentLink
      a.textContent = a.getAttribute('data-buy-label') || 'Get my audit'
    } else {
      a.href = 'audit-intake.html' + (store ? '?store=' + encodeURIComponent(store) : '')
    }
  })

  document.querySelectorAll('input[name="store_url"]').forEach(function (input) {
    if (store && !input.value) input.value = store
  })
})()
