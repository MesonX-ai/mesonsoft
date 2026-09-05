/**
 * Mesonsoft — scroll-reveal transitions for the cards in the
 * "Commitment to Excellence" section (home page).
 *
 * The cards fade in and move up when scrolled into view, and fade out
 * and move down when scrolled out of view. This matches the behavior
 * of the Innovative AI Solutions cards (which use the original Auxin
 * appear animations).
 *
 * Uses the Auxin `appearl` plugin which fires "appear" and "disappear"
 * events based on viewport visibility.
 */
/**
 * Mesonsoft — scroll-reveal transitions for the cards in the
 * "Commitment to Excellence" section (home page).
 *
 * The cards fade in and move up when scrolled into view, and fade out
 * and move down when scrolled out of view. This matches the entrance
 * animation style of the Innovative AI Solutions cards (which use the
 * original Auxin `aux-appear-watch-animation` animations).
 *
 * Uses IntersectionObserver to toggle the `aux-animated` /
 * `aux-animated-once` classes that trigger the Auxin entrance
 * animations.
 */
(function () {
  'use strict';

  function init() {
    var cards = document.querySelectorAll(
      '.elementor-element-2c2fab3, .elementor-element-30943bd, .elementor-element-29c391f'
    );
    if (!cards.length) return;

    function setInView(card, inView) {
      if (inView) {
        card.classList.add('aux-animated');
        card.classList.add('aux-animated-once');
      } else {
        card.classList.remove('aux-animated');
        card.classList.remove('aux-animated-once');
      }
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            setInView(entries[i].target, entries[i].isIntersecting);
          }
        },
        { rootMargin: '0px 0px 200px 0px', threshold: 0 }
      );

      for (var i = 0; i < cards.length; i++) {
        observer.observe(cards[i]);
      }
    } else {
      // No IntersectionObserver: keep cards visible
      for (var i = 0; i < cards.length; i++) {
        setInView(cards[i], true);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

