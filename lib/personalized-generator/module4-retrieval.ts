import { CALCULUS_BANK } from "@/lib/personalized-generator/calculus-bank";
import type { SimilarQuestion } from "@/lib/personalized-generator/module4-types";
import fs from "node:fs/promises";
import path from "node:path";

type IndexedQuestion = {
  question_id: string;
  question: string;
  answer: string[] | string;
  step_by_step_solution_text?: string;
  embedding?: number[];
};

function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function cheapVectorize(text: string): number[] {
  const v = new Array<number>(32).fill(0);
  for (const token of text.toLowerCase().split(/\W+/).filter(Boolean)) {
    let h = 0;
    for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) >>> 0;
    v[h % v.length] += 1;
  }
  return v;
}

function normalizeScore(score: number): number {
  if (!Number.isFinite(score) || score < 0) return 0;
  return score;
}

async function loadEmbeddingIndex(): Promise<IndexedQuestion[] | null> {
  const candidates = [
    path.join(process.cwd(), "..", "module4", "question_bank_embeddings_v4.json"),
    path.join(process.cwd(), "module4", "question_bank_embeddings_v4.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as IndexedQuestion[];
    } catch {
      // ignore and continue
    }
  }
  return null;
}

function calculusFallback(query: string, topk: number): SimilarQuestion[] {
  const qv = cheapVectorize(query);
  return CALCULUS_BANK.map((q) => {
    const score = normalizeScore(cosine(qv, cheapVectorize(`${q.title} ${q.stem}`)));
    return {
      question_id: q.id,
      question: q.stem,
      answer: ["N/A"],
      step_by_step_solution_text: "Bank fallback item (no step-by-step solution available in calculus bank).",
      similarity_score: Number(score.toFixed(6)),
    };
  })
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, topk);
}

export async function retrieveTopKSimilarQuestions(
  query: string,
  topk = 5
): Promise<{ items: SimilarQuestion[]; source: "embedding-index" | "calculus-bank-fallback"; error?: string }> {
  const index = await loadEmbeddingIndex();
  if (!index) {
    return { items: calculusFallback(query, topk), source: "calculus-bank-fallback" };
  }
  try {
    const qv = cheapVectorize(query);
    const scored = index
      .map((it) => {
        const base = typeof it.question === "string" ? it.question : "";
        const score = it.embedding?.length ? cosine(qv, it.embedding) : cosine(qv, cheapVectorize(base));
        return {
          question_id: String(it.question_id ?? ""),
          question: base,
          answer: it.answer ?? [],
          step_by_step_solution_text: it.step_by_step_solution_text ?? "",
          similarity_score: Number(normalizeScore(score).toFixed(6)),
        } satisfies SimilarQuestion;
      })
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, topk);
    return { items: scored, source: "embedding-index" };
  } catch (error) {
    return {
      items: calculusFallback(query, topk),
      source: "calculus-bank-fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
