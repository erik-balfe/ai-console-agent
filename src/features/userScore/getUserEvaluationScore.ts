import { getUserEvaluation } from "../../cli/userEvaluation";

export async function getUserEvaluationScore() {
  const userEvaluationNumber = await getUserEvaluation();
  const score = normalizeUserEvaluationScore(userEvaluationNumber, [1, 5], [0, 1]);
  return score;
}
function normalizeUserEvaluationScore(
  userEvaluationScore: number,
  initialRange: [number, number] = [1, 5],
  targetRange: [number, number] = [0, 1],
): number {
  const [initialMin, initialMax] = initialRange;
  const [targetMin, targetMax] = targetRange;

  // Validate input score within initial range
  if (userEvaluationScore < initialMin || userEvaluationScore > initialMax) {
    throw new Error(
      `Score ${userEvaluationScore} is out of the initial range [${initialMin}, ${initialMax}].`,
    );
  }

  const normalizedValue =
    ((userEvaluationScore - initialMin) / (initialMax - initialMin)) * (targetMax - targetMin) + targetMin;

  return normalizedValue;
}
