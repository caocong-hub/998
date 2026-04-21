export const FIXED_STUDENT_ID = "stu_001";
export const FIXED_MATH_COURSE = "University Mathematics";
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
  linear_algebra: {
    keywords: ["matrix", "linear algebra", "vector", "eigenvalue", "linear system", "determinant"],
    subject: "Linear Algebra: Matrix & Vector Operations",
    courses: [
      { name: "Linear Algebra", desc: "Covers matrix algebra, linear systems, eigenvalues and determinants for beginners." },
      { name: "Elementary Linear Algebra", desc: "Introductory linear algebra with rigorous mathematical proofs." },
      { name: "Applied Linear Algebra", desc: "Practical linear algebra for scientific computing and math modeling." },
      { name: "Linear Algebra for Data Science", desc: "Linear algebra foundations for machine learning and data mining." },
    ],
  },
  single_calculus: {
    keywords: ["single variable calculus", "limit", "derivative", "integral", "series"],
    subject: "Single Variable Calculus: Limits & Integrals",
    courses: [
      { name: "Single Variable Calculus", desc: "Introduction to limits, derivatives, definite integrals and infinite series." },
      { name: "Differential Calculus", desc: "In-depth derivative theory and optimization applications." },
      { name: "Integral Calculus", desc: "Definite and indefinite integrals, area and volume applications." },
      { name: "Infinite Sequences and Series", desc: "Convergence tests, power series and Taylor expansions." },
    ],
  },
  multi_calculus: {
    keywords: ["multivariable calculus", "partial derivative", "multiple integral", "vector calculus"],
    subject: "Multivariable Calculus: Partial Derivatives & Vector Calculus",
    courses: [
      { name: "Multivariable Calculus", desc: "Advanced calculus covering partial derivatives and multiple integrals." },
      { name: "Vector Calculus", desc: "In-depth vector calculus and multivariable function analysis." },
      { name: "Vector Analysis", desc: "Vector fields, divergence, curl and line integral theory." },
      { name: "Multiple Integrals and Vector Fields", desc: "Multiple integration, Green theorem and Stokes theorem." },
    ],
  },
  probability: {
    keywords: ["probability", "expectation", "variance", "statistic", "modeling", "hypothesis testing"],
    subject: "Probability & Statistics: Distribution & Statistical Testing",
    courses: [
      { name: "Intro to Probability", desc: "Fundamental probability theory and statistical data analysis." },
      { name: "Mathematical Statistics", desc: "Theoretical statistics, estimation theory and hypothesis testing." },
      { name: "Statistical Inference", desc: "Core statistical inference, point estimation and confidence intervals." },
      { name: "Bayesian Statistics", desc: "Bayesian probability models and statistical decision theory." },
    ],
  },
  discrete_math: {
    keywords: ["discrete", "logic", "proof", "set theory", "combinatorics", "graph theory"],
    subject: "Discrete Mathematics: Logic, Combinatorics & Graph Theory",
    courses: [
      { name: "Discrete Mathematics", desc: "Advanced logic, proof techniques, combinatorics and graph theory." },
      { name: "Mathematical Logic", desc: "Propositional logic, predicate logic and formal proof systems." },
      { name: "Graph Theory Fundamentals", desc: "Graphs, trees, networks and graph algorithm applications." },
      { name: "Proof Techniques", desc: "Induction, contradiction and constructive proof strategies." },
    ],
  },
  ode: {
    keywords: ["differential equation", "ode", "ordinary differential equation", "dynamic system"],
    subject: "Ordinary Differential Equations: Modeling & Solutions",
    courses: [
      { name: "Differential Equations", desc: "Core ordinary differential equations and dynamic system modeling." },
      { name: "Linear Differential Equations", desc: "Linear ODEs, homogeneous and non-homogeneous solutions." },
      { name: "Nonlinear ODEs", desc: "Nonlinear ordinary differential equations and stability analysis." },
      { name: "Laplace Transforms and ODEs", desc: "Laplace transform methods for solving differential equations." },
    ],
  },
  complex: {
    keywords: ["complex function", "complex analysis", "complex variable", "residue"],
    subject: "Complex Analysis: Complex Functions & Residue Theory",
    courses: [
      { name: "Complex Analysis", desc: "Fundamental complex function theory and residue calculation methods." },
      { name: "Complex Variables", desc: "In-depth complex analysis for advanced university mathematics." },
      { name: "Residue Theory and Applications", desc: "Residue theorem, contour integration and complex integration." },
      { name: "Complex Integration", desc: "Cauchy theorem and integral formulas in practice." },
    ],
  },
  numerical: {
    keywords: ["numerical analysis", "numerical method", "approximation", "computation math"],
    subject: "Numerical Analysis: Computational Methods & Approximation",
    courses: [
      { name: "Numerical Methods", desc: "Core numerical computation and mathematical approximation algorithms." },
      { name: "Numerical Linear Algebra", desc: "Numerical methods for matrix algebra and linear systems." },
      { name: "Approximation Theory", desc: "Function approximation, interpolation and polynomial fitting." },
      { name: "Scientific Computing", desc: "Numerical analysis for scientific simulation and computation." },
    ],
  },
  abstract_algebra: {
    keywords: ["abstract algebra", "group theory", "ring theory", "field theory"],
    subject: "Abstract Algebra: Group, Ring & Field Theory",
    courses: [
      { name: "Abstract Algebra", desc: "Fundamental group theory, ring theory and field theory concepts." },
      { name: "Group Theory Fundamentals", desc: "Group axioms, subgroups, homomorphisms and group actions." },
      { name: "Ring and Field Theory", desc: "Ring structures, integral domains, fields and polynomial rings." },
      { name: "Modern Algebra", desc: "Abstract algebra with applications to number theory and coding." },
    ],
  },
  math_analysis: {
    keywords: ["mathematical analysis", "real analysis", "analysis", "convergence"],
    subject: "Mathematical Analysis: Real Analysis & Convergence",
    courses: [
      { name: "Real Analysis", desc: "Core mathematical analysis and real number system theory." },
      { name: "Math Analysis Foundations", desc: "Rigorous analysis for pure and applied mathematics students." },
      { name: "Convergence Theory", desc: "Sequence, function and series convergence in analysis." },
      { name: "Measure Theory", desc: "Measure theory foundations for modern mathematical analysis." },
    ],
  },
  operations_research: {
    keywords: ["operations research", "optimization", "linear programming", "game theory"],
    subject: "Operations Research: Optimization & Linear Programming",
    courses: [
      { name: "Operations Research", desc: "Linear programming, optimization and game theory applications." },
      { name: "Optimization Methods", desc: "Practical optimization methods for engineering and management." },
      { name: "Linear Programming", desc: "Simplex method, duality theory and practical LP modeling." },
      { name: "Network Optimization", desc: "Network flow, shortest path and transportation optimization." },
    ],
  },
  advanced_math: {
    keywords: ["advanced math", "higher mathematics", "multivariable", "advanced calculus"],
    subject: "Advanced Mathematics: Integrated University Math",
    courses: [
      { name: "Higher Mathematics", desc: "Comprehensive advanced math covering core university topics." },
      { name: "Advanced Math Calculus", desc: "Integrated advanced math for university science and engineering." },
      { name: "Advanced Math Foundations", desc: "Complete advanced mathematics course for all majors." },
      { name: "Higher Math Applications", desc: "Real-world applications of advanced mathematics in science." },
    ],
  },
};

export const DEMO_FEEDBACKS = [
  "Linear Algebra matrix operations are difficult, I am very confused about vector calculations",
  "Calculus limits are not difficult, I can understand them easily",
  "Probability expectation is never easy, I always feel frustrated",
  "Complex function analysis is hard, residue calculation makes me confused",
  "Discrete math proofs are not boring, I enjoy learning them clearly",
  "ODEs are never complicated, the steps are straightforward",
  "Abstract algebra group theory is tough, I cannot understand ring theory concepts",
  "Multivariable calculus partial derivatives are good, I can solve them independently",
  "Advanced math integrals are hard, I need to learn foundational calculus again",
];
