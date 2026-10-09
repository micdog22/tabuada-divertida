import {
  AVATARS, CHALLENGE_SECONDS, ENCOURAGE, PRAISE, ROUND_SIZE, checkAnswer, createProfile, emptyData, emptyScore,
  endMessage, generateFacts, hardestFacts, makeFact, maxFactorFor, parseData, pickFact, recordAttempt,
  registerAnswer, serialize, starsFor, streakMessage, tableStats,
} from './tabuada.js';

const DATA_KEY = 'tabuada-divertida:v1';
const SOUND_KEY = 'tabuada-divertida:som';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'apagar', '0', 'ok'];
const SECTIONS = ['inicio', 'jogo', 'fim', 'estudo', 'responsaveis'];

const $ = (id) => document.getElementById(id);
const els = {
  sound: $('som'),
  profilesCard: document.querySelector('.profiles'),
  profiles: $('perfis'),
  profileForm: $('form-perfil'),
  profileName: $('nome-perfil'),
  avatars: $('avatares'),
  profileError: $('erro-perfil'),
  cancelProfile: $('cancelar-perfil'),
  tables: $('tabuadas'),
  allTables: $('todas'),
  noTables: $('nenhuma'),
  extended: $('ate-12'),
  opMult: $('op-mult'),
  opDiv: $('op-div'),
  configError: $('erro-config'),
  modeTraining: $('modo-treino'),
  modeChallenge: $('modo-desafio'),
  modeStudy: $('modo-estudo'),
  openParents: $('abrir-responsaveis'),
  progress: $('jogo-progresso'),
  points: $('jogo-pontos'),
  streak: $('jogo-sequencia'),
  bar: $('jogo-barra'),
  answerForm: $('form-resposta'),
  question: $('conta'),
  answer: $('resposta'),
  keypad: $('teclado'),
  feedback: $('jogo-retorno'),
  continue: $('continuar'),
  stop: $('parar'),
  endStars: $('fim-estrelas'),
  endTitle: $('fim-titulo'),
  endMessage: $('fim-mensagem'),
  endSummary: $('fim-resumo'),
  endPractice: $('fim-treinar'),
  playAgain: $('jogar-de-novo'),
  backHome: $('voltar-inicio'),
  studyTables: $('estudo-tabuadas'),
  hide: $('esconder'),
  studyMult: $('estudo-mult'),
  studyDiv: $('estudo-div'),
  studyBack: $('estudo-voltar'),
  parentsTitle: $('resp-titulo'),
  parentsSummary: $('resp-resumo'),
  parentsTables: $('resp-tabuadas'),
  parentsHardest: $('resp-dificeis'),
  reset: $('zerar'),
  deleteProfile: $('apagar-perfil'),
  parentsNotice: $('resp-aviso'),
  parentsBack: $('resp-voltar'),
};

let data = emptyData();
let soundOn = true;
let session = null;
let gameTimer = null;
let advanceTimer = null;
let studyTable = 2;
let audio = null;
const armed = new Map();

const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const pick = (list) => list[Math.floor(random() * list.length)];
const randomId = () => `p-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('')}`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem localStorage o jogo funciona normalmente, só não guarda o progresso.
  }
}

// ---------- perfis ----------

const currentProfile = () => data.profiles.find((p) => p.id === data.currentId);

function save() {
  storageSet(DATA_KEY, serialize(data));
}

function updateProfile(profile) {
  data = { ...data, profiles: data.profiles.map((p) => (p.id === profile.id ? profile : p)) };
  save();
}

function addProfile(name, avatar) {
  const profile = createProfile(name, avatar, randomId());
  data = { ...data, profiles: [...data.profiles, profile], currentId: profile.id };
  save();
}

