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

const fullInputSchema = z.object({
  student_id: z.string().min(1).max(MAX_STRING_FIELD).optional(),
  session_id: z.string().min(1).max(MAX_STRING_FIELD),
  student_profile: z
    .object({
      grade_level: z.string().max(MAX_STRING_FIELD).optional(),
      learning_style: z.string().max(MAX_STRING_FIELD).optional(),
      preferred_difficulty: z.string().max(MAX_STRING_FIELD).optional(),
      historical_mastery: z.record(z.number()).optional(),
      long_term_strength: z.array(z.string().max(MAX_LIST_STRING_LEN)).max(MAX_LIST_ITEMS).optional(),
      long_term_weakness: z.array(z.string().max(MAX_LIST_STRING_LEN)).max(MAX_LIST_ITEMS).optional(),
      affective_baseline: z
        .object({
          engagement: z.number().optional(),
          confidence: z.number().optional(),
        })
        .optional(),
      preference: z.string().max(2000).optional(),
      confidence_level: z.string().max(MAX_STRING_FIELD).optional(),
    })
    .passthrough(),
  module1_to_module4: z
    .object({
      source_module: z.string().max(MAX_STRING_FIELD).optional(),
      lesson_title: z.string().max(MAX_TOPIC_LEN),
      target_node_id: z.string().max(MAX_STRING_FIELD),
      node_type: z.string().max(MAX_STRING_FIELD),
      node_title: z.string().max(MAX_TOPIC_LEN),
      knowledge_tags: z.array(z.string().max(MAX_LIST_STRING_LEN)).max(MAX_LIST_ITEMS).optional(),
      difficulty: z.number().optional(),
      decision_type: z.string().max(MAX_STRING_FIELD).optional(),
      learner_status: z.string().max(MAX_STRING_FIELD).optional(),
      learner_mastery: z.number().optional(),
      recent_error_tags: z.array(z.string().max(MAX_LIST_STRING_LEN)).max(MAX_LIST_ITEMS).optional(),
      recommended_actions: z.array(z.string().max(MAX_LIST_STRING_LEN)).max(MAX_LIST_ITEMS).optional(),
      supporting_node_ids: z.array(z.string().max(MAX_LIST_STRING_LEN)).max(MAX_LIST_ITEMS).optional(),
      node_content: z.record(z.unknown()).optional(),
    })
    .passthrough(),
  question_records: z
    .array(
      z.object({
        exercise_id: z.string().max(MAX_STRING_FIELD),
        from_practice_record: z
          .object({
            correctness: z.boolean().optional(),
            result: z.string().max(MAX_STRING_FIELD).optional(),
            error_tags: z.array(z.string().max(MAX_LIST_STRING_LEN)).max(MAX_LIST_ITEMS).optional(),
            completion: z
              .object({
                status: z.string().max(MAX_STRING_FIELD).optional(),
                progress: z.number().optional(),
              })
              .optional(),
            attempt_logs: z
              .array(
                z.object({
                  attempt_id: z.number().optional(),
                  answer: z.string().max(1000).optional(),
                  is_correct: z.boolean().optional(),
                  response_time: z.number().optional(),
                })
              )
              .max(MAX_LIST_ITEMS)
              .optional(),
            exercise_difficulty_feedback: z
              .object({
                assigned_difficulty: z.number().optional(),
                perceived_difficulty: z.string().max(MAX_STRING_FIELD).optional(),
                next_recommended_difficulty: z.number().optional(),
              })
              .optional(),
          })
          .optional(),
        module2_to_module4: z
          .object({
            source_module: z.string().max(MAX_STRING_FIELD).optional(),
            id: z.string().max(MAX_STRING_FIELD).optional(),
            state: z.string().max(MAX_STRING_FIELD).optional(),
            action: z.string().max(MAX_STRING_FIELD).optional(),
          })
          .optional(),
      })
    )
    .max(50),
});

export const fullModule4InputSchema = z.union([fullInputSchema, baseBodySchema]);
export type FullModule4InputBody = z.infer<typeof fullModule4InputSchema>;

function isFullModule4Input(body: FullModule4InputBody): body is z.infer<typeof fullInputSchema> {
  return typeof (body as { module1_to_module4?: unknown }).module1_to_module4 === "object";
}

export function buildModule4Input(userId: string, body: FullModule4InputBody): Module4Input {
  if (isFullModule4Input(body)) {
    return {
      ...body,
      student_id: body.student_id?.trim() || userId,
    } as Module4Input;
  }
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
