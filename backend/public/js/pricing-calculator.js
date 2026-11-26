(function (root) {
  'use strict';
  // price = (cost + packaging + shipping + desired profit + fixed fee) / (1 - percentage fee)
  function calc(v) {
    var n = function (x) { var t = String(x == null ? '' : x).trim(); if (t === '') return NaN; return Number(t); };
    var cost = n(v.cost), pack = n(v.pack), ship = n(v.ship), desired = n(v.desired), fee = n(v.fee), fixed = n(v.fixed);
    var all = [cost, pack, ship, desired, fee, fixed];
    for (var i = 0; i < all.length; i++) if (!isFinite(all[i]) || all[i] < 0) return { error: 'Enter numbers of zero or more in every field.' };
    if (fee >= 100) return { error: 'The percentage fee must be below 100.' };
    var price = Math.ceil(((cost + pack + ship + desired + fixed) / (1 - fee / 100)) * 100 - 1e-9) / 100;
    var base = cost + pack + ship;
    var fees = Math.round((price * fee / 100 + fixed) * 100) / 100;
    var profit = Math.round((price - base - fees) * 100) / 100;
    return { price: price, fees: fees, profit: profit, margin: price > 0 ? profit / price * 100 : 0, markup: base > 0 ? profit / base * 100 : null };
  }
  root.sbccPricing = { calc: calc };
  if (typeof document === 'undefined') return;
  function run() {
    var ids = { cost: 'c-cost', pack: 'c-pack', ship: 'c-ship', desired: 'c-desired', fee: 'c-fee', fixed: 'c-fixed' };
    var form = document.getElementById('pricing-form');
    if (!form) return;
    var values = function () { var o = {}; for (var k in ids) o[k] = document.getElementById(ids[k]).value; return o; };
    var set = function (id, t) { document.getElementById(id).textContent = t; };
    var update = function () {
      var r = calc(values());
      document.getElementById('c-error').textContent = r.error || '';
      if (r.error) return;
      set('r-price', r.price.toFixed(2)); set('r-fees', r.fees.toFixed(2)); set('r-profit', r.profit.toFixed(2));
      set('r-margin', r.margin.toFixed(1) + '%'); set('r-markup', r.markup === null ? 'n/a' : r.markup.toFixed(1) + '%');
    };
    form.addEventListener('input', update); form.addEventListener('submit', function (e) { e.preventDefault(); update(); });
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})(typeof window !== 'undefined' ? window : globalThis);
