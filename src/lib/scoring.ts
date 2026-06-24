export interface ScoreCalculator {
  calculate(correct: number, total: number, details?: any[], exam?: any): number | string;
}

export class SATCalculator implements ScoreCalculator {
  calculate(correct: number, total: number, details?: any[], exam?: any): number {
    const { totalScore } = this.calculateBreakdown(correct, total, details, exam);
    return totalScore;
  }

  calculateBreakdown(correct: number, total: number, details?: any[], exam?: any) {
    if (total === 0) {
      return {
        rwCorrect: 0,
        rwTotal: 0,
        rwScore: 200,
        mathCorrect: 0,
        mathTotal: 0,
        mathScore: 200,
        totalScore: 400
      };
    }

    let rwCorrect = 0;
    let rwTotal = 0;
    let mathCorrect = 0;
    let mathTotal = 0;

    const items = details || [];
    if (items.length > 0) {
      items.forEach((item: any) => {
        const category = (item.qtype || item.category || "").toLowerCase();
        const prompt = (item.prompt || "").toLowerCase();

        // Check if question belongs to Math section
        const isMath = category.includes("math") || 
                       category.includes("calcul") || 
                       category.includes("algebra") || 
                       category.includes("geometry") || 
                       category.includes("trig") ||
                       category.includes("problem solving") ||
                       category.includes("data analysis") ||
                       prompt.includes("\\(") || 
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

    // Realistic Digital SAT RW Table mapping (out of 54 questions)
    const getRWScore = (correctCount: number, totalCount: number): number => {
      if (totalCount === 0) return 200;
      // Scale correct count to standard 54 questions
      const scaledCorrect = Math.round((correctCount / totalCount) * 54);
      
      const table: Record<number, number> = {
        54: 800, 53: 790, 52: 780, 51: 770, 50: 760, 49: 740, 48: 730, 47: 720, 46: 710, 45: 700,
        44: 690, 43: 680, 42: 670, 41: 660, 40: 650, 39: 640, 38: 630, 37: 620, 36: 610, 35: 600,
        34: 590, 33: 580, 32: 570, 31: 560, 30: 550, 29: 540, 28: 530, 27: 520, 26: 510, 25: 500,
        24: 490, 23: 480, 22: 470, 21: 460, 20: 450, 19: 440, 18: 430, 17: 420, 16: 410, 15: 400,
        14: 390, 13: 380, 12: 370, 11: 360, 10: 350, 9: 340, 8: 320, 7: 300, 6: 280, 5: 260,
        4: 240, 3: 220, 2: 210, 1: 205, 0: 200
      };
      
      return table[scaledCorrect] ?? 200;
    };

    // Realistic Digital SAT Math Table mapping (out of 44 questions)
    const getMathScore = (correctCount: number, totalCount: number): number => {
      if (totalCount === 0) return 200;
      // Scale correct count to standard 44 questions
      const scaledCorrect = Math.round((correctCount / totalCount) * 44);

      const table: Record<number, number> = {
        44: 800, 43: 790, 42: 780, 41: 770, 40: 750, 39: 740, 38: 730, 37: 720, 36: 700, 35: 690,
        34: 680, 33: 670, 32: 660, 31: 650, 30: 640, 29: 630, 28: 620, 27: 610, 26: 600, 25: 590,
        24: 580, 23: 570, 22: 560, 21: 550, 20: 540, 19: 530, 18: 520, 17: 510, 16: 500, 15: 490,
        14: 480, 13: 470, 12: 460, 11: 450, 10: 430, 9: 410, 8: 390, 7: 370, 6: 350, 5: 320,
        4: 290, 3: 265, 2: 240, 1: 220, 0: 200
      };

      return table[scaledCorrect] ?? 200;
    };

    if (rwTotal === 0 && mathTotal === 0) {
      const ratio = correct / total;
      rwTotal = Math.round(total * 54 / 98);
      mathTotal = total - rwTotal;
      rwCorrect = Math.round(ratio * rwTotal);
      mathCorrect = correct - rwCorrect;
    }

    const rwScore = getRWScore(rwCorrect, rwTotal);
    const mathScore = getMathScore(mathCorrect, mathTotal);
    const totalScore = rwScore + mathScore;

    return {
      rwCorrect,
      rwTotal,
      rwScore,
      mathCorrect,
      mathTotal,
      mathScore,
      totalScore
    };
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
