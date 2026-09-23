/**
 * ms-contact-form.js — AJAX enhancement for the Contact page form.
 *
 * The form (src/partials/contact.html) posts to /api/contact.php, a GoDaddy
 * PHP endpoint that mails shiva.dhanuskodi@mesonsoft.com (CF7-style markup
 * and field names are kept so the existing theme styles still apply).
 *
 * Without JavaScript the form still works: native HTML5 validation applies
 * (this script sets form.noValidate) and PHP falls back to a
 * ?ms_status=sent|error redirect back to /contact/.
 *
 * Markup contract:
 *   form.wpcf7-form                the form (only exists on /contact)
 *   [name="text-909"]              name, required, <=400 chars
 *   [name="email-939"]             email, required, valid, <=400 chars
 *   [name="textarea-561"]          message, required, <=2000 chars
 *   [name="ms_website"]            honeypot - must stay empty
 *   .wpcf7-response-output         status banner (CF7 status classes)
 *   .wpcf7-spinner                 visible while data-status="sending"
 */
(function () {
  'use strict';

  function init() {
    var form = document.querySelector('form.wpcf7-form');
    if (!form) return; // not the contact page

    form.noValidate = true; // our styled validation takes over

    var output = form.querySelector('.wpcf7-response-output');
    var submit = form.querySelector('.wpcf7-submit');
    var sending = false;

    var FIELDS = [
      { name: 'text-909',     label: 'Your Name',  max: 400,  email: false },
      { name: 'email-939',    label: 'Your Email', max: 400,  email: true  },
      { name: 'textarea-561', label: 'Question',   max: 2000, email: false }
    ];

    function el(name) { return form.querySelector('[name="' + name + '"]'); }

    function setStatus(state, text, ok) {
      form.setAttribute('data-status', state);
      if (!output) return;
      output.classList.remove('wpcf7-mail-sent-ok', 'wpcf7-validation-errors');
      output.textContent = text || '';
      output.setAttribute('aria-hidden', text ? 'false' : 'true');
      if (text) output.classList.add(ok ? 'wpcf7-mail-sent-ok' : 'wpcf7-validation-errors');
    }

    function markField(name, bad) {
      var f = el(name);
      if (!f) return;
      f.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) f.classList.add('not-valid'); else f.classList.remove('not-valid');
    }

    function validate() {
      var errors = [];
      for (var i = 0; i < FIELDS.length; i++) {
        var spec = FIELDS[i];
        var f = el(spec.name);
        if (!f) continue;
        var v = (f.value || '').trim();
        var msg = '';
        if (!v) msg = spec.label + ' is required.';
        else if (v.length > spec.max) msg = spec.label + ' is too long (max ' + spec.max + ' characters).';
        else if (spec.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Please enter a valid email address.';
        markField(spec.name, msg);
        if (msg) errors.push(msg);
      }
      return errors;
    }

    function clearFieldErrors() {
      for (var i = 0; i < FIELDS.length; i++) markField(FIELDS[i].name, false);
    }

    /* Local dev only: Next.js cannot execute .php files on its own —
       `npm run dev` (scripts/dev-local.mjs) starts a local PHP server and
       next.config.mjs proxies /api/contact.php to it. If that server is not
       running, explain exactly what to start instead of a generic failure. */
    function devHint(msg) {
      var host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') return msg;
      return 'Local dev: the PHP contact endpoint is not running. Start the site with ' +
        '`npm run dev` (it launches php -S on 127.0.0.1:8080 automatically), or run ' +
        '`php -S 127.0.0.1:8080 -t out` in a second terminal. If it is already running, ' +
        'check its terminal for errors \u2014 emails only actually send on the live server.';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;

      var errors = validate();
      if (errors.length) {
        setStatus('invalid', errors.join(' '), false);
        var firstBad = form.querySelector('[aria-invalid="true"]');
        if (firstBad) firstBad.focus();
        return;
      }

      sending = true;
      if (submit) submit.disabled = true;
      setStatus('sending', '', true);

      var fd = new FormData(form);
      fd.append('ms_ajax', '1');

      fetch(form.getAttribute('action'), {
        method: 'POST',
        body: fd,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(function (r) {
          return r.json().then(
            function (j) { return { ok: r.ok, body: j }; },
            function () { return { ok: false, body: null }; }
          );
        })
        .then(function (res) {
          var j = res.body;
          if (res.ok && j && j.ok) {
            setStatus('sent', (j.message || 'Thanks! Your message has been sent.'), true);
            form.reset();
            clearFieldErrors();
            return;
          }
          var msg = (j && j.message) ||
            devHint('Sorry, your message could not be sent. Please try again or email us directly.');
          if (j && j.errors) {
            var parts = [];
            for (var k in j.errors) {
              if (Object.prototype.hasOwnProperty.call(j.errors, k)) {
                parts.push(j.errors[k]);
                markField(k, true);
              }
            }
            if (parts.length) msg = parts.join(' ');
          }
          setStatus('failed', msg, false);
        })
        .catch(function () {
          setStatus('failed', devHint('Network error — please check your connection and try again.'), false);
        })
        .then(function () {
          sending = false;
          if (submit) submit.disabled = false;
        });
    });

    // Clear a field's error state as soon as the visitor edits it.
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('aria-invalid') === 'true') {
        markField(t.getAttribute('name'), false);
      }
    });

    // PHP's no-JS fallback lands on /contact/?ms_status=sent|error.
    try {
      var p = new URLSearchParams(window.location.search).get('ms_status');
      if (p === 'sent') setStatus('sent', 'Thanks! Your message has been sent — we will get back to you shortly.', true);
      else if (p === 'error') setStatus('failed', 'Sorry, your message could not be sent. Please try again or email us directly.', false);
    } catch (err) { /* URLSearchParams unavailable — nothing to restore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
