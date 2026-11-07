export type TrailOperation = "addition" | "subtraction" | "mixed";
export type TrailQuestion = {
  start: number;
  steps: number;
  operation: "addition" | "subtraction";
  answer: number;
};

export function createTrailQuestions(
  operation: TrailOperation,
  random: () => number = Math.random,
): TrailQuestion[] {
  return Array.from({ length: 5 }, () => {
    const chosen =
      operation === "mixed"
        ? random() < 0.5
          ? "addition"
          : "subtraction"
        : operation;
    const steps = Math.floor(random() * 5) + 1;
    const start =
      chosen === "addition"
        ? Math.floor(random() * (11 - steps))
        : steps + Math.floor(random() * (11 - steps));
    return {
      start,
      steps,
      operation: chosen,
      answer: chosen === "addition" ? start + steps : start - steps,
    };
  });
}
