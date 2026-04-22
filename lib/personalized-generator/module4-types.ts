export type Module4Input = {
  student_id: string;
  session_id: string;
  student_profile: {
    grade?: string;
    grade_level?: string;
    learning_style?: string;
    preferred_difficulty?: string;
    historical_mastery?: Record<string, number>;
    long_term_strength?: string[];
    long_term_weakness?: string[];
    preference?: string;
    confidence_level?: string;
    affective_baseline?: {
      engagement?: number;
      confidence?: number;
    };
  };
  module1_to_module4: {
    source_module?: string;
    lesson_title: string;
    target_node_id: string;
    node_type: string;
    node_title: string;
    node_content?: Record<string, unknown>;
    decision_type?: string;
    learner_status?: string;
    learner_mastery?: number;
    difficulty?: number;
    knowledge_tags?: string[];
    recent_error_tags?: string[];
    recommended_actions?: string[];
    supporting_node_ids?: string[];
  };
  question_records: Array<{
    exercise_id: string;
    from_practice_record?: {
      correctness?: boolean;
      result?: string;
      error_tags?: string[];
      attempt_logs?: Array<{
        attempt_id?: number;
        answer?: string;
        is_correct?: boolean;
        response_time?: number;
      }>;
      completion?: { progress?: number };
      exercise_difficulty_feedback?: {
        assigned_difficulty?: number;
        perceived_difficulty?: string;
        next_recommended_difficulty?: number;
      };
    };
    module2_to_module4?: {
      source_module?: string;
      id?: string;
      state?: string;
      action?: string;
    };
  }>;
};

export type UserReadableLearningProfile = {
  summary: string;
  dimension_breakdown: Array<{
    dimension: string;
    observation: string;
    evidence: string;
    action: string;
  }>;
  math_ability_analysis: {
    reasoning_complexity: string;
    amount_of_calculation: string;
    coherence_of_wording: string;
  };
  additional_evaluation: {
    concept_mastery: string;
    error_pattern: string;
    affective_readiness: string;
    learning_rhythm: string;
    next_actions_for_student: string;
  };
};

export type UpdatedLearnerProfile = {
  student_id: string;
  target_concept: string;
  learner_status: string;
  learner_mastery: number;
  weak_points: Array<{ concept: string; evidence: string[] }>;
  affective_state_summary: {
    observed_states: string[];
    risk_level: string;
    recommended_support: string;
  };
  adaptation_strategy: {
    next_step: string;
    recommended_difficulty: number;
    focus: string[];
  };
  user_readable_learning_profile: UserReadableLearningProfile;
};

export type AdaptiveExercise = {
  exercise_id: string;
  type: string;
  difficulty: number;
  target_weak_point: string;
  problem: string;
  standard_answer: string;
  hint: string;
  generation_reason: string;
};

export type SimilarQuestion = {
  question_id: string;
  question: string;
  answer: string[] | string;
  step_by_step_solution_text: string;
  similarity_score: number;
};

export type Module4Output = {
  source_module: "module4";
  student_id: string;
  session_id: string;
  context: {
    lesson_title: string;
    target_node_id: string;
    node_type: string;
    node_title: string;
    knowledge_tags: string[];
  };
  module4_to_module1: {
    target_module: "module1";
    summary: {
      total_exercises: number;
      correct_exercises: number;
      completion_rate: number;
      dominant_error_tags: string[];
      recommended_node_difficulty: number;
      recommended_decision_type: string;
    };
  };
  updated_learner_profile: UpdatedLearnerProfile;
  generated_adaptive_exercises: AdaptiveExercise[];
  similar_questions_top5: SimilarQuestion[];
  overall_generation_reason: { why_these_exercises: string[] };
  meta: {
    profile_source: "llm" | "rule";
    exercise_source: "llm" | "rule";
    retrieval_source: "embedding-index" | "calculus-bank-fallback";
    retrieval_error?: string;
  };
};
