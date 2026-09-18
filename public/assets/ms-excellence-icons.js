/**
 * ms-excellence-icons.js — scroll-triggered entrance for the three icons in the
 * home page "Delivering AI Excellence" cards:
 *   Advanced LLM Integration (Document.png) · Agentic Automation (Activity.png)
 *   · Enterprise-Grade Security (Shield.png)
 *
 * Each `.ms-excellence-ico` box gets `ms-x-entered` added EVERY time it scrolls
 * into view (and removed while out of view), so the pop-in entrance replays on
 * scroll up/down — mirroring ms-icon-entrance.js / ms-count-up.js / ms-typing.js.
 *
 * The stagger between the three icons and the endless idle loops that follow
 * the entrance are pure CSS (public/assets/inline-head.css). The idle loops run
 * on the inner <img> while the entrance runs on the box, so the two never fight
 * over `transform`.
 */
(function () {
  'use strict';

  function init() {
    var boxes = document.querySelectorAll('.ms-excellence-ico');
    if (!boxes.length) return;

    var reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion, or no IntersectionObserver: reveal once and leave the
    // icons alone (CSS also neutralises every animation under reduce).
    if (reduceMotion || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(boxes, function (box) {
        box.classList.add('ms-x-entered');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ms-x-entered');
        } else {
          entry.target.classList.remove('ms-x-entered');
        }
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -60px 0px' });

    Array.prototype.forEach.call(boxes, function (box) { io.observe(box); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();