function renderProfiles() {
  const chips = data.profiles.map((profile) => {
    const chip = el('button', 'profile-chip');
    chip.type = 'button';
    chip.setAttribute('aria-pressed', String(profile.id === data.currentId));
    chip.append(el('span', 'avatar', profile.avatar), el('span', 'profile-name', profile.name), el('span', 'profile-stars', `⭐ ${profile.stars}`));
    chip.addEventListener('click', () => {
      data = { ...data, currentId: profile.id };
      save();
      renderProfiles();
      renderSettings();
    });
    return chip;
  });
  const add = el('button', 'profile-chip add', '+ Novo perfil');
  add.type = 'button';
  add.addEventListener('click', () => {
    els.profileForm.hidden = false;
    els.profileError.textContent = '';
    els.profileName.value = '';
    els.profileName.focus();
  });
  els.profiles.replaceChildren(...chips, add);
}

function renderAvatars() {
  const options = AVATARS.map((avatar, i) => {
    const label = el('label', 'avatar-option');
    const input = el('input');
    input.type = 'radio';
    input.name = 'avatar';
    input.value = avatar;
    input.checked = i === 0;
    label.append(input, el('span', '', avatar));
    return label;
  });
  els.avatars.replaceChildren(...options);
}

// ---------- configuração das tabuadas ----------

function settings() {
  return currentProfile().settings;
}

function setSettings(next) {
  updateProfile({ ...currentProfile(), settings: next });
  renderSettings();
}

function configProblem() {
  const s = settings();
  if (!s.tables.length) return 'Escolha pelo menos uma tabuada.';
  if (!s.ops.length) return 'Escolha pelo menos uma operação.';
  return '';
}

function renderSettings() {
  const s = settings();
  const max = maxFactorFor(s.extended);
  const buttons = [];
  for (let table = 1; table <= max; table++) {
    const button = el('button', 'pick', String(table));
    button.type = 'button';
    button.setAttribute('aria-label', `Tabuada do ${table}`);
    button.setAttribute('aria-pressed', String(s.tables.includes(table)));
    button.addEventListener('click', () => {
      const tables = s.tables.includes(table) ? s.tables.filter((t) => t !== table) : [...s.tables, table].sort((a, b) => a - b);
      setSettings({ ...s, tables });
    });
    buttons.push(button);
  }
  els.tables.replaceChildren(...buttons);
  els.extended.checked = s.extended;
  els.opMult.checked = s.ops.includes('mult');
  els.opDiv.checked = s.ops.includes('div');
  const problem = configProblem();
  els.configError.textContent = problem;
  els.modeTraining.disabled = Boolean(problem);
  els.modeChallenge.disabled = Boolean(problem);
}

// ---------- telas ----------

function showSection(id) {
  for (const name of SECTIONS) $(name).hidden = name !== id;
  els.profilesCard.hidden = id === 'jogo' || id === 'fim';
  if (id !== 'jogo') els.profileForm.hidden = true;
  scrollToSection(id);
}

// Se a tela começa fora da área visível, rola até o topo dela.
function scrollToSection(id) {
  const target = id === 'inicio' ? els.profilesCard : $(id);
  const top = target.getBoundingClientRect().top;
  if (top < 0 || top > window.innerHeight * 0.5) target.scrollIntoView({ block: 'start' });
}

function goHome() {
  stopSession();
  renderProfiles();
  renderSettings();
  showSection('inicio');
}

// ---------- som (Web Audio, bem baixinho) ----------

function tone(freq, offset, duration, type = 'sine', volume = 0.06) {
  if (!audio) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audio = new Context();
  }
  if (audio.state === 'suspended') audio.resume();
  const start = audio.currentTime + offset;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

const SOUNDS = {
  right: () => { tone(523.25, 0, 0.12); tone(659.25, 0.1, 0.2); },
  wrong: () => tone(196, 0, 0.3, 'triangle', 0.045),
  finish: () => [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, i * 0.12, 0.22)),
};

function play(name) {
  if (!soundOn) return;
  try {
    SOUNDS[name]();
  } catch {
    // Navegador sem áudio: segue em silêncio.
  }
}

