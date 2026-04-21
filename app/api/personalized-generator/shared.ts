import { z } from "zod";
import type { Module4Input, Module4Output } from "@/lib/personalized-generator/module4-types";

const MAX_TOPIC_LEN = 500;
const MAX_STRING_FIELD = 200;
const MAX_LIST_ITEMS = 12;
const MAX_LIST_STRING_LEN = 400;

export const profileSchema = z.object({
  name: z.string().max(MAX_STRING_FIELD).optional(),
  level: z.string().min(1).max(MAX_STRING_FIELD),
  strengths: z.array(z.string().max(MAX_LIST_STRING_LEN)).min(1).max(MAX_LIST_ITEMS),
  weaknesses: z.array(z.string().max(MAX_LIST_STRING_LEN)).min(1).max(MAX_LIST_ITEMS),
  recs: z.array(z.string().max(MAX_LIST_STRING_LEN)).min(1).max(MAX_LIST_ITEMS),
});

export const baseBodySchema = z.object({
  profile: profileSchema,
  topic: z.string().max(MAX_TOPIC_LEN).optional(),
});

export function buildModule4Input(userId: string, body: z.infer<typeof baseBodySchema>): Module4Input {
  const { profile, topic } = body;
  return {
    student_id: userId,
    session_id: `sess-${Date.now()}`,
    student_profile: {
      confidence_level: profile.level,
      long_term_strength: profile.strengths,
      long_term_weakness: profile.weaknesses,
      preference: profile.recs.join(" "),
    },
    module1_to_module4: {
      lesson_title: topic?.trim() || "Personalized practice",
      target_node_id: "node_personalized_generator",
      node_type: "concept",
      node_title: topic?.trim() || "Adaptive exercise",
      learner_status: "practice",
      learner_mastery: 0.5,
      difficulty: 3,
      knowledge_tags: profile.weaknesses.slice(0, 3),
    },
    question_records: [],
  };
}

export function normalizeModule4Result(result: Module4Output): Module4Output {
  return {
    ...result,
    updated_learner_profile: result.updated_learner_profile,
    generated_adaptive_exercises: result.generated_adaptive_exercises ?? [],
    similar_questions_top5: result.similar_questions_top5 ?? [],
    overall_generation_reason: {
      why_these_exercises: result.overall_generation_reason?.why_these_exercises ?? [],
    },
    meta: result.meta ?? {
      profile_source: "rule",
      exercise_source: "rule",
      retrieval_source: "calculus-bank-fallback",
    },
  };
}
