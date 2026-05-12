import { createHash } from "node:crypto";

const DEFAULT_DIMENSIONS = 1024;

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  embedding?: number[];
};

export function getEmbeddingModel() {
  return process.env.EMBEDDING_MODEL || "BAAI/bge-m3";
}

export function getEmbeddingDimensions() {
  return Number(process.env.EMBEDDING_DIMENSIONS || DEFAULT_DIMENSIONS);
}

export async function embedText(input: string) {
  const [embedding] = await embedMany([input]);
  return embedding;
}

export async function embedMany(inputs: string[]) {
  const apiKey = process.env.EMBEDDING_API_KEY;
  const baseUrl = process.env.EMBEDDING_API_BASE_URL;

  if (!apiKey || !baseUrl) {
    if (process.env.NODE_ENV !== "production" && process.env.ALLOW_FAKE_EMBEDDINGS !== "false") {
      return inputs.map(fakeEmbedding);
    }

    throw new Error("EMBEDDING_API_BASE_URL and EMBEDDING_API_KEY are required.");
  }

  const response = await fetch(joinUrl(baseUrl, "/embeddings"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input: inputs,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding provider failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  const embeddings = payload.data?.map((item) => item.embedding).filter(Boolean) as number[][];

  if (!embeddings?.length && payload.embedding) {
    return [payload.embedding];
  }

  if (!embeddings || embeddings.length !== inputs.length) {
    throw new Error("Embedding provider returned an unexpected response shape.");
  }

  return embeddings.map(assertEmbeddingDimensions);
}

function assertEmbeddingDimensions(embedding: number[]) {
  const expected = getEmbeddingDimensions();
  if (embedding.length !== expected) {
    throw new Error(`Embedding dimension mismatch. Expected ${expected}, received ${embedding.length}.`);
  }
  return embedding;
}

function fakeEmbedding(input: string) {
  const dimensions = getEmbeddingDimensions();
  const values = new Array<number>(dimensions);
  let seed = createHash("sha256").update(input).digest();

  for (let index = 0; index < dimensions; index += 1) {
    if (index % seed.length === 0) {
      seed = createHash("sha256").update(seed).update(String(index)).digest();
    }
    values[index] = (seed[index % seed.length] / 255) * 2 - 1;
  }

  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => Number((value / magnitude).toFixed(8)));
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