function renderSound() {
  els.sound.textContent = soundOn ? '🔊 Som ligado' : '🔇 Som desligado';
  els.sound.setAttribute('aria-pressed', String(soundOn));
}

// ---------- confete (só sem "reduzir movimento") ----------

function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = el('div', 'confetti');
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6'];
  for (let i = 0; i < 70; i++) {
    const piece = el('span');
    piece.style.left = `${random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${random() * 0.6}s`;
    piece.style.setProperty('--drift', `${Math.round((random() - 0.5) * 160)}px`);
    piece.style.setProperty('--spin', `${Math.round(random() * 720 - 360)}deg`);
    layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 3500);
}

// ---------- jogo ----------

function renderKeypad() {
  const buttons = KEYS.map((key) => {
    const label = key === 'apagar' ? '⌫' : key === 'ok' ? 'OK' : key;
    const button = el('button', `key key-${key}`, label);
    button.type = 'button';
    button.dataset.key = key;
    if (key === 'apagar') button.setAttribute('aria-label', 'Apagar');
    if (key === 'ok') button.setAttribute('aria-label', 'Confirmar resposta');
    return button;
  });
  els.keypad.replaceChildren(...buttons);
}

function setKeypadEnabled(enabled) {
  for (const button of els.keypad.querySelectorAll('button')) button.disabled = !enabled;
}

function pressKey(key) {
  if (!session || session.waiting || session.ended) return;
  if (key === 'ok') {
    submitAnswer();
    return;
  }
  const value = els.answer.value;
  if (key === 'apagar') els.answer.value = value.slice(0, -1);
  else if (value.length < 3) els.answer.value = value + key;
  els.answer.focus({ preventScroll: true });
}

function updateTop() {
  const { score } = session;
  els.points.textContent = String(score.points);
  els.streak.textContent = String(score.streak);
  if (session.mode === 'treino') {
    const number = Math.min(session.index + (session.waiting ? 0 : 1), ROUND_SIZE);
    els.progress.textContent = `Conta ${number} de ${ROUND_SIZE}`;
    els.bar.style.width = `${(session.index / ROUND_SIZE) * 100}%`;
  }
}

function tickChallenge() {
  if (!session || session.ended || session.mode !== 'desafio') return;
  const left = Math.max(0, session.deadline - performance.now());
  els.progress.textContent = `⏱️ ${Math.ceil(left / 1000)} s`;
  els.bar.style.width = `${(left / (CHALLENGE_SECONDS * 1000)) * 100}%`;
  if (left <= 0) endSession();
}

function startSession(mode) {
  const facts = generateFacts(settings());
  if (!facts.length) {
    renderSettings();
    return;
  }
  stopSession();
  session = {
    mode,
    facts,
    fact: null,
    lastId: null,
    score: emptyScore(),
    index: 0,
    misses: new Map(),
    waiting: false,
    ended: false,
    deadline: performance.now() + CHALLENGE_SECONDS * 1000,
  };
  showSection('jogo');
  if (mode === 'desafio') {
    tickChallenge();
    gameTimer = setInterval(tickChallenge, 200);
  }
  nextQuestion();
  scrollToSection('jogo');
}

function stopSession() {
  clearInterval(gameTimer);
  clearTimeout(advanceTimer);
  gameTimer = null;
  if (session) session.ended = true;
}

function nextQuestion() {
  clearTimeout(advanceTimer);
  if (!session || session.ended) return;
  if (session.mode === 'treino' && session.index >= ROUND_SIZE) {
    endSession();
    return;
  }
  const fact = pickFact(session.facts, currentProfile().weights, session.lastId, random);
  session.fact = fact;
  session.lastId = fact.id;
  session.waiting = false;
  els.question.textContent = `${fact.text} = ?`;
  els.answer.value = '';
  els.answer.readOnly = false;
  setKeypadEnabled(true);
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';
  els.continue.hidden = true;
  updateTop();
  els.answer.focus({ preventScroll: true });
}

