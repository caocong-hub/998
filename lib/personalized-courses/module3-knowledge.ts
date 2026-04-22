export const FIXED_STUDENT_ID = "stu_001";
export const FIXED_MATH_COURSE = "Primary Mathematics";
export const FIXED_MULTIMODAL_EMOTION = "Confused";

export type Module3Course = {
  name: string;
  desc: string;
};

export type Module3KnowledgeCategory = {
  keywords: string[];
  subject: string;
  courses: Module3Course[];
};

export const MATH_KNOWLEDGE_BASE: Record<string, Module3KnowledgeCategory> = {
  number_operations: {
    keywords: ["addition", "subtraction", "multiplication", "division", "quick calculation", "number operations"],
    subject: "Number & Operations",
    courses: [
      { name: "Multiplication Tables Mastery", desc: "Build fluency in multiplication facts with guided drills." },
      { name: "Mixed Arithmetic Practice", desc: "Practice mixed addition, subtraction, multiplication, and division." },
      { name: "Mental Addition and Subtraction", desc: "Improve speed and confidence in daily number operations." },
      { name: "Division Strategy Workshop", desc: "Learn step-by-step division strategies and error correction." },
    ],
  },
  geometry: {
    keywords: ["triangle", "rectangle", "circle", "angle", "shape", "geometry"],
    subject: "Geometry",
    courses: [
      { name: "2D Shapes Fundamentals", desc: "Understand properties of common plane shapes." },
      { name: "Angles and Symmetry Basics", desc: "Practice angle recognition and symmetry reasoning." },
      { name: "Perimeter and Area Starter", desc: "Calculate perimeter and area through guided examples." },
      { name: "Geometry Visual Reasoning", desc: "Strengthen spatial understanding with visual tasks." },
    ],
  },
  measurement: {
    keywords: ["length", "weight", "time", "money", "unit conversion", "measurement"],
    subject: "Measurement",
    courses: [
      { name: "Length and Distance in Daily Life", desc: "Use metric units to solve practical length problems." },
      { name: "Weight and Capacity Essentials", desc: "Compare and convert weight and volume units." },
      { name: "Time and Money Problem Solving", desc: "Solve time and money tasks with clear steps." },
      { name: "Unit Conversion Practice", desc: "Master unit conversion with scaffolded exercises." },
    ],
  },
  statistics_probability: {
    keywords: ["data", "chart", "table", "probability", "chance", "statistics"],
    subject: "Statistics & Probability",
    courses: [
      { name: "Reading Charts and Tables", desc: "Interpret bar charts, pictographs, and simple tables." },
      { name: "Intro to Chance and Probability", desc: "Understand likely/unlikely events through experiments." },
      { name: "Data Collection Basics", desc: "Collect and summarize classroom data effectively." },
      { name: "Simple Probability Games", desc: "Apply probability concepts in interactive game contexts." },
    ],
  },
  word_problems: {
    keywords: ["word problem", "story problem", "application", "real life problem", "multi-step"],
    subject: "Word Problems",
    courses: [
      { name: "One-Step Word Problem Training", desc: "Translate short stories into arithmetic operations." },
      { name: "Two-Step Word Problem Practice", desc: "Solve structured two-step real-life problems." },
      { name: "Model Drawing for Word Problems", desc: "Use bar models to represent quantities and relations." },
      { name: "Word Problem Error Analysis", desc: "Identify common mistakes and fix reasoning gaps." },
    ],
  },
  mental_math: {
    keywords: ["mental math", "quick math", "fast calculation", "estimation", "number sense"],
    subject: "Mental Math",
    courses: [
      { name: "Mental Calculation Warmups", desc: "Daily short drills for fast and accurate mental math." },
      { name: "Estimation and Number Sense", desc: "Develop flexible number sense and approximation skills." },
      { name: "Fast Facts Challenge", desc: "Improve recall speed for core arithmetic facts." },
      { name: "Mental Strategy Toolkit", desc: "Practice decomposition and compensation strategies." },
    ],
  },
};

export const DEMO_FEEDBACKS = [
  "Multiplication tables are difficult, I am very confused about quick calculation",
  "Geometry shapes are not difficult, I can understand them easily",
  "Unit conversion is never easy, I always feel frustrated",
  "Probability in simple games is hard, I feel confused when comparing chances",
  "Word problems are not boring, I can solve them clearly with model drawing",
  "Mental math estimation is straightforward and good for me",
  "Measurement with time and money is tough, I need more guided practice",
  "Statistics charts are easy, I can read them well",
  "Division in number operations is complicated, I feel frustrated",
];
