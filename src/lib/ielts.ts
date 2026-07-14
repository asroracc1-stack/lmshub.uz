import { getExamCalculator } from "./scoring";

// Official IELTS band score conversion tables (Academic Reading & Listening)
// Source: British Council / IDP IELTS published conversion tables.

export const READING_BAND: Record<number, number> = {
  39: 9, 40: 9,
  37: 8.5, 38: 8.5,
  35: 8, 36: 8,
  33: 7.5, 34: 7.5,
  30: 7, 31: 7, 32: 7,
  27: 6.5, 28: 6.5, 29: 6.5,
  23: 6, 24: 6, 25: 6, 26: 6,
  19: 5.5, 20: 5.5, 21: 5.5, 22: 5.5,
  15: 5, 16: 5, 17: 5, 18: 5,
  13: 4.5, 14: 4.5,
  10: 4, 11: 4, 12: 4,
  8: 3.5, 9: 3.5,
  6: 3, 7: 3,
  4: 2.5, 5: 2.5,
};
 
export const LISTENING_BAND: Record<number, number> = {
  39: 9, 40: 9,
  37: 8.5, 38: 8.5,
  35: 8, 36: 8,
  32: 7.5, 33: 7.5, 34: 7.5,
  30: 7, 31: 7,
  26: 6.5, 27: 6.5, 28: 6.5, 29: 6.5,
  23: 6, 24: 6, 25: 6,
  18: 5.5, 19: 5.5, 20: 5.5, 21: 5.5, 22: 5.5,
  16: 5, 17: 5,
  13: 4.5, 14: 4.5, 15: 4.5,
  10: 4, 11: 4, 12: 4,
  8: 3.5, 9: 3.5,
  6: 3, 7: 3,
  4: 2.5, 5: 2.5,
};

export function rawToBand(kind: string, raw: number, total: number): number {
  const calc = getExamCalculator(kind);
  return calc.calculate(raw, total, undefined, { type: kind }) as number;
}

/** SAT scoring: 200–800 per section (or combined 400-1600 if using SATCalculator) */
export function satScore(correct: number, total: number): number {
  const calc = getExamCalculator("sat");
  return calc.calculate(correct, total) as number;
}

/** Milliy Sertifikat: 0–100 */
export function milliyScore(correct: number, total: number): number {
  const calc = getExamCalculator("national_cert");
  return calc.calculate(correct, total) as number;
}

/** Returns color class based on accuracy percentage */
export function scoreLevel(pct: number): { color: string; label: string } {
  if (pct >= 90) return { color: "text-emerald-500", label: "Ajoyib" };
  if (pct >= 75) return { color: "text-violet-500", label: "Yaxshi" };
  if (pct >= 60) return { color: "text-amber-500", label: "O'rtacha" };
  if (pct >= 40) return { color: "text-orange-500", label: "Zaif" };
  return { color: "text-rose-500", label: "Qoniqarsiz" };
}

export function normalizeAnswer(s: string): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?;:'"`]/g, "");
}

export function checkAnswer(user: string, correct: string): boolean {
  if (!correct) return false;
  const u = normalizeAnswer(user);
  // Allow multiple acceptable answers separated by / or |
  const variants = correct.split(/[/|]/).map((x) => normalizeAnswer(x));
  return variants.some((v) => v && (u === v || u === v.replace(/^(the|a|an) /, "")));
}
