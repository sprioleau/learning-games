export const mathOperations = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
] as const;
export type MathOperation = (typeof mathOperations)[number];
export type MathProblem = { expression: string; answer: number };

export function createMathProblem(
  operation: MathOperation,
  random: () => number = Math.random,
): MathProblem {
  function integer(min: number, max: number) {
    return min + Math.floor(random() * (max - min + 1));
  }
  if (operation === "addition") {
    const left = integer(0, 10);
    const right = integer(0, 10);
    return { expression: `${left} + ${right}`, answer: left + right };
  }
  if (operation === "subtraction") {
    const left = integer(0, 10);
    const right = integer(0, left);
    return { expression: `${left} − ${right}`, answer: left - right };
  }
  const left = integer(1, 10);
  const right = integer(1, 10);
  if (operation === "multiplication")
    return { expression: `${left} × ${right}`, answer: left * right };
  return { expression: `${left * right} ÷ ${left}`, answer: right };
}
