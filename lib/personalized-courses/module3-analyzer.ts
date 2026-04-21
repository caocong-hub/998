import { DEMO_FEEDBACKS, MATH_KNOWLEDGE_BASE, type Module3Course } from "./module3-knowledge";

const PHRASES = ["not difficult", "never easy", "hardly tough", "not boring", "never complicated"];
const SINGLE_WORDS = ["frustrated", "confused", "hard", "easily", "well", "clearly", "straightforward", "good"];
const VALID_SENTIMENT_WORDS = [
  "easy",
  "difficult",
  "frustrated",
  "confused",
  "hard",
  "boring",
  "complicated",
  "easily",
  "well",
  "clearly",
  "straightforward",
  "tough",
  "good",
];

export type Module3AnalysisResult = {
  subject: string;
  features: string;
  courses: Module3Course[];
};

export function extractSentimentFeatures(text: string): string[] {
  const lowerText = text.toLowerCase().trim();
  const features: string[] = [];

  for (const phrase of PHRASES) {
    if (lowerText.includes(phrase)) {
      features.push(phrase);
    }
  }

  if (lowerText.includes("difficult") && !lowerText.includes("not difficult")) features.push("difficult");
  if (lowerText.includes("easy") && !lowerText.includes("never easy")) features.push("easy");
  if (lowerText.includes("tough") && !lowerText.includes("hardly tough")) features.push("tough");
  if (lowerText.includes("boring") && !lowerText.includes("not boring")) features.push("boring");
  if (lowerText.includes("complicated") && !lowerText.includes("never complicated")) features.push("complicated");

  for (const word of SINGLE_WORDS) {
    if (lowerText.includes(word)) {
      features.push(word);
    }
  }

  const unique = Array.from(new Set(features));
  return unique.length > 0 ? unique : ["No feature words"];
}

export function validateFeedback(text: string): boolean {
  const lowerText = text.toLowerCase();
  const hasAspect = Object.values(MATH_KNOWLEDGE_BASE).some((category) =>
    category.keywords.some((keyword) => lowerText.includes(keyword))
  );
  const hasSentiment = VALID_SENTIMENT_WORDS.some((word) => lowerText.includes(word));
  return hasAspect && hasSentiment;
}

function pickRandomCourses(courses: Module3Course[], count: number): Module3Course[] {
  const pool = [...courses];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[randomIndex]] = [pool[randomIndex], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function analyzeFeedback(text: string): Module3AnalysisResult[] {
  const lowerText = text.toLowerCase();
  const features = extractSentimentFeatures(text).join(", ");

  for (const category of Object.values(MATH_KNOWLEDGE_BASE)) {
    if (category.keywords.some((keyword) => lowerText.includes(keyword))) {
      return [
        {
          subject: category.subject,
          features,
          courses: pickRandomCourses(category.courses, 3),
        },
      ];
    }
  }

  return [];
}

export function buildModule3DemoPayload(feedbackText: string) {
  const isValid = validateFeedback(feedbackText);
  if (!isValid) {
    return {
      ok: false as const,
      error: "Invalid Feedback! Text must include BOTH math subjects and sentiment words.",
      analysis: [],
      recommendations: [],
    };
  }

  const analysis = analyzeFeedback(feedbackText);
  return {
    ok: true as const,
    error: null,
    analysis,
    recommendations: analysis[0]?.courses ?? [],
  };
}

export function getDefaultFeedback() {
  return DEMO_FEEDBACKS[0] ?? "";
}
