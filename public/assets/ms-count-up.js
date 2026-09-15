/**
 * ms-count-up.js — scroll-triggered number count-up.
 *
 * Any element with class "ms-count-up" whose text is (or contains a leading)
 * formatted number — e.g. "$12,875", "10%", "64.3", "$21.490" — counts up
 * from zero EVERY time it scrolls into view, and resets while it is out of
 * view, so scrolling up and down through the section re-runs the animation.
 */
(function () {
  'use strict';

  var DURATION = 1800; // ms

  function parseFinal(text) {
    var m = text.match(/^([^\d]*)([\d.,]+)([\s\S]*)$/);
    if (!m) return null;
    var prefix = m[1], numStr = m[2], suffix = m[3];
    var gm = numStr.match(/^(\d{1,3})([.,])(\d{3}(?:[.,]\d{3})*)(?:([.,]\d+))?$/);
    if (gm) {
      var decPart = gm[4] ? gm[4].slice(1) : '';
      return {
        prefix: prefix, suffix: suffix, group: gm[2],
        value: parseInt(gm[1] + gm[3].replace(/[.,]/g, ''), 10),
        decimals: decPart.length, decSep: gm[4] ? gm[4][0] : ''
      };
    }
    var dm = numStr.match(/^(\d+)([.,])(\d{1,2})$/);
    if (dm) {
      return {
        prefix: prefix, suffix: suffix, group: null,
        value: parseInt(dm[1] + dm[3], 10) / Math.pow(10, dm[3].length),
        decimals: dm[3].length, decSep: dm[2]
      };
    }
    if (/^\d+$/.test(numStr)) {
      return { prefix: prefix, suffix: suffix, group: null, value: parseInt(numStr, 10), decimals: 0, decSep: '' };
    }
    return null;
  }

  function format(info, n) {
    var fixed = n.toFixed(info.decimals);
    var parts = fixed.split('.');
    var intPart = parts[0];
    if (info.group) {
      intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, info.group);
    }
    return info.prefix + intPart + (info.decimals ? info.decSep + parts[1] : '') + info.suffix;
  }

  function animate(el) {
    var info = el._msInfo;
    if (el._msRaf) cancelAnimationFrame(el._msRaf);
    var start = null;
    el.textContent = format(info, 0);
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = format(info, info.value * eased);
      if (p < 1) {
        el._msRaf = requestAnimationFrame(step);
      } else {
        el._msRaf = null;
      }
    }
    el._msRaf = requestAnimationFrame(step);
  }

  function reset(el) {
    if (el._msRaf) { cancelAnimationFrame(el._msRaf); el._msRaf = null; }
    el.textContent = format(el._msInfo, 0);
  }

  function init() {
    var els = document.querySelectorAll('.ms-count-up');
    if (!els.length) return;

    els.forEach(function (el) {
      el._msInfo = parseFinal((el.textContent || '').trim());
    });
    var animatable = Array.prototype.filter.call(els, function (el) { return el._msInfo; });

    if (!('IntersectionObserver' in window)) return; // leave final values as-is

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
        } else {
          reset(entry.target);
        }
      });
    }, { threshold: 0.5 });

    animatable.forEach(function (el) { io.observe(el); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
