/**
 * ms-icon-entrance.js — scroll-triggered entrance for product-page icon-list icons.
 *
 * Each `.aux-icon-list-item` containing an `.aux-icon-list-icon.ms-icon` SVG
 * gets `ms-icon-entered` added EVERY time it scrolls into view (and removed
 * while out of view), so the pop-in entrance replays on scroll up/down —
 * mirroring the behaviour of ms-count-up.js / ms-typing.js.
 * Stagger between sibling items is handled purely in CSS.
 */
(function () {
  'use strict';

  function init() {
    var items = document.querySelectorAll('.aux-icon-list-item .aux-icon-list-icon.ms-icon');
    if (!items.length) return;

    var lis = Array.prototype.map.call(items, function (svg) {
      return svg.closest('.aux-icon-list-item');
    }).filter(function (li, i, arr) {
      return li && arr.indexOf(li) === i;
    });
    if (!lis.length) return;

    if (!('IntersectionObserver' in window)) {
      lis.forEach(function (li) { li.classList.add('ms-icon-entered'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ms-icon-entered');
        } else {
          entry.target.classList.remove('ms-icon-entered');
        }
      });
    }, { threshold: 0.4 });

    lis.forEach(function (li) { io.observe(li); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
