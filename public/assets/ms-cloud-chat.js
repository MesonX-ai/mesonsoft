/**
 * ms-cloud-chat.js — live demo panel for the Cloud AI page.
 *
 * Replicates the sQuark.ai /cloud-ai hero chat demo on the Mesonsoft theme:
 * - Suggestion chips submit a message.
 * - The form (input + send button) submits a message.
 * - After a short pause the assistant replies with a canned answer typed
 *   out character by character, with a blinking caret, exactly like the
 *   framer-motion demo on the sQuark site.
 *
 * No-op when the page has no `.ms-ca-chat` element, or when the user
 * prefers reduced motion (the reply is then shown instantly).
 */
(function () {
  'use strict';

  var REPLY =
    'Great question! I can help with that. In sQuark Cloud AI, just describe ' +
    'what you need and I\u2019ll draft, research, generate, or analyze it for ' +
    'you\u2014then we can refine together in Canvas.';

  var REPLY_DELAY = 350; // ms before the assistant starts "thinking"
  var TYPE_SPEED = 18; // base ms per character
  var PUNCTUATION_PAUSE = 140; // extra beat after . , ! ? ; : —

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function bubble(className, text) {
    var el = document.createElement('div');
    el.className = 'ms-ca-msg ' + className;
    el.textContent = text;
    return el;
  }

  function init(chat) {
    var log = chat.querySelector('.ms-ca-chat-log');
    var form = chat.querySelector('.ms-ca-chat-form');
    var input = chat.querySelector('.ms-ca-chat-input');
    var send = chat.querySelector('.ms-ca-chat-send');
    var chips = chat.querySelectorAll('.ms-ca-chat-suggest button');
    if (!log || !form || !input) return;

    var typing = false;
    var typeTimer = null;

    function scrollDown() {
      log.scrollTop = log.scrollHeight;
    }

    function userSays(text) {
      log.appendChild(bubble('ms-ca-msg-user', text));
      scrollDown();
    }

    function startReply() {
      typing = true;
      if (send) send.disabled = true;

      if (prefersReducedMotion()) {
        log.appendChild(bubble('ms-ca-msg-ai', REPLY));
        finish();
        return;
      }

      var el = document.createElement('div');
      el.className = 'ms-ca-msg ms-ca-msg-ai';
      var textSpan = document.createElement('span');
      var caret = document.createElement('span');
      caret.className = 'ms-ca-caret';
      caret.setAttribute('aria-hidden', 'true');
      el.appendChild(textSpan);
      el.appendChild(caret);
      log.appendChild(el);
      scrollDown();

      var i = 0;

      function tick() {
        if (i >= REPLY.length) {
          caret.remove();
          finish();
          return;
        }
        var ch = REPLY.charAt(i);
        textSpan.textContent += ch;
        i += 1;
        scrollDown();
        var speed = /[.,!?;:\u2014]/.test(ch)
          ? TYPE_SPEED + PUNCTUATION_PAUSE
          : TYPE_SPEED;
        typeTimer = setTimeout(tick, speed);
      }

      typeTimer = setTimeout(tick, TYPE_SPEED);
    }

    function finish() {
      typing = false;
      if (send) send.disabled = false;
      input.focus({ preventScroll: true });
    }

    function submit(value) {
      var text = (value || '').trim();
      if (!text || typing) return;
      userSays(text);
      input.value = '';
      setTimeout(startReply, REPLY_DELAY);
    }

    form.addEventListener('submit', function (evt) {
      evt.preventDefault();
      submit(input.value);
    });

    for (var c = 0; c < chips.length; c++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          submit(chip.textContent);
        });
      })(chips[c]);
    }
  }

  function boot() {
    var chats = document.querySelectorAll('.ms-ca-chat');
    for (var i = 0; i < chats.length; i++) init(chats[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
