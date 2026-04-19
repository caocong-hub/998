/**
 * Fixed higher-math bank for random five-question generation.
 */

export type CalculusBankItem = {
  id: string;
  title: string;
  stem: string;
};

export const CALCULUS_BANK: CalculusBankItem[] = [
  {
    id: "calc-1",
    title: "Limits: fundamental limit",
    stem: "Compute lim(x→0) (sin 2x) / x and show the main transformation steps.",
  },
  {
    id: "calc-2",
    title: "Derivative from definition",
    stem: "Let f(x) = x^2 + 3x. Use the derivative definition to find f'(2).",
  },
  {
    id: "calc-3",
    title: "Product and chain rules",
    stem: "Find the derivative of y = x^2 * e^(-x).",
  },
  {
    id: "calc-4",
    title: "Implicit differentiation",
    stem: "Given x^2 + y^2 = 1 with y > 0 defining y = y(x), find dy/dx.",
  },
  {
    id: "calc-5",
    title: "Indefinite integral: substitution",
    stem: "Evaluate ∫ x * e^(x^2) dx.",
  },
  {
    id: "calc-6",
    title: "Definite integral",
    stem: "Evaluate ∫_0^1 (2x + 1) dx and briefly explain its geometric meaning.",
  },
  {
    id: "calc-7",
    title: "L'Hospital's rule",
    stem: "Compute lim(x→0) (e^x − 1 − x) / x^2.",
  },
  {
    id: "calc-8",
    title: "Mean value theorem",
    stem: "For f(x) = x^3 − 3x on [0, 2], find ξ in (0,2) such that f'(ξ) = (f(2)-f(0))/(2-0).",
  },
  {
    id: "calc-9",
    title: "First-order linear ODE",
    stem: "Solve the differential equation y' + y = e^(-x).",
  },
  {
    id: "calc-10",
    title: "Partial derivatives",
    stem: "Let z = x^2 y + ln(xy), where x>0 and y>0. Compute ∂z/∂x and ∂z/∂y.",
  },
];

const BANK_PICK_COUNT = 5;

/** Fisher–Yates shuffle then take first `count` items. */
export function pickRandomCalculusProblems(
  count: number = BANK_PICK_COUNT
): CalculusBankItem[] {
  const n = Math.min(count, CALCULUS_BANK.length);
  const copy = [...CALCULUS_BANK];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
