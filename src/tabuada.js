// Regras da Tabuada Divertida: contas, repetição inteligente, pontos, perfis e estatísticas.
// Sem DOM: é isto que os testes importam.

export const OPS = {
  mult: { symbol: '×', label: 'Multiplicação' },
  div: { symbol: '÷', label: 'Divisão exata' },
};

export const WEIGHT = { min: 1, max: 8, wrongStep: 3, rightStep: 1 };
export const ROUND_SIZE = 10;
export const CHALLENGE_SECONDS = 60;
export const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🦄', '🐙', '🐵', '🐨', '🦁', '🐧', '🐢', '🐞'];

export const maxFactorFor = (extended) => (extended ? 12 : 10);

// ---------- contas ----------

export const factId = (op, table, factor) => `${op}:${table}:${factor}`;

/** Na tabuada do 7: 7 × 8 = 56 e, na divisão, 56 ÷ 7 = 8 (sempre exata). */
export function makeFact(op, table, factor) {
  if (op === 'mult') {
    return { id: factId(op, table, factor), op, table, factor, a: table, b: factor, answer: table * factor, text: `${table} × ${factor}` };
  }
  if (op === 'div') {
    const dividend = table * factor;
    return { id: factId(op, table, factor), op, table, factor, a: dividend, b: table, answer: factor, text: `${dividend} ÷ ${table}` };
  }
  throw new Error(`Operação desconhecida: ${op}`);
}

export function factFromId(id) {
  const match = /^(mult|div):(\d{1,2}):(\d{1,2})$/.exec(String(id));
  if (!match) return null;
  const table = Number(match[2]);
  const factor = Number(match[3]);
  if (table < 1 || table > 12 || factor < 1 || factor > 12) return null;
  return makeFact(match[1], table, factor);
}

/** Todas as contas das tabuadas e operações escolhidas (fatores de 1 a 10, ou até 12). */
export function generateFacts({ tables = [], ops = [], extended = false } = {}) {
  const max = maxFactorFor(extended);
  const facts = [];
  for (const op of ops) {
    if (!OPS[op]) continue;
    for (const table of [...new Set(tables)].sort((x, y) => x - y)) {
      if (!Number.isInteger(table) || table < 1 || table > max) continue;
      for (let factor = 1; factor <= max; factor++) facts.push(makeFact(op, table, factor));
    }
  }
  return facts;
}

export function checkAnswer(fact, typed) {
  const text = String(typed ?? '').trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  return Number(text) === fact.answer;
}

// ---------- repetição inteligente ----------

export const weightOf = (weights, id) => weights?.[id] ?? WEIGHT.min;

/** Errou: a conta volta mais vezes. Acertou: o peso cai aos poucos até o normal. */
export function updateWeight(weights, id, correct) {
  const current = weightOf(weights, id);
  const next = correct ? Math.max(WEIGHT.min, current - WEIGHT.rightStep) : Math.min(WEIGHT.max, current + WEIGHT.wrongStep);
  const copy = { ...weights };
  if (next === WEIGHT.min) delete copy[id];
  else copy[id] = next;
  return copy;
}

/** Sorteia uma conta proporcionalmente ao peso, nunca repetindo a anterior. */
export function pickFact(facts, weights, lastId, rng = Math.random) {
  if (!facts.length) return null;
  const pool = facts.length > 1 ? facts.filter((f) => f.id !== lastId) : facts;
  const total = pool.reduce((sum, f) => sum + weightOf(weights, f.id), 0);
  let point = rng() * total;
  for (const fact of pool) {
    point -= weightOf(weights, fact.id);
    if (point < 0) return fact;
  }
  return pool[pool.length - 1];
}

// ---------- pontos, sequência e estrelas ----------

/** 10 pontos por acerto, mais um bônus pela sequência (até +10). */
export const pointsFor = (streak) => 10 + Math.min(10, Math.max(0, streak - 1) * 2);

export const emptyScore = () => ({ points: 0, correct: 0, answered: 0, streak: 0, bestStreak: 0 });

export function registerAnswer(score, correct) {
  const streak = correct ? score.streak + 1 : 0;
  return {
    points: score.points + (correct ? pointsFor(streak) : 0),
    correct: score.correct + (correct ? 1 : 0),
    answered: score.answered + 1,
    streak,
    bestStreak: Math.max(score.bestStreak, streak),
  };
}

export function starsFor(correct, answered) {
  if (!answered) return 0;
  const ratio = correct / answered;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}

export const PRAISE = ['Muito bem!', 'Isso aí!', 'Mandou bem!', 'Excelente!', 'Você é fera!', 'Arrasou!', 'Show de bola!'];
export const ENCOURAGE = ['Quase! Olha só:', 'Tudo bem errar, é assim que se aprende:', 'Boa tentativa! A conta é:'];

export function streakMessage(streak) {
  if (streak === 3) return '3 seguidas! 🔥';
  if (streak === 5) return '5 seguidas! Você está voando! 🚀';
  if (streak === 10) return '10 seguidas! Que demais! 🏆';
  if (streak > 10 && streak % 5 === 0) return `${streak} seguidas! Incrível! 🌟`;
  return '';
}

export function endMessage(stars) {
  if (stars === 3) return 'Uau! Você está craque na tabuada!';
  if (stars === 2) return 'Muito bom! Continue treinando que você chega lá.';
  return 'Cada treino deixa você mais forte. Vamos de novo?';
}

// ---------- perfis ----------

