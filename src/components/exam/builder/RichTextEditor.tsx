import React, { useRef, useEffect, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline, List, ListOrdered,
  Link2, Code, Subscript, Superscript, AlignLeft,
  AlignCenter, AlignRight, Smile,
  Sigma as FunctionIcon, Type, Palette, Quote,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// ============================================================
// LaTeX Formula Toolbar with common formulas
// ============================================================
const LATEX_TEMPLATES = [
  { label: "x²", latex: "x^{2}" },
  { label: "√x", latex: "\\sqrt{x}" },
  { label: "x/y", latex: "\\frac{x}{y}" },
  { label: "∫", latex: "\\int_{a}^{b}" },
  { label: "∑", latex: "\\sum_{i=1}^{n}" },
  { label: "π", latex: "\\pi" },
  { label: "∞", latex: "\\infty" },
  { label: "≤", latex: "\\leq" },
  { label: "≥", latex: "\\geq" },
  { label: "≠", latex: "\\neq" },
  { label: "±", latex: "\\pm" },
  { label: "×", latex: "\\times" },
  { label: "÷", latex: "\\div" },
  { label: "α", latex: "\\alpha" },
  { label: "β", latex: "\\beta" },
  { label: "θ", latex: "\\theta" },
  { label: "Δ", latex: "\\Delta" },
  { label: "λ", latex: "\\lambda" },
  { label: "μ", latex: "\\mu" },
  { label: "σ", latex: "\\sigma" },
  { label: "Matrix", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
  { label: "Lim", latex: "\\lim_{x \\to \\infty}" },
  { label: "log", latex: "\\log_{b}(x)" },
  { label: "sin", latex: "\\sin(x)" },
];

// ============================================================
// RichTextEditor Component
// A professional contenteditable-based editor with full formatting
// ============================================================

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  showFormulaBar?: boolean;
  compact?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Matn kiriting...",
  minHeight = 80,
  className,
  showFormulaBar = true,
  compact = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const [formulaInput, setFormulaInput] = React.useState("");
  const [formulaOpen, setFormulaOpen] = React.useState(false);
  const [formulaPreview, setFormulaPreview] = React.useState("");
  const savedRange = useRef<Range | null>(null);

  // Sync value → DOM (avoid infinite loop)
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  // Save selection before popover opens
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restore saved selection
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleChange();
  };

  const handleChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  // Insert LaTeX formula as rendered HTML
  const insertFormula = (latex: string) => {
    if (!latex.trim()) return;
    restoreSelection();
    editorRef.current?.focus();

    let rendered = "";
    try {
      rendered = katex.renderToString(latex, { throwOnError: false, displayMode: false });
    } catch {
      rendered = latex;
    }

    const formulaHtml = `<span class="inline-formula" contenteditable="false" data-latex="${encodeURIComponent(latex)}">${rendered}</span>&nbsp;`;
    document.execCommand("insertHTML", false, formulaHtml);
    handleChange();
    setFormulaInput("");
    setFormulaOpen(false);
  };

  // Preview formula as user types
  useEffect(() => {
    if (!formulaInput.trim()) { setFormulaPreview(""); return; }
    try {
      setFormulaPreview(katex.renderToString(formulaInput, { throwOnError: false, displayMode: false }));
    } catch {
      setFormulaPreview("");
    }
  }, [formulaInput]);

  const toolbarGroups = [
    [
      { icon: <Bold className="h-3.5 w-3.5" />, cmd: "bold",          tip: "Bold (Ctrl+B)"      },
      { icon: <Italic className="h-3.5 w-3.5" />, cmd: "italic",      tip: "Italic (Ctrl+I)"    },
      { icon: <Underline className="h-3.5 w-3.5" />, cmd: "underline", tip: "Underline (Ctrl+U)" },
    ],
    [
      { icon: <Superscript className="h-3.5 w-3.5" />, cmd: "superscript", tip: "Superscript"  },
      { icon: <Subscript className="h-3.5 w-3.5" />, cmd: "subscript",     tip: "Subscript"    },
      { icon: <Code className="h-3.5 w-3.5" />, cmd: "formatBlock",        tip: "Code",  val: "pre" },
    ],
    [
      { icon: <AlignLeft className="h-3.5 w-3.5" />, cmd: "justifyLeft",   tip: "Left"   },
      { icon: <AlignCenter className="h-3.5 w-3.5" />, cmd: "justifyCenter", tip: "Center" },
      { icon: <AlignRight className="h-3.5 w-3.5" />, cmd: "justifyRight",  tip: "Right"  },
    ],
    [
      { icon: <List className="h-3.5 w-3.5" />, cmd: "insertUnorderedList", tip: "Bullet List"  },
      { icon: <ListOrdered className="h-3.5 w-3.5" />, cmd: "insertOrderedList", tip: "Numbered List" },
      { icon: <Quote className="h-3.5 w-3.5" />, cmd: "formatBlock",        tip: "Quote", val: "blockquote" },
    ],
  ];

  const colorOptions = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
    "#000000", "#64748b", "#ffffff",
  ];

  return (
    <TooltipProvider delayDuration={400}>
      <div className={cn("border rounded-xl overflow-hidden bg-background shadow-sm", className)}>
        {/* Toolbar */}
        <div className={cn(
          "flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5",
          "bg-gradient-to-r from-slate-50 to-slate-50/50 dark:from-slate-900/50 dark:to-slate-900/30"
        )}>
          {toolbarGroups.map((group, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 && <div className="w-px h-5 bg-border mx-1" />}
              {group.map((btn) => (
                <Tooltip key={btn.cmd}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/30"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        exec(btn.cmd, (btn as any).val);
                      }}
                    >
                      {btn.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{btn.tip}</TooltipContent>
                </Tooltip>
              ))}
            </React.Fragment>
          ))}

          {/* Color picker */}
          <div className="w-px h-5 bg-border mx-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/30">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" side="bottom">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Text color</p>
              <div className="grid grid-cols-6 gap-1">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform"
                    style={{ background: c }}
                    onMouseDown={(e) => { e.preventDefault(); exec("foreColor", c); }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-7 w-7 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/30"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const url = prompt("URL kiriting:");
                  if (url) exec("createLink", url);
                }}
              >
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Havola qo'shish</TooltipContent>
          </Tooltip>

          {/* Formula picker */}
          {showFormulaBar && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <Popover open={formulaOpen} onOpenChange={(o) => {
                if (o) saveSelection();
                setFormulaOpen(o);
              }}>
                <PopoverTrigger asChild>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-7 w-7 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600"
                  >
                    <FunctionIcon className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" side="bottom" align="start">
                  <p className="text-xs font-semibold text-violet-600 mb-2">LaTeX Formula</p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      className="text-sm font-mono"
                      placeholder="\frac{x}{y} yoki x^{2}..."
                      value={formulaInput}
                      onChange={(e) => setFormulaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertFormula(formulaInput); } }}
                    />
                    <Button
                      size="sm"
                      className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
                      onMouseDown={(e) => { e.preventDefault(); insertFormula(formulaInput); }}
                    >
                      Qo'sh
                    </Button>
                  </div>
                  {formulaPreview && (
                    <div
                      className="mb-2 p-2 bg-muted rounded-md border text-center overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: formulaPreview }}
                    />
                  )}
                  <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Tez kiritish</p>
                  <div className="grid grid-cols-6 gap-1">
                    {LATEX_TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        className="text-[11px] font-mono h-8 w-full rounded border bg-muted hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-300 transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); insertFormula(t.latex); }}
                        title={t.latex}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>

        {/* Editor area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className={cn(
            "px-4 py-3 focus:outline-none text-sm leading-relaxed",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60",
            "prose prose-sm dark:prose-invert max-w-none",
            "[&_.inline-formula]:inline-block [&_.inline-formula]:mx-0.5 [&_.inline-formula]:align-middle",
          )}
          style={{ minHeight }}
          onInput={handleChange}
          onKeyDown={(e) => {
            // Ctrl+B, I, U shortcuts (browser handles these natively with execCommand)
          }}
        />
      </div>
    </TooltipProvider>
  );
};

// ============================================================
// SimpleFormulaInput — lightweight LaTeX input (no rich text)
// ============================================================
interface SimpleFormulaInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export const SimpleFormulaInput: React.FC<SimpleFormulaInputProps> = ({
  value, onChange, placeholder = "$x^2 + y^2$", className
}) => {
  const [preview, setPreview] = React.useState("");

  useEffect(() => {
    if (!value.trim()) { setPreview(""); return; }
    try {
      const tex = value.replace(/^\$\$?([\s\S]+?)\$?\$?$/, "$1").trim();
      setPreview(katex.renderToString(tex, { throwOnError: false, displayMode: false }));
    } catch { setPreview(""); }
  }, [value]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Input
        className="font-mono text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {preview && (
        <div
          className="px-3 py-2 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-lg text-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
