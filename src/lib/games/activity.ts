import { z } from "zod";
import { createTrailQuestions } from "./number-trail";
import { cafeOrders, isCafeOrderComplete } from "./fraction-cafe";
import { createMathProblem, mathOperations } from "./math-drops";
import { puzzleSizes } from "./jigsaw";

export const activityGameSchema = z.enum([
  "number-trail",
  "fraction-cafe",
  "math-drops",
  "word-builder",
  "jigsaw",
]);
export const activityModeSchema = z.enum([
  "addition",
  "subtraction",
  "mixed",
  "multiplication",
  "division",
  "default",
  "3x3",
  "4x5",
  "7x7",
  "7x8",
]);
export const activityAnswerSchema = z.union([
  z.number().int(),
  z.string().max(40),
  z.array(z.number().int()).max(4),
]);
export const activityQuestionSchema = z.object({
  prompt: z.string(),
  answer: activityAnswerSchema,
  payload: z.string(),
});
export const activitySessionSchema = z.object({
  id: z.string(),
  gameId: activityGameSchema,
  worldId: z.string(),
  mode: activityModeSchema,
  questions: z.array(activityQuestionSchema),
  answers: z.array(activityAnswerSchema),
  cursor: z.number().int().min(0),
  revision: z.number().int().min(0),
  phase: z.enum(["playing", "won"]),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
});
export type ActivitySession = z.infer<typeof activitySessionSchema>;
export type ActivityAnswer = z.infer<typeof activityAnswerSchema>;
export type ActivityGame = z.infer<typeof activityGameSchema>;
export type ActivityMode = z.infer<typeof activityModeSchema>;

const wordPuzzles = [
  {
    word: "fox",
    picture: "little-fox",
    sentence: "The fox has a fluffy tail.",
  },
  { word: "crab", picture: "crab", sentence: "The crab walks on the sand." },
  {
    word: "fish",
    picture: "tropical-fish",
    sentence: "The fish swims in the sea.",
  },
  { word: "frog", picture: null, sentence: "The frog jumps in the pond." },
  { word: "boat", picture: "sailboat", sentence: "The boat sails on the sea." },
];
export function createActivitySession(
  id: string,
  gameId: ActivityGame,
  worldId: string,
  mode: ActivityMode,
  now = Date.now(),
  sceneIndex = 0,
): ActivitySession {
  let questions: ActivitySession["questions"];
  if (gameId === "number-trail") {
    if (mode !== "addition" && mode !== "subtraction" && mode !== "mixed")
      throw new Error("Invalid activity mode");
    questions = createTrailQuestions(mode).map((item) => ({
      prompt: `${item.start} ${item.operation === "addition" ? "+" : "−"} ${item.steps}`,
      answer: item.answer,
      payload: JSON.stringify(item),
    }));
  } else if (gameId === "fraction-cafe") {
    if (mode !== "default") throw new Error("Invalid activity mode");
    questions = cafeOrders.map((item) => ({
      prompt: `${item.numerator}/${item.denominator}`,
      answer: item.numerator,
      payload: JSON.stringify(item),
    }));
  } else if (gameId === "jigsaw") {
    const size = puzzleSizes.find((item) => item.id === mode);
    if (!size) throw new Error("Invalid activity mode");
    questions = Array.from({ length: size.rows * size.columns }, (_, id) => ({
      prompt: `Piece ${id + 1}`,
      answer: id,
      payload: JSON.stringify({ sceneIndex }),
    }));
  } else if (gameId === "word-builder") {
    if (mode !== "default") throw new Error("Invalid activity mode");
    questions = wordPuzzles.map((item) => ({
      prompt: item.word,
      answer: item.word,
      payload: JSON.stringify(item),
    }));
  } else {
    if (!(mathOperations as readonly string[]).includes(mode))
      throw new Error("Invalid activity mode");
    questions = Array.from({ length: 8 }, () => {
      const item = createMathProblem(mode as (typeof mathOperations)[number]);
      return {
        prompt: item.expression,
        answer: item.answer,
        payload: JSON.stringify(item),
      };
    });
  }
  return {
    id,
    gameId,
    worldId,
    mode,
    questions,
    answers: [],
    cursor: 0,
    revision: 0,
    phase: "playing",
    createdAt: now,
    completedAt: null,
  };
}
export function answerActivity(
  session: ActivitySession,
  answer: ActivityAnswer,
  now = Date.now(),
): {
  session: ActivitySession;
  outcome: "correct" | "incorrect" | "won" | "ignored";
} {
  const question = session.questions[session.cursor];
  if (session.phase !== "playing" || !question)
    return { session, outcome: "ignored" };
  const isCorrect =
    session.gameId === "jigsaw"
      ? typeof answer === "number" &&
        Number.isInteger(answer) &&
        answer >= 0 &&
        answer < session.questions.length &&
        !session.answers.includes(answer)
      : session.gameId === "fraction-cafe"
        ? Array.isArray(answer) &&
          isCafeOrderComplete(JSON.parse(question.payload), answer)
        : !Array.isArray(answer) && answer === question.answer;
  if (!isCorrect) return { session, outcome: "incorrect" };
  const cursor = session.cursor + 1;
  const hasWon = cursor === session.questions.length;
  return {
    session: {
      ...session,
      answers: [...session.answers, answer],
      cursor,
      revision: session.revision + 1,
      phase: hasWon ? "won" : "playing",
      completedAt: hasWon ? now : null,
    },
    outcome: hasWon ? "won" : "correct",
  };
}

export function skipMathDrop(session: ActivitySession): ActivitySession | null {
  const current = session.questions[session.cursor];
  if (
    session.gameId !== "math-drops" ||
    session.phase !== "playing" ||
    !current ||
    !(mathOperations as readonly string[]).includes(session.mode)
  )
    return null;
  const mode = session.mode as (typeof mathOperations)[number];
  let problem = createMathProblem(mode);
  for (
    let attempt = 0;
    attempt < 12 && problem.expression === current.prompt;
    attempt++
  )
    problem = createMathProblem(mode);
  if (problem.expression === current.prompt) {
    const alternatives = {
      addition: [
        { expression: "0 + 0", answer: 0 },
        { expression: "1 + 0", answer: 1 },
      ],
      subtraction: [
        { expression: "1 − 0", answer: 1 },
        { expression: "2 − 0", answer: 2 },
      ],
      multiplication: [
        { expression: "1 × 1", answer: 1 },
        { expression: "1 × 2", answer: 2 },
      ],
      division: [
        { expression: "1 ÷ 1", answer: 1 },
        { expression: "2 ÷ 1", answer: 2 },
      ],
    };
    problem = alternatives[mode].find(
      (item) => item.expression !== current.prompt,
    )!;
  }
  const questions = [...session.questions];
  questions[session.cursor] = {
    prompt: problem.expression,
    answer: problem.answer,
    payload: JSON.stringify(problem),
  };
  return { ...session, questions, revision: session.revision + 1 };
}
