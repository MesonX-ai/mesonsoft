'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

// CSS imports required for code highlighting and math rendering
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

// Copy and Check icons as inline SVG
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

/**
 * Custom CodeBlock sub-component with interactive "Copy Code" functionality.
 */
const CodeBlock = ({ language, children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const rawText = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'relative',
      margin: '1rem 0',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      border: '1px solid #374151',
      backgroundColor: '#030712',
      color: '#f3f4f6',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        backgroundColor: '#1f2937',
        borderBottom: '1px solid #374151',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        color: '#9ca3af',
        userSelect: 'none'
      }}>
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            backgroundColor: '#374151',
            color: '#d1d5db',
            cursor: 'pointer',
            border: 'none',
            fontSize: '0.75rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4b5563';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#374151';
            e.currentTarget.style.color = '#d1d5db';
          }}
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <CheckIcon />
              <span style={{ color: '#10b981' }}>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code Body */}
      <div style={{
        padding: '1rem',
        overflowX: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        lineHeight: '1.5rem'
      }}>
        <code>{children}</code>
      </div>
    </div>
  );
};

/**
 * Main ChatMarkdown component - renders rich markdown with syntax highlighting, tables, and LaTeX.
 */
export const ChatMarkdown = ({ content }) => {
  return (
    <div style={{
      fontSize: '0.875rem',
      lineHeight: '1.5'
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          // Overriding default code element rendering
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (inline) {
              return (
                <code
                  style={{
                    backgroundColor: '#1f2937',
                    color: '#f472b6',
                    padding: '0.25rem 0.375rem',
                    borderRadius: '0.25rem',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem'
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={language}>{children}</CodeBlock>;
          },
          // Custom Table Styling
          table({ children }) {
            return (
              <div style={{
                margin: '1rem 0',
                overflowX: 'auto',
                borderRadius: '0.5rem',
                border: '1px solid #374151'
              }}>
                <table style={{
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.875rem'
                }}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead style={{
                backgroundColor: '#111827',
                fontWeight: '600'
              }}>
                {children}
              </thead>
            );
          },
          th({ children }) {
            return (
              <th style={{
                padding: '0.625rem 1rem',
                fontWeight: '500'
              }}>
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td style={{
                padding: '0.625rem 1rem',
                borderTop: '1px solid #374151'
              }}>
                {children}
              </td>
            );
          },
          // Custom Blockquote / Callout Styling
          blockquote({ children }) {
            return (
              <blockquote style={{
                margin: '1rem 0',
                borderLeft: '4px solid #6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                fontStyle: 'italic',
                color: '#d1d5db',
                borderRadius: '0 0.25rem 0.25rem 0'
              }}>
                {children}
              </blockquote>
            );
          },
          // Custom heading styling
          h1({ children }) {
            return (
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginTop: '1.5rem',
                marginBottom: '0.75rem'
              }}>
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                marginTop: '1.25rem',
                marginBottom: '0.5rem'
              }}>
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                marginTop: '1rem',
                marginBottom: '0.5rem'
              }}>
                {children}
              </h3>
            );
          },
          // Custom list styling
          ul({ children }) {
            return (
              <ul style={{
                listStyleType: 'disc',
                listStylePosition: 'inside',
                margin: '0.5rem 0',
                marginLeft: '1rem'
              }}>
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol style={{
                listStyleType: 'decimal',
                listStylePosition: 'inside',
                margin: '0.5rem 0',
                marginLeft: '1rem'
              }}>
                {children}
              </ol>
            );
          },
          li({ children }) {
            return (
              <li style={{ marginLeft: '0.5rem' }}>
                {children}
              </li>
            );
          },
          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                style={{
                  color: '#3b82f6',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          // Horizontal rule
          hr() {
            return (
              <hr style={{
                margin: '1rem 0',
                border: 'none',
                borderTop: '1px solid #4b5563'
              }} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
