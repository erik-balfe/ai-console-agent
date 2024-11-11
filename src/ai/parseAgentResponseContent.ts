interface ParsedAgentResponse {
  responseText: string;
  responseDetails: string;
  isFinalAnswer: boolean;
}
export function parseAgentResponseContent(responseContent: string): ParsedAgentResponse {
  const finalResultMatch = responseContent.match(/<final_result>([\s\S]*?)<\/final_result>/i);
  const finalResultDetailsMatch = responseContent.match(
    /<final_result_details>([\s\S]*?)<\/final_result_details>/i,
  );

  const responseText = finalResultMatch && finalResultMatch[1] ? finalResultMatch[1].trim() : "";

  const responseDetails =
    finalResultDetailsMatch && finalResultDetailsMatch[1] ? finalResultDetailsMatch[1].trim() : "";

  return {
    responseText,
    responseDetails,
    isFinalAnswer: Boolean(responseText),
  };
}

export function extractQuestionToUser(responseContent: string): {
  questionToUser: string;
  optionsForUser: string[];
} {
  const questionMatch = responseContent.match(/<askUser>([\s\S]*?)<\/askUser>/i);
  let question = questionMatch && questionMatch[1] ? questionMatch[1].trim() : "";

  const optionsMatches = question.match(/<answerOption>(.*?)<\/answerOption>/g) || [];
  const options = optionsMatches.map((option: string) => option.replace(/<\/?answerOption>/g, "").trim());

  optionsMatches.forEach((match) => {
    question = question.replace(match, "");
  });
  question = question.trim();

  return {
    questionToUser: question,
    optionsForUser: options,
  };
}

export const informUserTag = "inform_user";

export interface ParsedAgentMessage {
  finalResponse?: {
    text: string;
    details: string;
  };
  informUserMessages: string[];
  taskComplete: boolean;
}

export function parseAgentMessage(content: string): ParsedAgentMessage {
  const result: ParsedAgentMessage = {
    finalResponse: { text: "", details: "" },
    informUserMessages: [],
    taskComplete: false,
  };

  // Remove thought process content first
  const cleanContent = content.replace(/<thought_process>[\s\S]*?<\/thought_process>/g, "").trim();

  if (cleanContent) {
    // If there's content outside thought_process, add it to informUserMessages
    result.informUserMessages.push(cleanContent);
  }

  // Check for task completion
  result.taskComplete = content.includes("<exit />");

  return result;
}
