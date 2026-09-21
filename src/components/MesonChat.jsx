'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * MesonX AI — floating chat widget (Mesonsoft theme).
 *
 * Ported from the squark-browser.ai chat widget (squark-chat-widget.tsx) so the
 * Mesonsoft site talks to the exact same AWS LLM gateway:
 *   https://tobm8g2xwh.execute-api.us-east-2.amazonaws.com/prod/llm/chat
 *
 * Two transports, tried in order:
 *   1. The gateway directly — it sends `Access-Control-Allow-Origin: *`, so the
 *      browser can reach the real LLM from anywhere (works on the static export
 *      and in local dev, no server needed).
 *   2. `/api/chat.php` — same-origin GoDaddy PHP proxy (public/api/chat.php) for
 *      production hardening: stable visitor cookie + room for future auth.
 *
 * The gateway answers with either SSE frames (`data: {"token": "..."}` … `data: [DONE]`)
 * or a plain JSON object (`{"text": "..."}` / `{"image_url": "..."}`) depending on the
 * routed integration, so both shapes are handled.
 *
 * Styling is pure CSS (`ms-chat-*` classes in public/assets/inline-head.css).
 * Icons are inline SVG — the Font Awesome webfonts are not shipped in /assets,
 * and the rest of the site draws its custom icons as inline SVG too.
 */

const API_URL = '/api/chat.php';
const LLM_GATEWAY_URL =
  'https://tobm8g2xwh.execute-api.us-east-2.amazonaws.com/prod/llm/chat';
const CHAT_PROVIDER = 'gemini';
const CHAT_MODEL = '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Stable anonymous visitor id so the gateway can apply per-user quotas. */
function getVisitorId() {
  try {
    let id = localStorage.getItem('meson_vid') || '';

    if (!id) {
      id = 'web-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('meson_vid', id);
    }

    return id;
  } catch {
    return 'web-anon';
  }
}

/**
 * The gateway is stateless (single prompt), so the whole conversation is sent as
 * one prompt with explicit role markers to preserve context.
 */
function buildPrompt(history, mode = 'text') {
  const lines = history.map((m) =>
    m.role === 'user' ? `User: ${m.text}` : `MesonX AI: ${m.text}`
  );

  const parts = [
    'You are MesonX AI, a helpful, concise assistant for Mesonsoft — a company specialising in agentic automation, advanced LLM integration, and enterprise-grade AI security. Continue the conversation naturally.',
    ...lines,
  ];

  if (mode === 'code') parts.push('User: Reply with code only and no explanations.');

  return parts.join('\n');
}

const SUGGESTIONS = [
  'What can you do?',
  'Explain agentic automation',
  'Draft a project brief',
  'How is data secured?',
];

const CANNED_INTRO =
  "Hi, I'm MesonX AI. I can explain our agentic automation platform, draft content, analyse data, or generate images — what would you like to build today?";

const uid = () => Math.random().toString(36).slice(2);

/** Branded offline reply, used only if both transports fail. */
function buildCannedReply(prompt) {
  const topic = prompt.trim().replace(/[?.!]+$/, '');
  const lower = topic.toLowerCase();

  if (/(what can you|help|who are you|your capabilit)/.test(lower)) {
    return "I'm MesonX AI — a conversational, multimodal assistant. I can explain agentic automation, draft and edit content, analyse data, generate images, and help you reason through architecture decisions. Tell me what you need.";
  }
  if (/(agentic|automation|agent|workflow|llm|integration)/.test(lower)) {
    return `Good question about "${topic}". Agentic automation replaces fixed scripts with agents that reason about a goal, pick tools, and recover from failure. Our platform pairs that with advanced LLM integration and enterprise-grade security, so autonomous workflows stay auditable. Want me to walk through a concrete example?`;
  }
  if (/(secur|privacy|compliance|data|gdpr|soc)/.test(lower)) {
    return `On security — "${topic}" — we treat it as a first-class requirement: encrypted data in transit and at rest, least-privilege access, and full audit trails across every agent action. Share your compliance target and I'll map it to controls.`;
  }
  if (/(draft|write|brief|email|post|summar)/.test(lower)) {
    return `Happy to help with "${topic}". I'll keep it clear and on-brand: short confident sentences, concrete outcomes, no filler. Tell me the audience and the goal and I'll produce a first draft you can iterate on.`;
  }

  return `Good one — "${topic}". Describe the outcome you want and I'll draft, explain, or analyse it, then we can refine it together. What's the end goal?`;
}

