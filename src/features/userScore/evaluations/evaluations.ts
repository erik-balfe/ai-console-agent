export async function getRelevancy({ messages, toolCalls, conversationData }: any): Promise<number> {
  // Mock function for relevancy score
  return 1;
}

export async function getFaithfulness({ messages, toolCalls, conversationData }: any): Promise<number> {
  // Mock function for faithfulness score
  return 1;
}

export async function getCorrectness({ messages, toolCalls, conversationData }: any): Promise<number> {
  // Mock function for correctness score
  return 1;
}
