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
    .replace(/log₂/g, "\\log_{2}")
    .replace(/log₁₀/g, "\\log_{10}")
    .replace(/log/g, "\\log")
    .replace(/π/g, "\\pi")
    .replace(/≤/g, "\\le")
    .replace(/≥/g, "\\ge")
    .replace(/≠/g, "\\neq")
    .replace(/±/g, "\\pm")
    .replace(/×/g, "\\times")
    .replace(/÷/g, "\\div")
    .replace(/−/g, "-") // Unicode minus
    .replace(/√([a-zA-Z0-9]+|\([^\)]+\))/g, (match, p1) => {
      if (p1.startsWith("(") && p1.endsWith(")")) {
        return `\\sqrt{${p1.slice(1, -1)}}`;
      }
      return `\\sqrt{${p1}}`;
    })
    .replace(/√/g, "\\sqrt ");
}

/**
 * Checks if a string token represents a mathematical component
 */
/**
 * Checks if a string token represents a mathematical component
 */
function isMathToken(token: string): boolean {
  const t = token.replace(/[\.,;\?\!]+$/, "");
  if (!t) return false;

  // Contains mathematical symbols/LaTeX keywords or standard operators
  if (/[\^_\\√π≤≥≠±×÷\+\-\*\/\=\<\>]/.test(t)) {
    // Exclude hyphenated Uzbek/English words (e.g., super-admin, to'g'ri-burchakli)
    if (/^[a-zA-Z\']+(?:-[a-zA-Z\']+)+$/.test(t)) {
      if (t.length > 3) return false;
    }
    return true;
  }

  // Single character variables, operators, brackets
  if (t.length === 1) {
    return /[a-zA-Z0-9\+\-\*\/\=\<\>\(\)\[\]\{\}]/.test(t);
  }

  // Pure numbers (digits, decimals)
  if (/^\d+(?:\.\d+)?$/.test(t)) return true;

  // Simple algebraic terms (e.g. 5x, 2a, 10n)
  if (/^\d+[a-zA-Z]$/.test(t)) return true;

  // Mathematical function keywords
  if (/^(?:log|ln|sin|cos|tan|cot|lim|log_2|log_10|log₂|log₁₀)$/i.test(t)) return true;

  // Parenthesized simple expressions
  if (/^\([a-zA-Z0-9\+\-\*\/\=]+\)$/.test(t)) return true;

  return false;
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
  const partsRegex = normalized.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);

  return (
    <>
      {partsRegex.map((part, index) => {
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

        // Tokenize the text to parse implicit math without gluing words
        const tokens = part.split(/(\s+)/);
        const resultElements: React.ReactNode[] = [];
        let currentMathGroup: string[] = [];

        const flushMathGroup = (keyPrefix: string) => {
          if (currentMathGroup.length === 0) return;

          let trailingSpaces = "";
          while (currentMathGroup.length > 0 && /^\s+$/.test(currentMathGroup[currentMathGroup.length - 1])) {
            trailingSpaces = currentMathGroup.pop() + trailingSpaces;
          }

          let mathExpr = currentMathGroup.join("").trim();
          currentMathGroup = [];

          if (!mathExpr) {
            if (trailingSpaces) {
              resultElements.push(
                <span
                  key={`space-restored-${keyPrefix}-${resultElements.length}`}
                  dangerouslySetInnerHTML={{ __html: trailingSpaces.replace(/\n/g, "<br/>") }}
                />
              );
            }
            return;
          }

          let trailingPunct = "";
          const punctMatch = mathExpr.match(/([\.,;\?\!]+)$/);
          if (punctMatch) {
            trailingPunct = punctMatch[1];
            mathExpr = mathExpr.slice(0, -trailingPunct.length).trim();
          }

          if (!mathExpr) {
            if (trailingSpaces) {
              resultElements.push(
                <span
                  key={`space-restored-${keyPrefix}-${resultElements.length}`}
                  dangerouslySetInnerHTML={{ __html: trailingSpaces.replace(/\n/g, "<br/>") }}
                />
              );
            }
            return;
          }

          try {
            resultElements.push(
              <span key={`math-${keyPrefix}-${resultElements.length}`} className="inline-block mx-1">
                <span
                  dangerouslySetInnerHTML={{
                    __html: katex.renderToString(mathExpr, { displayMode: false, throwOnError: false })
                  }}
                />
                {trailingPunct}
              </span>
            );
          } catch (err) {
            resultElements.push(<span key={`math-err-${keyPrefix}-${resultElements.length}`}>{mathExpr}{trailingPunct}</span>);
          }

          if (trailingSpaces) {
            resultElements.push(
              <span
                key={`space-after-${keyPrefix}-${resultElements.length}`}
                dangerouslySetInnerHTML={{ __html: trailingSpaces.replace(/\n/g, "<br/>") }}
              />
            );
          }
        };

        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (i % 2 === 1) {
            // Space / newline
            if (currentMathGroup.length > 0) {
              currentMathGroup.push(token);
            } else {
              resultElements.push(
                <span
                  key={`space-${index}-${i}`}
                  dangerouslySetInnerHTML={{ __html: token.replace(/\n/g, "<br/>") }}
                />
              );
            }
          } else {
            // Word token
            if (isMathToken(token)) {
              currentMathGroup.push(token);
            } else {
              flushMathGroup(`${index}-${i}`);
              resultElements.push(
                <span
                  key={`text-${index}-${i}`}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(token.replace(/\\n/g, "<br/>").replace(/\n/g, "<br/>"))
                  }}
                />
              );
            }
          }
        }
        flushMathGroup(`${index}-final`);

        return <React.Fragment key={`text-block-${index}`}>{resultElements}</React.Fragment>;
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
