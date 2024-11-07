import { getUserEvaluation } from "./userEvaluation";

const testUserEvaluation = async () => {
  const rating = await getUserEvaluation();
  console.log(`User rating: ${rating}`);
};

testUserEvaluation();
