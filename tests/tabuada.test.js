import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATARS, WEIGHT, checkAnswer, createProfile, emptyScore, factFromId, generateFacts, hardestFacts, makeFact,
  parseData, pickFact, pointsFor, recordAttempt, registerAnswer, serialize, starsFor, streakMessage,
  tableStats, updateWeight, weightOf,
} from '../src/tabuada.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('multiplicação: tabuada do 7', () => {
  const fact = makeFact('mult', 7, 8);
  assert.equal(fact.text, '7 × 8');
  assert.equal(fact.answer, 56);
  assert.equal(fact.id, 'mult:7:8');
});

test('divisão é sempre exata e usa a tabuada como divisor', () => {
  const fact = makeFact('div', 7, 8);
  assert.equal(fact.text, '56 ÷ 7');
  assert.equal(fact.answer, 8);
  for (const f of generateFacts({ tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], ops: ['div'], extended: true })) {
    assert.equal(f.a % f.b, 0, f.text);
    assert.equal(f.a / f.b, f.answer, f.text);
    assert.ok(Number.isInteger(f.answer) && f.answer >= 1);
  }
});

test('gera só as tabuadas e operações escolhidas', () => {
  const facts = generateFacts({ tables: [3, 5], ops: ['mult'] });
  assert.equal(facts.length, 20);
  assert.ok(facts.every((f) => f.op === 'mult' && [3, 5].includes(f.table)));
  assert.deepEqual(facts.filter((f) => f.table === 3).map((f) => f.factor), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const both = generateFacts({ tables: [9], ops: ['mult', 'div'] });
  assert.equal(both.length, 20);
  assert.equal(both.filter((f) => f.op === 'div').length, 10);
  assert.equal(new Set(both.map((f) => f.id)).size, both.length);
});

test('até 12 inclui as tabuadas do 11 e 12 e os fatores até 12', () => {
  assert.equal(generateFacts({ tables: [11, 12], ops: ['mult'] }).length, 0, 'sem a opção, 11 e 12 ficam de fora');
  const extended = generateFacts({ tables: [12], ops: ['mult'], extended: true });
  assert.equal(extended.length, 12);
  assert.equal(extended.at(-1).answer, 144);
  assert.equal(generateFacts({ tables: [0, 13, 2.5, 4], ops: ['mult', 'soma'] }).length, 10);
  assert.deepEqual(generateFacts({ tables: [], ops: ['mult'] }), []);
});

test('correção da resposta digitada', () => {
  const fact = makeFact('mult', 6, 7);
  assert.equal(checkAnswer(fact, '42'), true);
  assert.equal(checkAnswer(fact, ' 42 '), true);
  assert.equal(checkAnswer(fact, '24'), false);
  assert.equal(checkAnswer(fact, ''), null);
  assert.equal(checkAnswer(fact, '4a'), null);
  assert.equal(checkAnswer(fact, '1000'), null);
});

test('peso sobe depois de erro e desce aos poucos depois de acerto', () => {
  let weights = {};
  assert.equal(weightOf(weights, 'mult:7:8'), 1);
  weights = updateWeight(weights, 'mult:7:8', false);
  assert.equal(weightOf(weights, 'mult:7:8'), 1 + WEIGHT.wrongStep);
  weights = updateWeight(weights, 'mult:7:8', false);
  weights = updateWeight(weights, 'mult:7:8', false);
  assert.equal(weightOf(weights, 'mult:7:8'), WEIGHT.max, 'peso tem teto');
  weights = updateWeight(weights, 'mult:7:8', true);
  assert.equal(weightOf(weights, 'mult:7:8'), WEIGHT.max - WEIGHT.rightStep);
  for (let i = 0; i < 20; i++) weights = updateWeight(weights, 'mult:7:8', true);
  assert.equal(weightOf(weights, 'mult:7:8'), WEIGHT.min, 'peso tem piso');
  assert.deepEqual(weights, {}, 'peso normal não precisa ser guardado');
});

test('nunca repete a conta anterior', () => {
  const facts = generateFacts({ tables: [2], ops: ['mult'] });
  const rng = seeded(1);
  let last = null;
  for (let i = 0; i < 2000; i++) {
    const fact = pickFact(facts, {}, last?.id, rng);
    assert.notEqual(fact.id, last?.id);
    last = fact;
  }
  const two = generateFacts({ tables: [1], ops: ['mult'] }).slice(0, 2);
  let previous = pickFact(two, {}, null, rng);
  for (let i = 0; i < 50; i++) {
    const next = pickFact(two, {}, previous.id, rng);
    assert.notEqual(next.id, previous.id);
    previous = next;
  }
  const single = [makeFact('mult', 3, 3)];
  assert.equal(pickFact(single, {}, 'mult:3:3', rng).id, 'mult:3:3', 'com uma conta só, ela pode repetir');
  assert.equal(pickFact([], {}, null, rng), null);
});

test('contas erradas aparecem mais vezes', () => {
  const facts = generateFacts({ tables: [6], ops: ['mult'] });
  let weights = {};
  for (let i = 0; i < 3; i++) weights = updateWeight(weights, 'mult:6:7', false);
  const rng = seeded(42);
  const counts = {};
  let last = null;
  for (let i = 0; i < 5000; i++) {
    last = pickFact(facts, weights, last?.id, rng);
    counts[last.id] = (counts[last.id] || 0) + 1;
  }
  const hard = counts['mult:6:7'];
  const others = facts.filter((f) => f.id !== 'mult:6:7').map((f) => counts[f.id]);
  const averageOther = others.reduce((a, b) => a + b, 0) / others.length;
  assert.ok(hard > averageOther * 3, `difícil: ${hard}, média das outras: ${averageOther}`);
});

test('pontos, sequência e melhor sequência', () => {
  assert.equal(pointsFor(1), 10);
  assert.equal(pointsFor(2), 12);
  assert.equal(pointsFor(6), 20);
  assert.equal(pointsFor(50), 20);
  let score = emptyScore();
  for (const ok of [true, true, true, false, true]) score = registerAnswer(score, ok);
  assert.deepEqual(score, { points: 10 + 12 + 14 + 10, correct: 4, answered: 5, streak: 1, bestStreak: 3 });
  assert.equal(streakMessage(3), '3 seguidas! 🔥');
  assert.equal(streakMessage(4), '');
  assert.equal(streakMessage(15), '15 seguidas! Incrível! 🌟');
});

test('estrelas sem pressão: quem termina ganha pelo menos uma', () => {
  assert.equal(starsFor(10, 10), 3);
  assert.equal(starsFor(9, 10), 3);
  assert.equal(starsFor(6, 10), 2);
  assert.equal(starsFor(1, 10), 1);
  assert.equal(starsFor(0, 10), 1);
  assert.equal(starsFor(0, 0), 0);
});

test('perfil novo e registro de respostas', () => {
  assert.throws(() => createProfile('   '), /nome/);
  const profile = createProfile('  Maria   Exemplo  ', '🐼', 'p-maria');
  assert.equal(profile.name, 'Maria Exemplo');
  assert.equal(profile.avatar, '🐼');
  assert.equal(createProfile('Ana', '💣', 'p-ana').avatar, AVATARS[0]);
  const fact = makeFact('mult', 8, 7);
  let updated = recordAttempt(profile, fact, false);
  updated = recordAttempt(updated, fact, true);
  assert.deepEqual(updated.stats['mult:8:7'], { a: 2, c: 1 });
  assert.equal(weightOf(updated.weights, 'mult:8:7'), 1 + WEIGHT.wrongStep - WEIGHT.rightStep);
  assert.deepEqual(profile.stats, {}, 'o perfil original não muda');
});

test('serialização ida e volta dos perfis', () => {
  let maria = createProfile('Maria Exemplo', '🦊', 'p-maria');
  maria = recordAttempt(maria, makeFact('div', 9, 6), false);
  maria = { ...maria, stars: 12, bestChallenge: 23, settings: { tables: [9, 3], ops: ['div', 'mult'], extended: false } };
  const joao = createProfile('João Exemplo', '🐸', 'p-joao');
  const data = { version: 1, profiles: [maria, joao], currentId: 'p-joao' };
  const restored = parseData(serialize(data));
  assert.equal(restored.currentId, 'p-joao');
  assert.equal(restored.profiles.length, 2);
  assert.deepEqual(restored.profiles[0].stats, maria.stats);
  assert.deepEqual(restored.profiles[0].weights, maria.weights);
  assert.equal(restored.profiles[0].stars, 12);
  assert.equal(restored.profiles[0].bestChallenge, 23);
  assert.deepEqual(restored.profiles[0].settings, { tables: [3, 9], ops: ['div', 'mult'], extended: false });
});

test('dados salvos inválidos são limpos sem quebrar', () => {
  assert.deepEqual(parseData('{quebrado'), { version: 1, profiles: [], currentId: null });
  assert.deepEqual(parseData('null'), { version: 1, profiles: [], currentId: null });
  const raw = {
    currentId: 'nao-existe',
    profiles: [
      { id: 'p-ok', name: 'Bia', avatar: '🐧', stars: -3, bestChallenge: 'muito',
        weights: { 'mult:2:3': 99, 'mult:2:4': 0.5, 'soma:1:1': 5, 'mult:20:1': 4 },
        stats: { 'mult:2:3': { a: 2, c: 5 }, 'mult:2:5': { a: 3, c: 1 }, lixo: { a: 1, c: 1 } },
        settings: { tables: [15, 'x'], ops: ['raiz'], extended: 'sim' } },
      { id: 'p-ok', name: 'Duplicado', avatar: '🐧' },
      { id: 'ID INVÁLIDO', name: 'X' },
      { id: 'p-sem-nome', name: '   ' },
      'texto solto',
    ],
  };
  const data = parseData(JSON.stringify(raw));
  assert.equal(data.profiles.length, 1);
  const [bia] = data.profiles;
  assert.equal(data.currentId, 'p-ok');
  assert.equal(bia.stars, 0);
  assert.equal(bia.bestChallenge, 0);
  assert.deepEqual(bia.weights, { 'mult:2:3': WEIGHT.max });
  assert.deepEqual(bia.stats, { 'mult:2:5': { a: 3, c: 1 } });
  assert.deepEqual(bia.settings, { tables: [2, 3, 4, 5], ops: ['mult'], extended: false });
});

test('área dos responsáveis: acertos por tabuada e contas mais difíceis', () => {
  let profile = createProfile('Maria Exemplo', '🦊', 'p-maria');
  const answers = [
    ['mult', 7, 8, false], ['mult', 7, 8, false], ['mult', 7, 8, true],
    ['div', 7, 6, true], ['mult', 3, 4, true], ['mult', 3, 4, true],
    ['mult', 6, 9, false], ['mult', 6, 9, true], ['mult', 9, 9, false],
  ];
  for (const [op, table, factor, ok] of answers) profile = recordAttempt(profile, makeFact(op, table, factor), ok);
  assert.deepEqual(tableStats(profile).map((t) => [t.table, t.attempts, t.correct]), [[3, 2, 2], [6, 2, 1], [7, 4, 2], [9, 1, 0]]);
  assert.equal(tableStats(profile)[2].accuracy, 0.5);
  const hardest = hardestFacts(profile);
  assert.deepEqual(hardest.map((h) => h.id), ['mult:7:8', 'mult:6:9'], 'precisa de 2 tentativas para entrar');
  assert.deepEqual(hardest[0], { id: 'mult:7:8', text: '7 × 8 = 56', attempts: 3, errors: 2 });
  assert.equal(factFromId('div:7:6').text, '42 ÷ 7');
  assert.equal(factFromId('mult:13:1'), null);
  assert.equal(factFromId('qualquer'), null);
});
