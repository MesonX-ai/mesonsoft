/**
 * ms-typing.js — typewriter effect for the testimonial quotes in the
 * "The Voice of Our Clients: Testimonials and Success Stories" section
 * (home page).
 *
 * Every testimonial quote
 *   .aux-widget-testimonial-container .aux-testimonial-content > .entry-content
 * is written out character by character every time it scrolls into view,
 * with a blinking caret in the Mesonsoft accent colour (#9F66FF) that fades
 * away once the quote is complete.
 *
 * Layout: the animated copy sits inside a hidden "ghost" copy of the full
 * quote. Both share the same CSS grid cell, so the card keeps its final height
 * for the whole animation and nothing below it jumps around. Because the ghost
 * is real text it also re-flows correctly on resize and after the webfonts
 * load — no measured pixel heights to go stale.
 *
 * Each quote starts typing 750ms after its card finishes fading in (the Auxin
 * appearl reveal takes ~500ms, so the stagger lands as the card settles), with
 * Scrolling a quote out of view resets it to an empty line, so scrolling back
 * replays the typing from the start — the same repeat-on-scroll behaviour as
 * the ms-count-up.js number animations elsewhere on the site.
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
  var REVEAL_SETTLE = 750; // ms after the card's fade-in completes before typing
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

  /**
   * Cancels any in-flight typing work for a quote: pending character steps,
   * the delayed start, the post-completion caret fade, and a reveal-wait that
   * has not fired yet. Each handle is nulled so a stale callback can never
   * resurrect a superseded run.
   */
  function cancel(state) {
    state.runId = (state.runId || 0) + 1;
    if (state.timer) {
      window.clearTimeout(state.timer);
      state.timer = 0;
    }
    if (state.doneTimer) {
      window.clearTimeout(state.doneTimer);
      state.doneTimer = 0;
    }
    if (state.revealCancel) {
      state.revealCancel();
      state.revealCancel = null;
    }
  }

  function start(state) {
    cancel(state);

    var text = state.text;
    var typed = state.typed;
    var caret = state.caret;
    var i = 0;

    caret.classList.remove('ms-typing-caret-done');
    typed.textContent = '';
    state.textLength = 0;

    function step() {
      if (state.runId !== runId) return;
      if (i >= text.length) {
        state.doneTimer = window.setTimeout(function () {
          if (state.runId !== runId) return;
          caret.classList.add('ms-typing-caret-done');
          state.doneTimer = 0;
        }, CARET_HOLD);
        return;
      }

      var ch = text.charAt(i);
      typed.textContent += ch;
      i += 1;
      state.textLength = i;

      var wait = SPEED + (Math.random() * 2 - 1) * SPEED_JITTER;
      if (/[.,!?;:]/.test(ch)) wait += PUNCTUATION_PAUSE;
      state.timer = window.setTimeout(step, Math.max(8, wait));
    }

    var runId = state.runId = (state.runId || 0) + 1;
    state.timer = window.setTimeout(step, state.stagger || 0);
  }

  /**
   * Clears a quote back to its empty (pre-typing) state and cancels any
   * pending typing work, so scrolling the section out of view leaves a clean
   * slate for the next entrance.
   */
  function reset(state) {
    cancel(state);
    state.typed.textContent = '';
    state.textLength = 0;
    state.caret.classList.remove('ms-typing-caret-done');
    state.revealCancel = null;
    state.typing = false;
  }
/**
   * The testimonials use the Auxin appear animations, which hold their column
   * at opacity 0 until the appearl plugin reveals it. Typing waits for the
   * reveal to complete, then settles briefly so the motion reads as one
   * continuous entrance: card fades in, quote types out. Returns a cancel
   * function for the pending wait.
   */
  function whenRevealed(el, state, callback) {
    var ancestor = el.closest ? el.closest('.aux-appear-watch-animation') : null;
    if (!ancestor) {
      callback();
      return;
    }

    if (state.revealCancel) return; // a reveal-wait is already pending

    state.revealCancel = null;

    var started = Date.now();
    var settled = false;
    var rafId = 0;
    var settleTimer = 0;

    function cancelWait() {
      settled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (settleTimer) window.clearTimeout(settleTimer);
      rafId = 0;
      settleTimer = 0;
    }

    state.revealCancel = cancelWait;

    function done() {
      if (settled) return;
      settled = true;
      state.revealCancel = null;
      callback();
    }

    function poll() {
      if (settled || state.revealCancel !== cancelWait) return;
      var opacity = parseFloat(window.getComputedStyle(ancestor).opacity);
      // "!(opacity < 0.99)" is also true for NaN, i.e. a missing value.
      if (!(opacity < 0.99) || Date.now() - started > REVEAL_TIMEOUT) {
        settleTimer = window.setTimeout(done, REVEAL_SETTLE);
        return;
      }
      rafId = window.requestAnimationFrame(poll);
    }

    rafId = window.requestAnimationFrame(poll);
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
          var state = null;
          for (var i = 0; i < states.length; i++) {
            if (states[i].el === entry.target) {
              state = states[i];
              break;
            }
          }
          if (!state) return;

          if (entry.isIntersecting) {
            // Re-arm the caret and wait for the card's reveal before typing,
            // so every entrance — not just the first — reads as one motion.
            state.inView = true;
            if (!state.typing) {
              state.typing = true;
              whenRevealed(entry.target, state, function () {
                if (!state.inView) {
                  state.typing = false;
                  return;
                }
                start(state);
              });
            }
          } else if (state.inView || state.typing) {
            // Scrolled out: stop everything and clear the quote, so the next
            // entrance replays the typing from an empty line.
            state.inView = false;
            state.typing = false;
            reset(state);
          }
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