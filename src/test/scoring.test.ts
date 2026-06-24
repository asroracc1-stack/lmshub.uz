import { describe, it, expect } from "vitest";
import { SATCalculator, getExamCalculator } from "../lib/scoring";

describe("SAT Calculator & Conversions", () => {
  const calculator = getExamCalculator("sat") as SATCalculator;

  it("should output 400 for 0 correct answers", () => {
    const score = calculator.calculate(0, 98, []);
    expect(score).toBe(400);
  });

  it("should output 1600 for 100% correct answers", () => {
    const details = Array.from({ length: 98 }, (_, i) => ({
      questionId: `q-${i}`,
      userAns: "A",
      correctAns: "A",
      ok: true,
      qtype: i < 54 ? "rw" : "math"
    }));
    const score = calculator.calculate(98, 98, details);
    expect(score).toBe(1600);
  });

  it("should correctly split modules and compute sub-section scores", () => {
    // 54 RW questions: 27 correct
    // 44 Math questions: 22 correct
    const details = [
      ...Array.from({ length: 54 }, (_, i) => ({
        questionId: `rw-${i}`,
        userAns: i < 27 ? "A" : "B",
        correctAns: "A",
        ok: i < 27,
        qtype: "reading"
      })),
      ...Array.from({ length: 44 }, (_, i) => ({
        questionId: `math-${i}`,
        userAns: i < 22 ? "A" : "B",
        correctAns: "A",
        ok: i < 22,
        qtype: "math"
      }))
    ];

    const breakdown = calculator.calculateBreakdown(49, 98, details);
    expect(breakdown.rwCorrect).toBe(27);
    expect(breakdown.rwTotal).toBe(54);
    expect(breakdown.mathCorrect).toBe(22);
    expect(breakdown.mathTotal).toBe(44);
    expect(breakdown.rwScore).toBeGreaterThanOrEqual(200);
    expect(breakdown.rwScore).toBeLessThanOrEqual(800);
    expect(breakdown.mathScore).toBeGreaterThanOrEqual(200);
    expect(breakdown.mathScore).toBeLessThanOrEqual(800);
    expect(breakdown.totalScore).toBe(breakdown.rwScore + breakdown.mathScore);
  });
});