function submitAnswer() {
  if (!session || session.waiting || session.ended) return;
  const fact = session.fact;
  const correct = checkAnswer(fact, els.answer.value);
  if (correct === null) {
    els.feedback.className = 'feedback';
    els.feedback.textContent = 'Digite um número antes de confirmar. 😊';
    els.answer.focus({ preventScroll: true });
    return;
  }
  updateProfile(recordAttempt(currentProfile(), fact, correct));
  session.score = registerAnswer(session.score, correct);
  session.index += 1;
  session.waiting = true;
  els.answer.readOnly = true;
  setKeypadEnabled(false);
  const result = `${fact.text} = ${fact.answer}.`;
  if (correct) {
    const extra = streakMessage(session.score.streak);
    els.feedback.className = 'feedback is-right';
    els.feedback.textContent = `✅ ${pick(PRAISE)} ${result}${extra ? ` ${extra}` : ''}`;
    play('right');
    advanceTimer = setTimeout(nextQuestion, session.mode === 'desafio' ? 450 : 1100);
  } else {
    const miss = session.misses.get(fact.id) || { text: `${fact.text} = ${fact.answer}`, count: 0 };
    miss.count += 1;
    session.misses.set(fact.id, miss);
    els.feedback.className = 'feedback is-wrong';
    els.feedback.textContent = `💡 ${pick(ENCOURAGE)} ${result}`;
    play('wrong');
    if (session.mode === 'desafio') {
      advanceTimer = setTimeout(nextQuestion, 1500);
    } else {
      els.continue.textContent = session.index >= ROUND_SIZE ? 'Ver resultado ➜' : 'Continuar ➜';
      els.continue.hidden = false;
      els.continue.focus();
    }
  }
  updateTop();
}

function endSession() {
  if (!session || session.ended) return;
  stopSession();
  const { correct, answered, points, bestStreak } = session.score;
  const stars = starsFor(correct, answered);
  let profile = currentProfile();
  const previousBest = profile.bestChallenge;
  const record = session.mode === 'desafio' && correct > previousBest;
  profile = { ...profile, stars: profile.stars + stars, bestChallenge: record ? correct : previousBest };
  updateProfile(profile);

  els.endStars.textContent = answered ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '';
  if (!answered) els.endTitle.textContent = 'Que tal tentar de novo?';
  else if (session.mode === 'desafio') els.endTitle.textContent = `${correct} ${correct === 1 ? 'acerto' : 'acertos'} em ${CHALLENGE_SECONDS} segundos!`;
  else els.endTitle.textContent = `Você acertou ${correct} de ${answered}!`;
  els.endMessage.textContent = answered ? endMessage(stars) : 'Nenhuma conta foi respondida desta vez.';

  const summary = [];
  if (answered) {
    summary.push(`⭐ ${points} pontos`, `🔥 Maior sequência: ${bestStreak}`);
    summary.push(`🌟 Você ganhou ${stars} ${stars === 1 ? 'estrela' : 'estrelas'} (total: ${profile.stars})`);
  }
  if (session.mode === 'desafio') {
    summary.push(record ? '🏆 Novo recorde no desafio!' : `🏆 Recorde no desafio: ${profile.bestChallenge} ${profile.bestChallenge === 1 ? 'acerto' : 'acertos'}`);
  }
  els.endSummary.replaceChildren(...summary.map((text) => el('li', '', text)));

  if (session.misses.size) {
    const list = el('ul', 'practice-list');
    for (const miss of session.misses.values()) list.append(el('li', '', miss.text));
    els.endPractice.replaceChildren(el('h3', '', 'Contas para treinar mais'), list);
  } else {
    els.endPractice.replaceChildren(answered ? el('p', 'perfect', 'Nenhum erro! 🎉') : el('span'));
  }
  els.playAgain.dataset.mode = session.mode;
  showSection('fim');
  els.endTitle.focus();
  if (answered) play('finish');
  if (stars === 3 || record) confetti();
}

