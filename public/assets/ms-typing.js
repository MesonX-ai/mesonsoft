/**
 * ms-typing.js — typewriter effect for the testimonial quotes in the
 * "The Voice of Our Clients: Testimonials and Success Stories" section
 * (home page).
 *
 * Every testimonial quote
 *   .aux-widget-testimonial-container .aux-testimonial-content > .entry-content
 * is written out character by character the first time it scrolls into view,
 * with a blinking caret in the Mesonsoft accent colour (#9F66FF) that fades
 * away once the quote is complete.
 *
 * Layout: the animated copy sits inside a hidden "ghost" copy of the full
 * quote. Both share the same CSS grid cell, so the card keeps its final height
 * for the whole animation and nothing below it jumps around. Because the ghost
 * is real text it also re-flows correctly on resize and after the webfonts
 * load — no measured pixel heights to go stale.
 *
 * Accessibility: the animated copy is aria-hidden and the complete quote is
 * exposed through a .screen-reader-text span, so assistive technology reads the
 * testimonial once, in full, instead of one letter at a time.
 *
 * Degradation: if JavaScript never runs, or the visitor prefers reduced motion,
 * the original markup is left untouched and the quotes are readable straight
 * away.
 */
(function () {
  'use strict';

  var SPEED = 15; // base ms per character
  var SPEED_JITTER = 6; // +/- ms, keeps the rhythm from feeling robotic
  var PUNCTUATION_PAUSE = 130; // extra beat after . , ! ? ; :
  var STAGGER = 180; // ms between neighbouring quotes
  var CARET_HOLD = 1200; // ms the caret lingers after the last character
  var REVEAL_TIMEOUT = 2500; // ms cap while waiting for the card to fade in

  var SELECTOR =
    '.aux-widget-testimonial-container .aux-testimonial-content > .entry-content';

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /**
   * Replaces the plain text of a quote with the ghost / animated / screen
   * reader structure and returns the pieces the animation needs.
   */
  function build(el) {
    var raw = el.textContent || '';
    var lead = raw.match(/^\s*/)[0];
    var trail = raw.match(/\s*$/)[0];
    var text = raw.slice(lead.length, raw.length - trail.length);
    if (!text) return null;

    // The surrounding whitespace is dropped on purpose: the browser collapses
    // it away anyway, and loose text nodes would become extra grid cells.
    el.textContent = '';

    var ghost = document.createElement('span');
    ghost.className = 'ms-typing-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = text;

    var visual = document.createElement('span');
    visual.className = 'ms-typing-visual';
    visual.setAttribute('aria-hidden', 'true');

    var typed = document.createElement('span');
    typed.className = 'ms-typing-text';

    var caret = document.createElement('span');
    caret.className = 'ms-typing-caret';

    visual.appendChild(typed);
    visual.appendChild(caret);

    var sr = document.createElement('span');
    sr.className = 'screen-reader-text';
    sr.textContent = text;

    // The stage (not .entry-content itself) is the grid container, so the
    // theme's ::before/::after decorations on .entry-content can never become
    // grid items.
    var stage = document.createElement('span');
    stage.className = 'ms-typing-stage';
    stage.appendChild(ghost);
    stage.appendChild(visual);

    el.appendChild(stage);
    el.appendChild(sr);
    el.classList.add('ms-typing');
    el.setAttribute('data-ms-typing', '1');

    return { text: text, typed: typed, caret: caret };
  }

  function type(state, delay) {
    var text = state.text;
    var typed = state.typed;
    var caret = state.caret;
    var i = 0;

    function step() {
      if (i >= text.length) {
        window.setTimeout(function () {
          caret.classList.add('ms-typing-caret-done');
        }, CARET_HOLD);
        return;
      }

      var ch = text.charAt(i);
      typed.textContent += ch;
      i += 1;

      var wait = SPEED + (Math.random() * 2 - 1) * SPEED_JITTER;
      if (/[.,!?;:]/.test(ch)) wait += PUNCTUATION_PAUSE;
      window.setTimeout(step, Math.max(8, wait));
    }

    window.setTimeout(step, delay);
  }
/**
   * The testimonials use the Auxin appear animations, which hold their column
   * at opacity 0 until the appearl plugin reveals it. Typing before that point
   * would be invisible, so wait for the card to finish fading in.
   */
  function whenRevealed(el, callback) {
    var ancestor = el.closest ? el.closest('.aux-appear-watch-animation') : null;
    if (!ancestor) {
      callback();
      return;
    }

    var started = Date.now();
    (function poll() {
      var opacity = parseFloat(window.getComputedStyle(ancestor).opacity);
      // "!(opacity < 0.99)" is also true for NaN, i.e. a missing value.
      if (!(opacity < 0.99) || Date.now() - started > REVEAL_TIMEOUT) {
        callback();
        return;
      }
      window.requestAnimationFrame(poll);
    })();
  }

  function init() {
    var quotes = document.querySelectorAll(SELECTOR);
    if (!quotes.length) return;

    // Leave the quotes alone unless we can genuinely improve them.
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

    var states = [];
    quotes.forEach(function (el, index) {
      if (el.getAttribute('data-ms-typing')) return; // already initialised
      var state = build(el);
      if (!state) return;
      state.el = el;
      state.stagger = index * STAGGER;
      states.push(state);
    });
    if (!states.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var state = null;
          for (var i = 0; i < states.length; i++) {
            if (states[i].el === entry.target) {
              state = states[i];
              break;
            }
          }
          if (!state || state.started) return;

          state.started = true;
          observer.unobserve(entry.target);
          whenRevealed(entry.target, function () {
            type(state, state.stagger);
          });
        });
      },
      { threshold: 0.2 }
    );

    states.forEach(function (state) {
      observer.observe(state.el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();