/**
 * Fixed bank of 10 higher-math (高等数学) problems for the recommend mode.
 */

export type CalculusBankItem = {
  id: string;
  title: string;
  stem: string;
};

export const CALCULUS_BANK: CalculusBankItem[] = [
  {
    id: "calc-1",
    title: "极限：重要极限",
    stem: "求极限 lim(x→0) (sin 2x) / x，写出主要变形步骤。",
  },
  {
    id: "calc-2",
    title: "导数：用定义求导",
    stem: "设 f(x) = x² + 3x，用导数定义求 f′(2)。",
  },
  {
    id: "calc-3",
    title: "求导：乘积与复合",
    stem: "求函数 y = x²·e^(−x) 的导数 y′。",
  },
  {
    id: "calc-4",
    title: "隐函数求导",
    stem: "由方程 x² + y² = 1（y > 0）确定 y = y(x)，求 dy/dx。",
  },
  {
    id: "calc-5",
    title: "不定积分：换元",
    stem: "计算 ∫ x·e^(x²) dx。",
  },
  {
    id: "calc-6",
    title: "定积分",
    stem: "计算 ∫₀¹ (2x + 1) dx，并说明其几何意义（直线下的面积）。",
  },
  {
    id: "calc-7",
    title: "洛必达法则",
    stem: "求极限 lim(x→0) (e^x − 1 − x) / x²。",
  },
  {
    id: "calc-8",
    title: "微分中值定理",
    stem: "设 f(x) = x³ − 3x 在 [0, 2] 上连续、在 (0, 2) 内可导，用拉格朗日中值定理求满足 f′(ξ) = (f(2) − f(0)) / (2 − 0) 的 ξ。",
  },
  {
    id: "calc-9",
    title: "一阶线性微分方程",
    stem: "求微分方程 y′ + y = e^(−x) 的通解。",
  },
  {
    id: "calc-10",
    title: "二元函数：偏导数",
    stem: "设 z = x²y + ln(xy)（x > 0, y > 0），求 ∂z/∂x 与 ∂z/∂y。",
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
