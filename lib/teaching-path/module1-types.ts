export type GenerationMode = "llm" | "heuristic_fallback";

export type TeachingNodeType =
  | "Motivation"
  | "Concept"
  | "DefinitionRule"
  | "WorkedExample"
  | "GuidedPractice"
  | "IndependentPractice"
  | "DiagnosticCheckpoint"
  | "Summary"
  | "KnowledgeReadiness";

export type TeachingGraphNode = {
  node_id: string;
  type: TeachingNodeType | string;
  title: string;
  sequence_index: number;
  teaching_role?: string;
  knowledge_tags?: string[];
  prerequisite_ids?: string[];
  next_node_ids?: string[];
  importance?: number;
  difficulty?: number;
  estimated_time_min?: number;
  content?: string;
  overview?: string;
  formula?: string;
  problem_text?: string;
  solution_summary?: string;
  practice_prompt?: string;
  checkpoint_goal?: string;
  recommended_exercises?: RecommendedExercise[];
};

export type ConceptDictionaryEntry = {
  concept_id: string;
  label: string;
  canonical_key?: string;
  definition?: string;
  aliases?: string[];
  cross_references?: string[];
  knowledge_tags?: string[];
  source_slice_ids?: string[];
  confidence?: number;
};

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  node_type?: string;
  title?: string;
  preview?: string;
  knowledge_tags?: string[];
};

export type KnowledgeGraphEdge = {
  source: string;
  target: string;
  relation: string;
  explanation?: string;
};

export type LearnerSnapshot = {
  student_id?: string;
  overall_mastery?: number;
  readiness?: number;
  dominant_risk?: string;
  weak_knowledge_tags?: string[];
  states?: Record<string, number | string>;
};

export type WeaknessItem = {
  node_id: string;
  title: string;
  knowledge_tags?: string[];
  severity?: string;
  evidence?: string[];
  recommended_actions?: string[];
};

export type AdaptivePlanItem = {
  action_id: string;
  decision_type: string;
  target_node_id: string;
  reason?: string;
  action_bundle?: string[];
  downstream_modules?: string[];
  supporting_node_ids?: string[];
};

export type RecommendedExercise = {
  exercise_id: string;
  question: string;
  question_type?: string;
  leaf_kc?: string;
  answer?: string | string[];
  solution_summary?: string;
  knowledge_concepts?: string[];
  recommendation_reason?: string;
};

export type ModuleConnection = {
  lesson_title?: string;
  target_node_id?: string;
  node_type?: string;
  node_title?: string;
  knowledge_tags?: string[];
  difficulty?: number;
  decision_type?: string;
  learner_status?: string;
  learner_mastery?: number;
  recent_error_tags?: string[];
  recommended_actions?: string[];
  supporting_node_ids?: string[];
  node_content?: Record<string, unknown>;
};

export type GraphMetadata = {
  cache_key?: string;
  generation_mode?: GenerationMode;
  artifact_paths?: string[];
  [key: string]: unknown;
};

export type TeachingGraphResponse = {
  graph_metadata?: GraphMetadata;
  teaching_graph?: TeachingGraphNode[];
  concept_dictionary?: { entries?: ConceptDictionaryEntry[] };
  knowledge_graph?: {
    nodes?: KnowledgeGraphNode[];
    edges?: KnowledgeGraphEdge[];
  };
  slices?: unknown[];
  learner_feedback?: Record<string, number | string | boolean>;
  learner_snapshot?: LearnerSnapshot;
  weakness_summary?: WeaknessItem[];
  adaptive_plan?: AdaptivePlanItem[];
  module_connections?: Record<string, unknown>;
  module1_to_module4?: ModuleConnection;
  module4_to_module1?: Record<string, unknown>;
};
