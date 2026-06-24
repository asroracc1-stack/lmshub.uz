export interface ScoreCalculator {
  calculate(correct: number, total: number, details?: any[], exam?: any): number | string;
}

export class SATCalculator implements ScoreCalculator {
  calculate(correct: number, total: number, details?: any[], exam?: any): number {
    if (total === 0) return 200;

    // Split questions into Reading & Writing (RW) and Math
    let rwCorrect = 0;
    let rwTotal = 0;
    let mathCorrect = 0;
    let mathTotal = 0;

    const items = details || [];
    if (items.length > 0) {
      items.forEach((item: any) => {
        const prompt = (item.prompt || "").toLowerCase();
        const category = (item.qtype || item.category || "").toLowerCase();

        // Detect Math questions based on markers
        const isMath = category.includes("math") || 
                       category.includes("calcul") || 
                       category.includes("algebra") || 
                       category.includes("geometry") || 
                       category.includes("trig") ||
                       prompt.includes("\\(") || // LaTeX notation
                       prompt.includes("$$");

        if (isMath) {
          mathTotal++;
          if (item.ok) mathCorrect++;
        } else {
          rwTotal++;
          if (item.ok) rwCorrect++;
        }
      });
    }

    // Realistic Digital SAT Section scaled score calculation (200 - 800)
    const getSATSectionScore = (c: number, t: number): number => {
      if (t === 0) return 400; // default mid-score for missing section
      const ratio = c / t;
      if (ratio >= 1.0) return 800;
      if (ratio <= 0.0) return 200;

      // Realistic SAT curve: S-curve shape to simulate standard College Board scoring
      if (ratio >= 0.90) {
        return 700 + Math.round((ratio - 0.90) * 1000); // e.g. 90% is 700, 95% is 750, 100% is 800
      } else if (ratio >= 0.50) {
        return 450 + Math.round(((ratio - 0.50) / 0.40) * 25) * 10; // e.g. 50% is 450, 70% is 575
      } else {
        return 200 + Math.round((ratio / 0.50) * 25) * 10; // e.g. 20% is 300, 40% is 400
      }
    };

    // If both sections are present, sum them (Range: 400 - 1600)
    if (rwTotal > 0 && mathTotal > 0) {
      return getSATSectionScore(rwCorrect, rwTotal) + getSATSectionScore(mathCorrect, mathTotal);
    }

    // If it's a short test (<= 30 questions) and only one section is found,
    // let's return a single section score scaled from 200 to 800.
    if (total <= 30) {
      return getSATSectionScore(correct, total);
    }

    // Fallback combined score when questions aren't cleanly categorized
    const rwPart = Math.round(correct / 2);
    const mathPart = correct - rwPart;
    const rwTotalPart = Math.round(total / 2);
    const mathTotalPart = total - rwTotalPart;
    return getSATSectionScore(rwPart, rwTotalPart) + getSATSectionScore(mathPart, mathTotalPart);
  }
}

export class IELTSCalculator implements ScoreCalculator {
  calculate(correct: number, total: number, details?: any[], exam?: any): number {
    const kind = (exam?.type ?? "").toLowerCase();

    // Scale current score to IELTS 40-question standard scale
    const scaledRaw = Math.round((correct / Math.max(total, 1)) * 40);

    const READING_BAND: Record<number, number> = {
      39: 9.0, 40: 9.0,
      37: 8.5, 38: 8.5,
      35: 8.0, 36: 8.0,
      33: 7.5, 34: 7.5,
      30: 7.0, 31: 7.0, 32: 7.0,
      27: 6.5, 28: 6.5, 29: 6.5,
      23: 6.0, 24: 6.0, 25: 6.0, 26: 6.0,
      19: 5.5, 20: 5.5, 21: 5.5, 22: 5.5,
      15: 5.0, 16: 5.0, 17: 5.0, 18: 5.0,
      13: 4.5, 14: 4.5,
      10: 4.0, 11: 4.0, 12: 4.0,
      8: 3.5, 9: 3.5,
      6: 3.0, 7: 3.0,
      4: 2.5, 5: 2.5,
    };

    const LISTENING_BAND: Record<number, number> = {
      39: 9.0, 40: 9.0,
      37: 8.5, 38: 8.5,
      35: 8.0, 36: 8.0,
      32: 7.5, 33: 7.5, 34: 7.5,
      30: 7.0, 31: 7.0,
      26: 6.5, 27: 6.5, 28: 6.5, 29: 6.5,
      23: 6.0, 24: 6.0, 25: 6.0,
      18: 5.5, 19: 5.5, 20: 5.5, 21: 5.5, 22: 5.5,
      16: 5.0, 17: 5.0,
      13: 4.5, 14: 4.5, 15: 4.5,
      10: 4.0, 11: 4.0, 12: 4.0,
      8: 3.5, 9: 3.5,
      6: 3.0, 7: 3.0,
      4: 2.5, 5: 2.5,
    };

    const table = kind.includes("listening") ? LISTENING_BAND : READING_BAND;
    if (table[scaledRaw] !== undefined) return table[scaledRaw];
    if (scaledRaw <= 3) return 2.0;
    if (scaledRaw >= 40) return 9.0;

    // Find closest lower band matching standard IELTS conversions
    for (let i = scaledRaw; i >= 4; i--) {
      if (table[i] !== undefined) return table[i];
    }
    return 2.0;
  }
}

export class NationalCertificateCalculator implements ScoreCalculator {
  calculate(correct: number, total: number, details?: any[], exam?: any): number {
    if (total === 0) return 0;

    // Use points-weighted scale if details exist, otherwise fallback to direct percent
    const items = details || [];
    if (items.length > 0) {
      let totalPoints = 0;
      let correctPoints = 0;
      items.forEach((item: any) => {
        const pts = Number(item.points ?? 1);
        totalPoints += pts;
        if (item.ok) {
          correctPoints += pts;
        }
      });
      if (totalPoints > 0) {
        return Math.round((correctPoints / totalPoints) * 100);
      }
    }

    return Math.round((correct / total) * 100);
  }
}

export class CustomExamCalculator implements ScoreCalculator {
  calculate(correct: number, total: number, details?: any[], exam?: any): string {
    if (total === 0) return "0%";
    return Math.round((correct / total) * 100) + "%";
  }
}

export function getExamCalculator(kind: string): ScoreCalculator {
  const k = kind.toLowerCase();
  if (k === "sat") {
    return new SATCalculator();
  }
  if (k === "ielts" || k === "reading" || k === "listening") {
    return new IELTSCalculator();
  }
  if (k === "national_cert" || k === "milliy") {
    return new NationalCertificateCalculator();
  }
  return new CustomExamCalculator();
}
