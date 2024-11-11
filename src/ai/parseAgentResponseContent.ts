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
  questionToUser?: {
    question: string;
    options: string[];
  };
  informUserMessages: string[];
  taskComplete: boolean;
}

export function parseAgentMessage(message: string): ParsedAgentMessage {
  const { responseText, responseDetails, isFinalAnswer } = parseAgentResponseContent(message);
  const { questionToUser, optionsForUser } = extractQuestionToUser(message);

  const informRegex = new RegExp(`<${informUserTag}>([\\s\\S]*?)</${informUserTag}>`, "g");
  const informMatches = [...(message.matchAll(informRegex) || [])];
  const informMessages = informMatches.map((match) => match[1].trim());
  const taskComplete = message.includes("<exit />");

  return {
    ...(isFinalAnswer && {
      finalResponse: {
        text: responseText,
        details: responseDetails,
      },
    }),
    ...(questionToUser && {
      questionToUser: {
        question: questionToUser,
        options: optionsForUser,
      },
    }),
    taskComplete,
    informUserMessages: informMessages,
  };
}