// ---------- tabuada completa ----------

function renderStudy() {
  const max = maxFactorFor(settings().extended);
  if (studyTable > max) studyTable = max;
  const pickers = [];
  for (let table = 1; table <= max; table++) {
    const button = el('button', 'pick', String(table));
    button.type = 'button';
    button.setAttribute('aria-label', `Tabuada do ${table}`);
    button.setAttribute('aria-pressed', String(table === studyTable));
    button.addEventListener('click', () => {
      studyTable = table;
      renderStudy();
    });
    pickers.push(button);
  }
  els.studyTables.replaceChildren(...pickers);
  const hide = els.hide.checked;
  const line = (fact) => {
    const li = el('li');
    li.append(`${fact.text} = `);
    if (hide) {
      const reveal = el('button', 'reveal', '?');
      reveal.type = 'button';
      reveal.setAttribute('aria-label', `Mostrar o resultado de ${fact.text}`);
      reveal.addEventListener('click', () => reveal.replaceWith(el('strong', '', String(fact.answer))));
      li.append(reveal);
    } else {
      li.append(el('strong', '', String(fact.answer)));
    }
    return li;
  };
  const mult = [];
  const div = [];
  for (let factor = 1; factor <= max; factor++) {
    mult.push(line(makeFact('mult', studyTable, factor)));
    div.push(line(makeFact('div', studyTable, factor)));
  }
  els.studyMult.replaceChildren(...mult);
  els.studyDiv.replaceChildren(...div);
}

// ---------- área dos responsáveis ----------

function renderParents() {
  const profile = currentProfile();
  const stats = tableStats(profile);
  const total = stats.reduce((sum, t) => sum + t.attempts, 0);
  els.parentsSummary.textContent = `${profile.avatar} ${profile.name} · ⭐ ${profile.stars} ${profile.stars === 1 ? 'estrela' : 'estrelas'} · `
    + `recorde no desafio: ${profile.bestChallenge} ${profile.bestChallenge === 1 ? 'acerto' : 'acertos'} · ${total} ${total === 1 ? 'resposta' : 'respostas'} no total.`;

  if (!stats.length) {
    els.parentsTables.replaceChildren(el('p', 'muted', 'Ainda não há respostas deste perfil. Jogue uma rodada e volte aqui!'));
  } else {
    els.parentsTables.replaceChildren(...stats.map((t) => {
      const percent = Math.round(t.accuracy * 100);
      const row = el('div', 'stat-row');
      const bar = el('div', 'stat-bar');
      const fill = el('div', `stat-fill ${percent >= 80 ? 'good' : percent >= 50 ? 'mid' : 'low'}`);
      fill.style.width = `${percent}%`;
      bar.append(fill);
      row.append(el('span', 'stat-label', `Tabuada do ${t.table}`), bar, el('span', 'stat-value', `${percent}% (${t.correct} de ${t.attempts})`));
      return row;
    }));
  }
  const hardest = hardestFacts(profile);
  els.parentsHardest.replaceChildren(...(hardest.length
    ? hardest.map((h) => el('li', '', `${h.text} — errou ${h.errors} de ${h.attempts} ${h.attempts === 1 ? 'vez' : 'vezes'}`))
    : [el('li', 'none', 'Nenhuma conta difícil por enquanto. 👏')]));
  els.parentsNotice.textContent = '';
}

// Botões perigosos pedem um segundo clique para confirmar.
function confirmClick(button, label, action) {
  if (armed.get(button)) {
    clearTimeout(armed.get(button));
    armed.delete(button);
    button.textContent = label;
    action();
    return;
  }
  button.textContent = 'Clique de novo para confirmar';
  armed.set(button, setTimeout(() => {
    armed.delete(button);
    button.textContent = label;
  }, 4000));
}

// ---------- eventos ----------

