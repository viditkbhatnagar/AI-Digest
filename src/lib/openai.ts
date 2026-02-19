import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000), // Stay within token limits
  });
  return response.data[0].embedding;
}

type ReasoningEffort = "low" | "medium" | "high";

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    maxTokens?: number;
    reasoningEffort?: ReasoningEffort;
  }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: options?.maxTokens ?? 1024,
    reasoning_effort: options?.reasoningEffort ?? "low",
  });
  return response.choices[0].message.content ?? "";
}

export async function chatCompletionJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    maxTokens?: number;
    reasoningEffort?: ReasoningEffort;
  }
): Promise<T> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: options?.maxTokens ?? 2048,
    response_format: { type: "json_object" },
    reasoning_effort: options?.reasoningEffort ?? "low",
  });
  return JSON.parse(response.choices[0].message.content ?? "{}") as T;
}

export default openai;