async function streamCanned(prompt, onDelta) {
  const text = buildCannedReply(prompt);

  for (const word of text.split(/(\s+)/)) {
    await sleep(12);
    onDelta(word);
  }
}


async function streamChat(prompt, onDelta, url, mode = 'text', onImage) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      user_id: getVisitorId(),
      provider: CHAT_PROVIDER,
      model: CHAT_MODEL,
      mode,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`MesonX AI responded ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Gateway returned a JSON object (the routed integration has no streaming).
  if (contentType.includes('application/json')) {
    const data = await res.json();

    // Proxy is up but couldn't reach the LLM (e.g. outbound curl blocked on the
    // host) — let the caller fall back to the direct gateway call.
    if (data.proxy_unavailable) throw new Error('proxy unavailable');

    // Image-generation response (HunyuanImage expert).
    if (data.image_url) {
      onImage?.(data.image_url, data.text || '');

      return;
    }

    const text = data.text || data.error || '';

    if (!text) throw new Error('empty response');
    for (const word of text.split(/(\s+)/)) {
      await sleep(12);
      onDelta(word);
    }

    return;
  }

  // Gateway streamed SSE frames: data: {"token": "..."} | data: [DONE].
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let produced = false;
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();

    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');

    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed.startsWith('data:')) continue;

      const payload = trimmed.slice(5).trim();

      if (payload === '[DONE]') {
        finished = true;
        break;
      }
      try {
        const json = JSON.parse(payload);

        // Proxy is up but couldn't reach the LLM — let the caller fall back.
        if (json.proxy_unavailable) throw new Error('proxy unavailable');

        if (json.error) {
          onDelta(json.error);
          produced = true;
        } else if (json.token) {
          onDelta(json.token);
          produced = true;
        } else if (json.text) {
          onDelta(json.text);
          produced = true;
        } else if (json.image_url) {
          onImage?.(json.image_url, json.text || '');
          produced = true;
        }
      } catch (err) {
        if (err && err.message === 'proxy unavailable') throw err;
        /* ignore keep-alive / partial frames */
      }
    }
  }

  if (!produced) throw new Error('no tokens');
}

/* ---------- inline SVG icons (no webfont dependency) ---------- */

const Ico = ({ children, size = 20 }) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    width={size}
  >
    {children}
  </svg>
);

const SparkIcon = (p) => (
  <Ico {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </Ico>
);

const ChatIcon = (p) => (
  <Ico {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.4A8 8 0 1 1 21 12z" />
  </Ico>
);

const CloseIcon = (p) => (
  <Ico {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Ico>
);

const ExpandIcon = ({ enlarged, ...p }) => (
  <Ico {...p}>
    {enlarged ? (
      <path d="M9 3v6H3M15 21v-6h6M21 9h-6V3M3 15h6v6" />
    ) : (
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    )}
  </Ico>
);

const SendIcon = (p) => (
  <Ico {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Ico>
);

const TimerIcon = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9 2h6" />
  </Ico>
);

export default function MesonChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: uid(), role: 'ai', text: CANNED_INTRO },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState('text');
  const scrollRef = useRef(null);
  const wasBusy = useRef(false);
  const inputRef = useRef(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;

    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // Badge the launcher when a reply lands while the panel is closed.
  useEffect(() => {
    if (wasBusy.current && !busy && !open) setUnread((n) => n + 1);
    wasBusy.current = busy;
  }, [busy, open]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(
    async (value) => {
      const text = (value ?? input).trim();

      if (!text || busy) return;

      const startedAt = Date.now();
      const userMsg = { id: uid(), role: 'user', text };
      const history = [...messages, userMsg];

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setBusy(true);
      setUnread(0);

      const aiId = uid();

      setMessages((prev) => [...prev, { id: aiId, role: 'ai', text: '' }]);

      const onDelta = (chunk) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, text: m.text + chunk } : m))
        );

      const onImage = (imageUrl, alt) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, text: alt || 'Generated image', image_url: imageUrl }
              : m
          )
        );

      // Image mode sends a clean single-turn prompt (the backend routes to
      // HunyuanImage and generates from just the request).
      const prompt = mode === 'image' ? text : buildPrompt(history, mode);

      try {
        // 1. Direct AWS gateway — CORS is open, so this works from anywhere.
        await streamChat(prompt, onDelta, LLM_GATEWAY_URL, mode, onImage);
      } catch {
        try {
          // 2. Same-origin GoDaddy PHP proxy (production hardening).
          await streamChat(prompt, onDelta, API_URL, mode, onImage);
        } catch (err) {
          console.error('MesonX AI request failed:', err);
          // 3. Last resort: branded offline reply.
          await streamCanned(text, onDelta);
        }
      } finally {
        const seconds = (Date.now() - startedAt) / 1000;

        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, elapsed: seconds } : m))
        );
        setBusy(false);
      }
    },
    [busy, input, messages, mode]
  );

  const toggle = () =>
    setOpen((o) => {
      if (!o) setUnread(0);

      return !o;
    });

  return (
    <>
      {open && (
        <section
          aria-label="MesonX AI chat"
          className={'ms-chat-panel' + (expanded ? ' ms-chat-panel-wide' : '')}
          role="dialog"
        >
          <header className="ms-chat-head">
            <span className="ms-chat-avatar">
              <SparkIcon size={18} />
            </span>
            <div className="ms-chat-id">
              <p className="ms-chat-name">MesonX AI</p>
              <p className="ms-chat-status">
                <span className="ms-chat-livedot" />
                Online · ready to help
              </p>
            </div>
            <button
              aria-label={expanded ? 'Shrink chat' : 'Expand chat'}
              className="ms-chat-headbtn"
              type="button"
              onClick={() => setExpanded((e) => !e)}
            >
              <ExpandIcon enlarged={expanded} size={17} />
            </button>
            <button
              aria-label="Close chat"
              className="ms-chat-headbtn"
              type="button"
              onClick={() => setOpen(false)}
            >
              <CloseIcon size={17} />
            </button>
          </header>

          <div className="ms-chat-scroll" ref={scrollRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  'ms-chat-row' + (message.role === 'user' ? ' ms-chat-row-user' : '')
                }
              >
                {message.role === 'ai' && typeof message.elapsed === 'number' && (
                  <span className="ms-chat-meta">
                    <TimerIcon size={11} />
                    {message.elapsed.toFixed(1)}s
                  </span>
                )}
                <div
                  className={
                    'ms-chat-bubble' +
                    (message.role === 'user' ? ' ms-chat-bubble-user' : ' ms-chat-bubble-ai')
                  }
                >
                  {message.image_url ? (
                    <img
                      alt={message.text || 'generated image'}
                      className="ms-chat-img"
                      src={message.image_url}
                    />
                  ) : message.text ? (
                    message.text
                  ) : busy ? (
                    <span className="ms-chat-typing">
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="ms-chat-chips">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                className="ms-chat-chip"
                disabled={busy}
                type="button"
                onClick={() => send(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            className="ms-chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <div className="ms-chat-modes">
              {['text', 'code', 'image'].map((m) => (
                <button
                  key={m}
                  className={'ms-chat-mode' + (mode === m ? ' is-active' : '')}
                  disabled={busy}
                  type="button"
                  onClick={() => setMode(m)}
                >
                  {m === 'text' ? 'Text' : m === 'code' ? 'Code' : 'Image'}
                </button>
              ))}
              <span className="ms-chat-brand">Mesonsoft</span>
            </div>
            <div className="ms-chat-inputrow">
              <input
                ref={inputRef}
                aria-label="Message MesonX AI"
                className="ms-chat-input"
                placeholder="Message MesonX AI…"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button
                aria-label="Send message"
                className="ms-chat-send"
                disabled={!input.trim() || busy}
                type="submit"
              >
                <SendIcon size={18} />
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        aria-label="Open MesonX AI chat"
        className={'ms-chat-launcher' + (open ? ' is-open' : '')}
        type="button"
        onClick={toggle}
      >
        <span className="ms-chat-launchglow" />
        {open ? <ChatIcon size={22} /> : <SparkIcon size={22} />}
        {unread > 0 && !open && <span className="ms-chat-badge">{unread}</span>}
      </button>
    </>
  );
}