function bindEvents() {
  els.sound.addEventListener('click', () => {
    soundOn = !soundOn;
    storageSet(SOUND_KEY, soundOn ? 'on' : 'off');
    renderSound();
  });

  els.profileForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const avatar = els.profileForm.elements.avatar.value;
    try {
      addProfile(els.profileName.value, avatar);
    } catch (error) {
      els.profileError.textContent = error.message;
      els.profileName.focus();
      return;
    }
    els.profileForm.hidden = true;
    renderProfiles();
    renderSettings();
  });
  els.cancelProfile.addEventListener('click', () => { els.profileForm.hidden = true; });

  els.allTables.addEventListener('click', () => {
    const max = maxFactorFor(settings().extended);
    setSettings({ ...settings(), tables: Array.from({ length: max }, (_, i) => i + 1) });
  });
  els.noTables.addEventListener('click', () => setSettings({ ...settings(), tables: [] }));
  els.extended.addEventListener('change', () => {
    const extended = els.extended.checked;
    const tables = settings().tables.filter((t) => t <= maxFactorFor(extended));
    setSettings({ ...settings(), extended, tables });
  });
  for (const box of [els.opMult, els.opDiv]) {
    box.addEventListener('change', () => {
      const ops = [els.opMult, els.opDiv].filter((b) => b.checked).map((b) => b.value);
      setSettings({ ...settings(), ops });
    });
  }

  els.modeTraining.addEventListener('click', () => startSession('treino'));
  els.modeChallenge.addEventListener('click', () => startSession('desafio'));
  els.modeStudy.addEventListener('click', () => {
    studyTable = settings().tables[0] || 2;
    renderStudy();
    showSection('estudo');
  });
  els.openParents.addEventListener('click', () => {
    renderParents();
    showSection('responsaveis');
    els.parentsTitle.focus();
  });

  els.answerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitAnswer();
  });
  els.answer.addEventListener('input', () => {
    const clean = els.answer.value.replace(/\D/g, '').slice(0, 3);
    if (clean !== els.answer.value) els.answer.value = clean;
  });
  els.keypad.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-key]');
    if (button) pressKey(button.dataset.key);
  });
  document.addEventListener('keydown', (event) => {
    if (!session || session.ended || $('jogo').hidden || document.activeElement === els.answer) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      pressKey(event.key);
    } else if (event.key === 'Backspace' && !session.waiting) {
      event.preventDefault();
      pressKey('apagar');
    }
  });
  els.continue.addEventListener('click', nextQuestion);
  els.stop.addEventListener('click', () => {
    if (session && session.score.answered > 0) endSession();
    else goHome();
  });

  els.playAgain.addEventListener('click', () => startSession(els.playAgain.dataset.mode || 'treino'));
  els.backHome.addEventListener('click', goHome);
  els.hide.addEventListener('change', renderStudy);
  els.studyBack.addEventListener('click', goHome);
  els.parentsBack.addEventListener('click', goHome);

  els.reset.addEventListener('click', () => confirmClick(els.reset, 'Zerar progresso deste perfil', () => {
    updateProfile({ ...currentProfile(), stars: 0, bestChallenge: 0, weights: {}, stats: {} });
    renderParents();
    renderProfiles();
    els.parentsNotice.textContent = 'Progresso zerado.';
  }));
  els.deleteProfile.addEventListener('click', () => confirmClick(els.deleteProfile, 'Apagar este perfil', () => {
    const remaining = data.profiles.filter((p) => p.id !== data.currentId);
    data = { ...data, profiles: remaining, currentId: remaining[0]?.id ?? null };
    if (!remaining.length) addProfile('Jogador 1', AVATARS[0]);
    save();
    goHome();
  }));
}

function init() {
  data = parseData(storageGet(DATA_KEY) || '');
  if (!data.profiles.length) addProfile('Jogador 1', AVATARS[0]);
  soundOn = storageGet(SOUND_KEY) !== 'off';
  renderSound();
  renderAvatars();
  renderKeypad();
  renderProfiles();
  renderSettings();
  bindEvents();
}

init();
