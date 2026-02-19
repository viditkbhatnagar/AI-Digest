import { generateEmbedding } from "./openai";

interface Embeddable {
  id: string;
  text: string;
}

const EMBEDDING_BATCH_SIZE = 5;
const EMBEDDING_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateBatchEmbeddings(
  items: Embeddable[]
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = items.slice(i, i + EMBEDDING_BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const embedding = await generateEmbedding(item.text);
        return { id: item.id, embedding };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.set(result.value.id, result.value.embedding);
      } else {
        errors.push(result.reason?.message ?? "Unknown embedding error");
      }
    }

    if (i + EMBEDDING_BATCH_SIZE < items.length) {
      await delay(EMBEDDING_DELAY_MS);
    }
  }

  if (errors.length > 0) {
    console.warn(
      `[embeddings] ${errors.length} failures:`,
      errors.slice(0, 5)
    );
  }

  console.log(
    `[embeddings] Generated ${results.size}/${items.length} embeddings`
  );
  return results;
}
