import { getCircularReplacer } from "./getCircularReplacer";


export function parseAgentResponse(response: any) {
    let textAnswer: string = "";
    // Anthropic returns an array of messages with 'content' property
    if (typeof response.output?.message.content === "string") {
        textAnswer = response.output.message.content;
    } else if (Array.isArray(response.output?.message.content)) {
        const lastMessage = response.output?.message.content.at(-1);
        textAnswer = lastMessage.type === "text" ? lastMessage.text : "(non text answer)";
    } else {
        console.debug("response to parse:", JSON.stringify(response, getCircularReplacer(), 2));
        throw Error("cant get response message text content:");
    }

    const usage = response.output?.raw?.usage ?? { input_tokens: 0, output_tokens: 0 };
    return { content: textAnswer, usage };
}
