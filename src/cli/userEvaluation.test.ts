import { debug } from "../utils/logger";
import { getUserEvaluation } from "./userEvaluation";

const testUserEvaluation = async () => {
  const rating = await getUserEvaluation();
  debug(`User rating: ${rating}`);
};

testUserEvaluation();
