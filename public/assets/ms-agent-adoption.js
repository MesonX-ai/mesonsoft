/**
 * ms-agent-adoption.js — auto-cycling "Enterprise adoption journey" stepper
 * for the Agentic AI page (replicates the sQuark.ai /agentic-ai adoption
 * section on the Mesonsoft theme).
 *
 * Markup contract (see src/partials/agentic-ai.html):
 *   .ms-ag-journey                section root
 *   .ms-ag-card[data-step="n"]    one card per step, all present in the DOM
 *   .ms-ag-rail-btn[data-step]    rail buttons, one per step
 *   .ms-ag-rail-fill              progress rail inside .ms-ag-rail-track
 *   .ms-ag-counter                "01 / 05" counter element
 *
 * Behavior:
 * - Cycles to the next step every 5s while the section is in the viewport.
 * - Clicking a rail button jumps straight to that step and restarts the timer.
 * - Pauses (timer + progress bar) when scrolled out of view.
 * - No-op when the page has no `.ms-ag-journey` element.
 */
(function () {
  'use strict';

  var DURATION = 5000;

  function init(root) {
    var cards = root.querySelectorAll('.ms-ag-card');
    var buttons = root.querySelectorAll('.ms-ag-rail-btn');
    var fill = root.querySelector('.ms-ag-rail-fill');
    var counter = root.querySelector('.ms-ag-counter');
    var n = cards.length;
    if (!n || buttons.length !== n) return;

    var active = 0;
    var timer = null;
    var inView = false;

    function pad(i) {
      return i < 9 ? '0' + (i + 1) : '' + (i + 1);
    }

    function show(index) {
      active = ((index % n) + n) % n;
      for (var i = 0; i < n; i++) {
        cards[i].classList.toggle('is-active', i === active);
        buttons[i].classList.toggle('is-active', i === active);
        if (i === active) {
          cards[i].removeAttribute('hidden');
        } else {
          cards[i].setAttribute('hidden', '');
        }
      }
      if (fill) {
        fill.style.height = (((active + 1) / n) * 100).toFixed(2) + '%';
      }
      if (counter) {
        counter.textContent = pad(active) + ' / ' + pad(n - 1);
      }
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      stop();
      timer = setInterval(function () {
        show(active + 1);
      }, DURATION);
    }

    function restartProgress() {
      var card = cards[active];
      var bar = card.querySelector('.ms-ag-card-progress i');
      if (!bar) return;
      bar.style.animation = 'none';
      void bar.offsetWidth; // force reflow so the animation restarts
      bar.style.animation = '';
    }

    function play() {
      show(active);
      restartProgress();
      start();
    }

    function pause() {
      stop();
    }

    for (var b = 0; b < buttons.length; b++) {
      (function (idx) {
        buttons[idx].addEventListener('click', function () {
          if (inView) {
            play();
          } else {
            show(idx);
          }
        });
      })(b);
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var visible = entries[i].isIntersecting;
            if (visible && !inView) {
              inView = true;
              play();
            } else if (!visible && inView) {
              inView = false;
              pause();
            }
          }
        },
        { rootMargin: '0px 0px -80px 0px', threshold: 0.15 }
      );
      observer.observe(root);
    } else {
      // Very old browser: just show the first card, no cycling.
      show(0);
      return;
    }

    show(0);
  }

  function boot() {
    var sections = document.querySelectorAll('.ms-ag-journey');
    for (var i = 0; i < sections.length; i++) init(sections[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
