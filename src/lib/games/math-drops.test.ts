import { describe, expect, it } from "vitest";
import { createMathProblem, mathOperations } from "./math-drops";

describe("math drops problems", () => {
  it.each(mathOperations)(
    "generates solvable %s facts with nonnegative whole-number answers",
    (operation) => {
      for (let index = 0; index < 100; index++) {
        const problem = createMathProblem(operation);
        const [left, sign, right] = problem.expression.split(" ");
        const a = Number(left);
        const b = Number(right);
        const expected =
          sign === "+"
            ? a + b
            : sign === "−"
              ? a - b
              : sign === "×"
                ? a * b
                : a / b;
        expect(problem.answer).toBe(expected);
        expect(Number.isInteger(problem.answer) && problem.answer >= 0).toBe(
          true,
        );
      }
    },
  );
});
