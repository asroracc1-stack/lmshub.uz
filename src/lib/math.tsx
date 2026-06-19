import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "dompurify";

/**
 * Normalizes unicode math characters to LaTeX formatting
 */
export function normalizeMathUnicode(text: string): string {
  if (!text) return "";
  return text
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/⁵/g, "^5")
    .replace(/ⁿ/g, "^n")
    .replace(/₁/g, "_1")
    .replace(/₂/g, "_2")
    .replace(/₃/g, "_3")
    .replace(/₄/g, "_4")
    .replace(/₅/g, "_5")
    .replace(/ₙ/g, "_n")
    .replace(/√([a-zA-Z0-9]+|\([^\)]+\))/g, (match, p1) => {
      if (p1.startsWith("(") && p1.endsWith(")")) {
        return `\\sqrt{${p1.slice(1, -1)}}`;
      }
      return `\\sqrt{${p1}}`;
    })
    .replace(/√/g, "\\sqrt ");
}

/**
 * Renders mathematical and text content.
 * Automatically detects LaTeX block ($$, $) and implicit math expressions (like x^2 + 5x + 6 = 0).
 */
export function formatMathText(text: string): React.ReactNode {
  if (!text) return "";

  // Normalize unicode math first
  const normalized = normalizeMathUnicode(text);

  // Split by explicit LaTeX blocks first: $$block$$ or $inline$
  const parts = normalized.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const tex = part.slice(2, -2);
          try {
            return (
              <div
                key={`block-${index}`}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(tex, { displayMode: true, throwOnError: false })
                }}
                className="my-2 overflow-x-auto max-w-full"
              />
            );
          } catch (err) {
            return <span key={`block-err-${index}`}>{part}</span>;
          }
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const tex = part.slice(1, -1);
          try {
            return (
              <span
                key={`inline-${index}`}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(tex, { displayMode: false, throwOnError: false })
                }}
                className="inline-block"
              />
            );
          } catch (err) {
            return <span key={`inline-err-${index}`}>{part}</span>;
          }
        }

        // Implicit math regex:
        // Matches any segment of characters containing exponents (^), subscripts (_), or common LaTeX keywords
        const implicitMathRegex = /((?:[a-zA-Z0-9\(\)\{\}\[\]\+\-\*\/\=\<\>\s]|\\[a-zA-Z]+)*?(?:[\^_](?:[0-9a-zA-Z]|\{[^{}]*\})|\\(?:frac|sqrt|int|sum|sin|cos|tan|log|lim|alpha|beta|theta|pi|pm|cdot|angle|degree|parallel|perp|triangle))[a-zA-Z0-9\(\)\{\}\[\]\+\-\*\/\=\<\>\s\^_\\,\.]*)/g;

        const subParts = part.split(implicitMathRegex);

        return (
          <React.Fragment key={`text-block-${index}`}>
            {subParts.map((subPart, subIdx) => {
              if (subIdx % 2 === 1) {
                let mathExpr = subPart.trim();
                let trailingPunct = "";
                const punctMatch = mathExpr.match(/([\.,;\?\!]+)$/);
                if (punctMatch) {
                  trailingPunct = punctMatch[1];
                  mathExpr = mathExpr.slice(0, -trailingPunct.length).trim();
                }

                // If mathExpr is empty after stripping punctuation, render as is
                if (!mathExpr) {
                  return <span key={`implicit-${index}-${subIdx}`}>{subPart}</span>;
                }

                try {
                  return (
                    <span key={`implicit-${index}-${subIdx}`} className="inline-block mx-0.5">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: katex.renderToString(mathExpr, { displayMode: false, throwOnError: false })
                        }}
                      />
                      {trailingPunct}
                    </span>
                  );
                } catch (err) {
                  return <span key={`implicit-err-${index}-${subIdx}`}>{subPart}</span>;
                }
              }

              // Normal text
              return (
                <span
                  key={`text-${index}-${subIdx}`}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(subPart.replace(/\\n/g, "<br/>").replace(/\n/g, "<br/>"))
                  }}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * React Component wrapper for math rendering
 */
export const MathRenderer: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  return <span className={className}>{formatMathText(text)}</span>;
};
