// Regularized incomplete beta, evaluated by continued fractions (Numerical Recipes).
function logGamma(z) {
  const c = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5)
    return (
      Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  z--;
  let x = 0.99999999999980993;
  for (let i = 0; i < c.length; i++) x += c[i] / (z + i + 1);
  const t = z + c.length - 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}
function fraction(a, b, x) {
  let c = 1,
    d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    let aa = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 3e-12) break;
  }
  return h;
}
export function betaCdf(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * fraction(a, b, x)) / a
    : 1 - (bt * fraction(b, a, 1 - x)) / b;
}
export function betaQuantile(p, a, b) {
  let l = 0,
    r = 1;
  for (let i = 0; i < 65; i++) {
    const m = (l + r) / 2;
    if (betaCdf(m, a, b) < p) l = m;
    else r = m;
  }
  return (l + r) / 2;
}
export function mastery(evidence, now = Date.now(), minLevel = 1) {
  const fresh = evidence.filter(
    (e) =>
      e.independent &&
      Number(e.level ?? 1) >= minLevel &&
      e.source_status === "approved_mapping" &&
      now - new Date(e.created_at).getTime() >= 0 &&
      now - new Date(e.created_at).getTime() <= 180 * 86400000,
  );
  // Correlated retries of one task count once, the latest review wins.
  const unique = new Map();
  for (const e of fresh.sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  ))
    unique.set(e.task_id, e);
  const items = [...unique.values()];
  const a = 1 + items.reduce((s, e) => s + Number(e.success), 0),
    b = 1 + items.reduce((s, e) => s + 1 - Number(e.success), 0);
  const lower = betaQuantile(0.05, a, b),
    transfer = items.some((e) => e.transfer && Number(e.success) >= 0.8);
  return {
    model: "beta-independent-v1",
    alpha: a,
    beta: b,
    mean: a / (a + b),
    lower95: lower,
    independentTasks: items.length,
    transfer,
    ready: lower >= 0.8 && items.length >= 2 && transfer,
    threshold: 0.8,
    freshnessDays: 180,
    explanation:
      "Учитываются только свежие самостоятельные работы с утверждённой связью индикатора. Повторные попытки одной задачи не увеличивают число независимых свидетельств. Решение рекомендательное.",
  };
}
export function simulate({
  algorithm = "binary",
  n = 32,
  target = 31,
  seed = 1,
} = {}) {
  if (
    !["binary", "linear", "insertion", "merge"].includes(algorithm) ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > 2048 ||
    !Number.isInteger(target) ||
    !Number.isInteger(seed)
  )
    throw new Error("Недопустимые параметры симулятора");
  let state = seed >>> 0;
  const rnd = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const a = Array.from({ length: n }, (_, i) => i);
  let comparisons = 0,
    trace = [];
  if (algorithm === "linear") {
    for (let i = 0; i < n; i++) {
      comparisons++;
      if (trace.length < 64) trace.push({ index: i, value: a[i] });
      if (a[i] === target) break;
    }
  }
  if (algorithm === "binary") {
    let l = 0,
      r = n;
    while (l < r) {
      let m = (l + r) >> 1;
      comparisons++;
      trace.push({ left: l, right: r - 1, middle: m });
      if (a[m] < target) l = m + 1;
      else r = m;
    }
  }
  if (["insertion", "merge"].includes(algorithm)) {
    for (let i = a.length - 1; i > 0; i--) {
      let j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (algorithm === "insertion") {
      for (let i = 1; i < n; i++) {
        const x = a[i];
        let j = i - 1;
        while (j >= 0) {
          comparisons++;
          if (a[j] <= x) break;
          a[j + 1] = a[j];
          j--;
        }
        a[j + 1] = x;
      }
    } else {
      const sort = (xs) => {
        if (xs.length < 2) return xs;
        let m = xs.length >> 1,
          l = sort(xs.slice(0, m)),
          r = sort(xs.slice(m)),
          out = [],
          i = 0,
          j = 0;
        while (i < l.length && j < r.length) {
          comparisons++;
          out.push(l[i] <= r[j] ? l[i++] : r[j++]);
        }
        return out.concat(l.slice(i), r.slice(j));
      };
      sort(a);
    }
  }
  return {
    algorithm,
    n,
    target,
    seed,
    comparisons,
    trace,
    metric:
      "Сравнения ключей в эталонном алгоритме; это не время выполнения кода студента",
    version: "sim-v1",
  };
}
