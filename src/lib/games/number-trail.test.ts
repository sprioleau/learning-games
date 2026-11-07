import { describe, expect, it } from "vitest";
import { createTrailQuestions } from "./number-trail";

describe("number trail questions", () => {
  it.each(["addition", "subtraction", "mixed"] as const)(
    "generates five solvable %s questions within the number line",
    (operation) => {
      for (const randomValue of [0, 0.49, 0.99]) {
        const questions = createTrailQuestions(operation, () => randomValue);
        expect(questions).toHaveLength(5);
        for (const question of questions) {
          expect(question.start).toBeGreaterThanOrEqual(0);
          expect(question.start).toBeLessThanOrEqual(10);
          expect(question.answer).toBeGreaterThanOrEqual(0);
          expect(question.answer).toBeLessThanOrEqual(10);
          expect(question.answer).toBe(
            question.operation === "addition"
              ? question.start + question.steps
              : question.start - question.steps,
          );
          if (operation !== "mixed") expect(question.operation).toBe(operation);
        }
      }
    },
  );
});