export const DEFAULT_SETTINGS = { tables: [2, 3, 4, 5], ops: ['mult'], extended: false };
const ID_PATTERN = /^[a-z0-9-]{1,40}$/;
const FACT_PATTERN = /^(mult|div):\d{1,2}:\d{1,2}$/;

export function createProfile(name, avatar, id) {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!clean) throw new Error('Digite um nome para o perfil.');
  return {
    id: ID_PATTERN.test(String(id)) ? String(id) : `p-${Date.now().toString(36)}`,
    name: clean,
    avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0],
    stars: 0,
    bestChallenge: 0,
    weights: {},
    stats: {},
    settings: { ...DEFAULT_SETTINGS, tables: [...DEFAULT_SETTINGS.tables], ops: [...DEFAULT_SETTINGS.ops] },
  };
}

/** Registra uma resposta no perfil: estatística da conta e peso da repetição. */
export function recordAttempt(profile, fact, correct) {
  const previous = profile.stats[fact.id] || { a: 0, c: 0 };
  return {
    ...profile,
    weights: updateWeight(profile.weights, fact.id, correct),
    stats: { ...profile.stats, [fact.id]: { a: previous.a + 1, c: previous.c + (correct ? 1 : 0) } },
  };
}

function cleanSettings(settings) {
  const extended = settings?.extended === true;
  const max = maxFactorFor(extended);
  const tables = Array.isArray(settings?.tables)
    ? [...new Set(settings.tables.filter((t) => Number.isInteger(t) && t >= 1 && t <= max))].sort((a, b) => a - b)
    : [];
  const ops = Array.isArray(settings?.ops) ? [...new Set(settings.ops.filter((op) => OPS[op]))] : [];
  return {
    tables: tables.length ? tables : [...DEFAULT_SETTINGS.tables],
    ops: ops.length ? ops : [...DEFAULT_SETTINGS.ops],
    extended,
  };
}

const nonNegativeInt = (n) => (Number.isInteger(n) && n >= 0 ? n : 0);

function cleanProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  let profile;
  try {
    profile = createProfile(raw.name, raw.avatar, raw.id);
  } catch {
    return null;
  }
  if (!ID_PATTERN.test(String(raw.id))) return null;
  profile.stars = nonNegativeInt(raw.stars);
  profile.bestChallenge = nonNegativeInt(raw.bestChallenge);
  profile.settings = cleanSettings(raw.settings);
  for (const [id, weight] of Object.entries(raw.weights || {})) {
    if (FACT_PATTERN.test(id) && factFromId(id) && typeof weight === 'number' && Number.isFinite(weight)) {
      const clamped = Math.min(WEIGHT.max, Math.max(WEIGHT.min, weight));
      if (clamped > WEIGHT.min) profile.weights[id] = clamped;
    }
  }
  for (const [id, stat] of Object.entries(raw.stats || {})) {
    if (!FACT_PATTERN.test(id) || !factFromId(id) || !stat) continue;
    const a = nonNegativeInt(stat.a);
    const c = nonNegativeInt(stat.c);
    if (a > 0 && c <= a) profile.stats[id] = { a, c };
  }
  return profile;
}

export function emptyData() {
  return { version: 1, profiles: [], currentId: null };
}

export function serialize(data) {
  return JSON.stringify({ version: 1, profiles: data.profiles, currentId: data.currentId });
}

/** Lê os dados salvos e descarta tudo o que estiver inválido (sem quebrar o app). */
export function parseData(json) {
  let raw;
  try {
    raw = JSON.parse(json);
  } catch {
    return emptyData();
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.profiles)) return emptyData();
  const profiles = [];
  for (const item of raw.profiles) {
    const profile = cleanProfile(item);
    if (profile && !profiles.some((p) => p.id === profile.id)) profiles.push(profile);
  }
  const currentId = profiles.some((p) => p.id === raw.currentId) ? raw.currentId : profiles[0]?.id ?? null;
  return { version: 1, profiles, currentId };
}

// ---------- área dos responsáveis ----------

/** Acertos por tabuada (multiplicação e divisão juntas), só das tabuadas já praticadas. */
export function tableStats(profile) {
  const byTable = new Map();
  for (const [id, stat] of Object.entries(profile.stats)) {
    const fact = factFromId(id);
    if (!fact) continue;
    const entry = byTable.get(fact.table) || { table: fact.table, attempts: 0, correct: 0 };
    entry.attempts += stat.a;
    entry.correct += stat.c;
    byTable.set(fact.table, entry);
  }
  return [...byTable.values()]
    .sort((a, b) => a.table - b.table)
    .map((entry) => ({ ...entry, accuracy: entry.correct / entry.attempts }));
}

/** Contas com mais erros proporcionalmente (só as tentadas pelo menos `minAttempts` vezes). */
export function hardestFacts(profile, limit = 6, minAttempts = 2) {
  return Object.entries(profile.stats)
    .map(([id, stat]) => ({ fact: factFromId(id), attempts: stat.a, errors: stat.a - stat.c }))
    .filter((item) => item.fact && item.attempts >= minAttempts && item.errors > 0)
    .sort((a, b) => b.errors / b.attempts - a.errors / a.attempts || b.errors - a.errors || a.fact.id.localeCompare(b.fact.id))
    .slice(0, limit)
    .map(({ fact, attempts, errors }) => ({ id: fact.id, text: `${fact.text} = ${fact.answer}`, attempts, errors }));
}
