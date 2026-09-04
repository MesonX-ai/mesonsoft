'use client';

import { useEffect, useRef } from 'react';

/**
 * Loads the original WordPress/Elementor scripts (jQuery, auxin theme,
 * elementor frontend, widgets...) in their exact original order.
 * Runs once after hydration; continues on individual script errors so a
 * failing optional script (e.g. Google Maps) never blocks the rest.
 */
export default function ScriptLoader({ scripts }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let chain = Promise.resolve();
    for (const script of scripts) {
      chain = chain.then(() => {
        if (script.type === 'src') {
          return new Promise((resolve) => {
            const el = document.createElement('script');
            el.src = script.src;
            el.async = false;
            el.onload = () => resolve();
            el.onerror = () => {
              console.warn('[ScriptLoader] failed to load', script.src);
              resolve();
            };
            document.body.appendChild(el);
          });
        }
        const el = document.createElement('script');
        if (script.id) el.id = script.id;
        el.textContent = script.content;
        document.body.appendChild(el);
        return Promise.resolve();
      });
    }
  }, [scripts]);

  return null;
}
