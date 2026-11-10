// "Your numbers" calculator on the funnel pages. Every input is the visitor's
// own figure and every output is plain arithmetic on those inputs, so nothing
// here is an estimate from us. Sliders start at zero and the result says it is
// empty until the visitor sets them (CLAUDE.md: no placeholder numbers).
;(function () {
  'use strict'

  var money = function (n) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(n)
    } catch (e) {
      return '$' + Math.round(n)
    }
  }

  function bind(root) {
    var input = function (k) {
      return root.querySelector('[data-in="' + k + '"]')
    }
    var label = function (k) {
      return root.querySelector('[data-v="' + k + '"]')
    }
    var out = function (k) {
      return root.querySelector('[data-o="' + k + '"]')
    }
    var bill = input('bill')
    var apps = input('apps')
    var cut = input('cut')

    function update() {
      var b = Number(bill.value)
      var a = Number(apps.value)
      cut.max = String(Math.max(a, 0))
      if (Number(cut.value) > a) cut.value = String(a)
      var c = Number(cut.value)

      label('bill').textContent = b ? money(b) + '/mo' : 'Not set'
      label('apps').textContent = a ? String(a) : 'Not set'
      label('cut').textContent = a ? c + ' of ' + a : 'Set your app count first'

      if (!b || !a) {
        out('year').textContent = '—'
        out('msg').textContent =
          'Drag the sliders to match your store. Nothing is filled in for you.'
        out('bar').style.width = '0%'
        out('avg').textContent = '—'
        out('cutyear').textContent = '—'
        out('left').textContent = '—'
        return
      }

      var avg = b / a
      var cutYear = avg * c * 12
      out('year').textContent = money(b * 12)
      out('avg').textContent = money(avg) + '/mo'
      out('cutyear').textContent = c ? money(cutYear) + '/yr' : '—'
      out('left').textContent = money(b * 12 - cutYear) + '/yr'
      out('bar').style.width = Math.round((c / a) * 100) + '%'
      out('msg').textContent = c
        ? 'If the ' +
          (c === 1 ? 'app you would cut costs' : c + ' apps you would cut cost') +
          ' about the average, that is ' +
          money(cutYear) +
          ' a year back. Your real apps will cost more or less than the average; the audit uses your actual bills.'
        : 'Now set how many apps you suspect you could do without.'
    }

    ;[bill, apps, cut].forEach(function (el) {
      el.addEventListener('input', update)
    })
    update()
  }

  document.querySelectorAll('[data-calc]').forEach(bind)
})()
