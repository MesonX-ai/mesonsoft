/**
 * Mesonsoft — scroll-reveal transitions for the cards in the
 * "Commitment to Excellence" section (home page).
 *
 * The cards transition IN as the user scrolls TO the section and
 * transition OUT as they scroll AWAY from it. This script toggles
 * `.meso-in-view` on the `.meso-scroll-reveal` section while the
 * CSS in inline-head.css handles the actual fading/rising.
 *
 * It is gated on `html.meso-js` (added below) so the styles only
 * hide the cards when JS actually ran — without JS (or without
 * IntersectionObserver) the cards simply stay visible.
 */
(function () {
  'use strict';

  function init() {
    var section = document.querySelector('.meso-scroll-reveal');
    if (!section) return;

    var cards = section.querySelectorAll(
      '.elementor-element-2c2fab3, .elementor-element-30943bd, .elementor-element-29c391f'
    );
    if (!cards.length) return;

    // Signal that JS is running so the reveal CSS becomes active.
    document.documentElement.classList.add('meso-js');

    function setInView(inView) {
      section.classList.toggle('meso-in-view', !!inView);
    }

    if ('IntersectionObserver' in window) {
      // +200px root margin below the viewport lets the cards begin their
      // transition a moment before the section actually scrolls on screen.
      var observer = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            setInView(entries[i].isIntersecting);
          }
        },
        { rootMargin: '0px 0px 200px 0px', threshold: 0 }
      );
      observer.observe(section);
    } else {
      // No IntersectionObserver support: keep the cards visible.
      setInView(true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();