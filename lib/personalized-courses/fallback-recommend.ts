import type { CourseRecommendResult } from "@/lib/personalized-courses/llm-recommend";

const FALLBACK_POOL = [
  {
    name: "Advanced Machine Learning",
    reason: "Aligns with your direction and fills gaps in applied ML workflows.",
    score: 92,
    details: "Covers feature engineering, model deployment, and error analysis.",
  },
  {
    name: "Distributed Systems",
    reason: "Strengthens system design and scalability, complementing current skills.",
    score: 88,
    details: "Topics on consensus, fault tolerance, and large-scale data pipelines.",
  },
  {
    name: "MLOps & Model Monitoring",
    reason: "Focuses on productionizing models, monitoring drift, and automation.",
    score: 85,
    details: "CI/CD for ML, observability, and feedback loops for iterative improvement.",
  },
  {
    name: "Information Retrieval",
    reason: "Improves relevance modeling and evaluation, helpful for search & QA.",
    score: 83,
    details: "Covers ranking, vector search, and evaluation metrics.",
  },
] as const;

export function buildFallbackRecommendations(params: {
  evaluation: string;
  suggestCount: number;
}): CourseRecommendResult {
  const n = Math.max(1, Math.min(4, params.suggestCount));
  const sentiment =
    params.evaluation.toLowerCase().includes("difficult") ||
    params.evaluation.toLowerCase().includes("struggle")
      ? "Sentiment: Slightly negative — focus on support and pacing."
      : "Sentiment: Positive — continue with deeper applications.";

  const recommendations = FALLBACK_POOL.slice(0, n).map((r, i) => ({
    id: `mock-${i}`,
    name: r.name,
    reason: r.reason,
    score: r.score,
    details: r.details,
  }));

  const scores = [
    { label: "Match to direction", value: 92 },
    { label: "Addresses weaknesses", value: 88 },
    { label: "Practical applicability", value: 85 },
    { label: "Progression fit", value: 83 },
  ];

  return { sentiment, recommendations, scores };
}
