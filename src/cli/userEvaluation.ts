import { select } from "@inquirer/prompts";

export async function getUserEvaluation(): Promise<number> {
  const ratingOptions = [
    { name: "Excellent, made exactly what I wanted and even better than I expected", value: 5 },
    { name: "Satisfactory, met my expectations", value: 4 },
    { name: "Neutral, neither good nor bad / I do not want to rate", value: 3 },
    { name: "Unsatisfactory, did not meet my expectations", value: 2 },
    { name: "Not what I wanted at all", value: 1 },
  ];

  const confirmationNote =
    "Your feedback will be used for future adaptations of the agent to better suit your needs.";

  const message = `How would you rate this agent's usefulness?\n${confirmationNote}`;
  // Display a message explaining the purpose of the feedback

  const selectedOption = await select({
    message,
    choices: ratingOptions.map((option) => ({
      name: option.name,
      value: option.value,
    })),
  });

  // If the user chooses not to rate, default to 3
  return selectedOption === null ? 3 : selectedOption;
}

// new version with another library that currently works with errors:
// import { select } from "@topcli/prompts";

// export async function getUserEvaluation(): Promise<number> {
//   const ratingOptions = [
//     { label: "Excellent, made exactly what I wanted and even better than I expected", value: 5 },
//     { label: "Satisfactory, met my expectations", value: 4 },
//     { label: "Neutral, neither good nor bad / I do not want to rate", value: 3 },
//     { label: "Unsatisfactory, did not meet my expectations", value: 2 },
//     { label: "Not what I wanted at all", value: 1 },
//   ];

//   const confirmationNote =
//     "Your feedback will be used for future adaptations of the agent to better suit your needs.";

//   const message = `How would you rate this agent's usefulness?\n${confirmationNote}`;

//   // Log the confirmation note as specified
//   console.log(confirmationNote);

//   const selectedOption = await select(message, {
//     choices: ratingOptions.map((option) => option.label), // Just display labels
//   });

//   // Map selected label back to its value
//   const ratingValue = ratingOptions.find((option) => option.label === selectedOption)?.value || 3;

//   return ratingValue; // Defaults to 3 if not found
// }
