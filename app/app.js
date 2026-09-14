/* हिंदी अभ्यास — कक्षा ४ (वीणा)
   Fixed chapter papers · reveal answer · student enters her own marks. */

'use strict';

const AUTH = { user: 'Mily', pass: '2026' };

const CHAPTERS = [
  { n: 1, title: 'चिड़िया का गीत',  kind: 'कविता'    },
  { n: 2, title: 'बगीचे का घोंघा',  kind: 'कहानी'    },
  { n: 3, title: 'नीम',             kind: 'कविता'    },
  { n: 4, title: 'हमारा आहार',      kind: 'कविता'    },
  { n: 5, title: 'आसमान गिरा',      kind: 'कहानी'    },
  { n: 6, title: 'जयपुर से पत्र',   kind: 'पत्र'     },
  { n: 7, title: 'नकली हीरे',       kind: 'चित्रकथा' }
];

const HI = ['०','१','२','३','४','५','६','७','८','९'];
const hin = n => String(n).replace(/\d/g, d => HI[+d]);

const LS = {
  session: 'mily.session',
  name:    'mily.studentName',
  scores:  ch => `mily.scores.ch${ch}`
};

const store = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } },
  set(k, v)  { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k)     { try { localStorage.removeItem(k); } catch {} }
};

const $  = s => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

const state = { paper: null, scores: {}, studentName: '' };
const paperCache = {};
let allPapers = null;

/* जाँच (marking) mode — in-memory only; never written to
   localStorage/sessionStorage/a cookie/the URL, so it resets to false on
   every page load for free. */
let checkMode = false;
const GANESH_HASH = '__GANESH_HASH__';

/* ==================== LOGIN ==================== */

function showLogin() {
  $('#appShell').hidden = true;
  $('#loginView').hidden = false;
  $('#passInput').value = '';
  $('#userInput').focus();
}

function showApp() {
  $('#loginView').hidden = true;
  $('#appShell').hidden = false;
  state.studentName = store.get(LS.name, '') || AUTH.user;
  $('#nameInput').value = state.studentName;
  renderChapters();
  goto('chapters');
}

$('#loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const u = $('#userInput').value.trim();
  const p = $('#passInput').value;
  if (u.toLowerCase() === AUTH.user.toLowerCase() && p === AUTH.pass) {
    $('#loginError').hidden = true;
    store.set(LS.session, true);
    showApp();
  } else {
    $('#loginError').hidden = false;
    $('#passInput').value = '';
    $('#passInput').focus();
  }
});

$('#logoutBtn').addEventListener('click', () => {
  store.del(LS.session);
  checkMode = false;
  applyMode();
  showLogin();
});

/* ==================== NAVIGATION ==================== */

function goto(view) {
  $('#chaptersView').hidden = view !== 'chapters';
  $('#paperView').hidden    = view !== 'paper';
  $('#resultView').hidden   = view !== 'result';
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

$('#homeBtn').addEventListener('click', () => { checkMode = false; applyMode(); renderChapters(); goto('chapters'); });
$('#backBtn').addEventListener('click', () => { checkMode = false; applyMode(); renderChapters(); goto('chapters'); });

$('#nameInput').addEventListener('input', e => {
  state.studentName = e.target.value;
  store.set(LS.name, state.studentName);
  paintWho();
});

function paintWho() {
  const n = (state.studentName || '').trim() || 'विद्यार्थी';
  $('#heroName').textContent = n;
  $('#whoLabel').textContent = n;
}

/* ==================== CHAPTER LIST ==================== */

function chapterProgress(n) {
  const s = store.get(LS.scores(n), {});
  const keys = Object.keys(s);
  let got = 0;
  keys.forEach(k => { got += Number(s[k]) || 0; });
  return { answered: keys.length, got };
}

function renderChapters() {
  paintWho();
  const grid = $('#chapterGrid');
  grid.innerHTML = '';
  let totalGot = 0, totalAttempted = 0;

  CHAPTERS.forEach(ch => {
    const p = chapterProgress(ch.n);
    if (p.answered) { totalGot += p.got; totalAttempted++; }

    const card = el('button', 'ch-card');
    card.type = 'button';

    const top = el('div', 'ch-top');
    top.append(el('div', 'ch-num', hin(ch.n)));
    const box = el('div');
    box.append(el('div', 'ch-name', ch.title));
    box.append(el('div', 'ch-meta', `पाठ ${hin(ch.n)} · ${ch.kind} · १०० अंक`));
    top.append(box);
    card.append(top);

    const bar = el('div', 'ch-bar');
    const fill = el('i');
    fill.style.width = Math.min(100, p.got) + '%';
    bar.append(fill);
    card.append(bar);

    const st = el('div', 'ch-status');
    st.append(el('span', p.answered ? 'done' : '', p.answered ? `प्राप्तांक ${hin(p.got)}/१००` : 'अभी शुरू नहीं किया'));
    st.append(el('span', '', p.answered ? `${hin(p.answered)} प्रश्न जाँचे` : 'आरंभ करें →'));
    card.append(st);

    card.addEventListener('click', () => openPaper(ch.n));
    grid.append(card);
  });

  const oc = $('#overallCard');
  if (totalAttempted) {
    oc.innerHTML = `अब तक <b>${hin(totalAttempted)}</b> पाठ के प्रश्नपत्र जाँचे गए · कुल प्राप्तांक <b>${hin(totalGot)}</b> / ${hin(totalAttempted * 100)}`;
  } else {
    oc.innerHTML = 'अभी कोई प्रश्नपत्र आरंभ नहीं हुआ। ऊपर से कोई पाठ चुनिए और उत्तर अपनी उत्तर-पुस्तिका में लिखिए। 📝';
  }
}

/* ==================== PAPER ==================== */

async function loadPaper(n) {
  if (paperCache[n]) return paperCache[n];
  if (!allPapers) {
    allPapers = JSON.parse(document.getElementById('papersData').textContent);
  }
  const data = allPapers[n];
  if (!data) throw new Error('paper ' + n + ' not found');
  paperCache[n] = data;
  return data;
}

async function openPaper(n) {
  let data;
  try {
    data = await loadPaper(n);
  } catch (err) {
    alert('क्षमा कीजिए, यह प्रश्नपत्र लोड नहीं हो सका। कृपया पृष्ठ पुनः लोड कीजिए।');
    return;
  }
  checkMode = false;
  state.paper = data;
  state.scores = store.get(LS.scores(n), {});
  renderPaper();
  goto('paper');
}

function itemId(si, bi, ii) { return `${si}-${bi}-${ii}`; }

function renderPaper() {
  const p = state.paper;

  /* ---- header ---- */
  const head = $('#paperHead');
  head.innerHTML = '';
  head.append(el('div', 'ph-org', 'परमाणु ऊर्जा शिक्षण संस्था'));
  head.append(el('div', 'ph-sub', 'अभ्यास प्रश्नपत्र (२०२५–२६)'));
  head.append(el('div', 'ph-title', `पाठ ${hin(p.chapter)} — ${p.title}`));
  head.append(el('hr', 'ph-rule'));

  const grid = el('div', 'ph-grid');
  [
    ['कक्षा', 'चौथी (४)'],
    ['विषय', 'हिंदी'],
    ['कुल अंक', hin(p.totalMarks)],
    ['समय', '२ घंटे'],
    ['विद्यार्थी', (state.studentName || '').trim() || '—']
  ].forEach(([k, v]) => {
    const s = el('div');
    s.append(document.createTextNode(k + ': '));
    s.append(el('b', null, v));
    grid.append(s);
  });
  head.append(grid);

  const note = el('div', 'ph-note');
  note.innerHTML = '<b>निर्देश —</b> सभी प्रश्नों के उत्तर अपनी उत्तर-पुस्तिका में लिखिए। पूरा प्रश्नपत्र हल करने के बाद ' +
    '“<b>उत्तर देखें</b>” दबाकर अपने उत्तर से मिलाइए और स्वयं अपने अंक भरिए। अधूरा या आंशिक उत्तर होने पर कम अंक दीजिए।';
  head.append(note);

  /* ---- body ---- */
  const body = $('#paperBody');
  body.innerHTML = '';
  let count = 0;

  p.sections.forEach((sec, si) => {
    const secEl = el('section', 'section');
    const sh = el('div', 'section-head');
    sh.append(el('div', null, `खंड ${sec.code} — ${sec.title}`));
    sh.append(el('span', null, `${hin(sec.marks)} अंक`));
    secEl.append(sh);

    sec.blocks.forEach((blk, bi) => {
      const bEl = el('div', 'block');

      if (blk.num || blk.instruction) {
        const bh = el('div', 'block-head');
        if (blk.num) bh.append(el('div', 'block-num', blk.num));
        if (blk.instruction) bh.append(el('div', 'block-inst', blk.instruction));
        bEl.append(bh);
      }

      if (blk.passage) {
        const pe = el('div', 'passage' + (blk.passageType === 'poem' ? ' poem' : ''), blk.passage);
        bEl.append(pe);
      }

      blk.items.forEach((it, ii) => {
        count++;
        bEl.append(renderItem(it, itemId(si, bi, ii)));
      });

      secEl.append(bEl);
    });

    body.append(secEl);
  });

  $('#sbTotal').textContent = hin(p.totalMarks);
  $('#sbCount').textContent = hin(count);
  $('#revealAllBtn').textContent = 'सभी उत्तर दिखाएँ';
  updateScore();
  applyMode();
}

function renderItem(it, id) {
  const wrap = el('div', 'item');
  wrap.dataset.id = id;

  const q = el('div', 'item-q');
  if (it.label) q.append(el('div', 'item-label', it.label));
  q.append(el('div', 'item-text', it.q));
  q.append(el('div', 'item-marks', hin(it.marks)));
  wrap.append(q);

  const ans = el('div', 'answer');
  ans.hidden = true;
  ans.append(el('b', 'ans-tag', 'आदर्श उत्तर'));
  ans.append(document.createTextNode(it.a));

  const tools = el('div', 'item-tools');

  const ansBtn = el('button', 'ans-btn', '👁 उत्तर देखें');
  ansBtn.type = 'button';
  ansBtn.addEventListener('click', () => {
    ans.hidden = !ans.hidden;
    ansBtn.textContent = ans.hidden ? '👁 उत्तर देखें' : '🙈 उत्तर छिपाएँ';
  });
  tools.append(ansBtn);

  const mrow = el('div', 'marks-row');
  mrow.append(el('span', null, 'मेरे अंक:'));
  for (let v = 0; v <= it.marks; v++) {
    const b = el('button', 'mk', hin(v));
    b.type = 'button';
    b.dataset.val = v;
    if (state.scores[id] === v) b.classList.add('on');
    b.addEventListener('click', () => setMark(id, v, mrow, wrap));
    mrow.append(b);
  }
  const clr = el('button', 'mk', '✕');
  clr.type = 'button';
  clr.title = 'अंक हटाएँ';
  clr.addEventListener('click', () => setMark(id, null, mrow, wrap));
  mrow.append(clr);
  tools.append(mrow);

  wrap.append(tools);
  wrap.append(ans);
  if (state.scores[id] != null) wrap.classList.add('scored');
  return wrap;
}

function setMark(id, val, mrow, wrap) {
  if (val === null) { delete state.scores[id]; wrap.classList.remove('scored'); }
  else { state.scores[id] = val; wrap.classList.add('scored'); }
  mrow.querySelectorAll('.mk').forEach(b => b.classList.toggle('on', b.dataset.val !== undefined && Number(b.dataset.val) === val));
  store.set(LS.scores(state.paper.chapter), state.scores);
  updateScore();
}

function updateScore() {
  const keys = Object.keys(state.scores);
  let got = 0;
  keys.forEach(k => { got += Number(state.scores[k]) || 0; });
  const total = state.paper ? state.paper.totalMarks : 100;
  $('#sbGot').textContent = hin(got);
  $('#sbDone').textContent = hin(keys.length);
  $('#sbFill').style.width = Math.min(100, (got / total) * 100) + '%';
}

/* ---- toolbar ---- */
$('#revealAllBtn').addEventListener('click', e => {
  const show = e.target.textContent.indexOf('दिखाएँ') > -1;
  document.querySelectorAll('#paperBody .answer').forEach(a => { a.hidden = !show; });
  document.querySelectorAll('#paperBody .ans-btn').forEach(b => { b.textContent = show ? '🙈 उत्तर छिपाएँ' : '👁 उत्तर देखें'; });
  e.target.textContent = show ? 'सभी उत्तर छिपाएँ' : 'सभी उत्तर दिखाएँ';
});

$('#printBtn').addEventListener('click', () => window.print());

$('#resetBtn').addEventListener('click', () => {
  if (!confirm('इस पाठ के सारे अंक मिटा दिए जाएँ?')) return;
  state.scores = {};
  store.del(LS.scores(state.paper.chapter));
  renderPaper();
});

/* ==================== जाँच MODE ==================== */

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function applyMode() {
  const on = checkMode;

  const modeBtn = $('#checkModeBtn');
  modeBtn.classList.toggle('on', on);
  modeBtn.textContent = on ? '🔓 जाँच मोड बंद करें' : '🔒 जाँच मोड';

  document.querySelectorAll('#paperBody .ans-btn').forEach(b => { b.hidden = !on; });
  document.querySelectorAll('#paperBody .marks-row').forEach(m => { m.hidden = !on; });
  $('#revealAllBtn').hidden = !on;
  $('#resetBtn').hidden = !on;
  $('#scoreBar').hidden = !on;
  $('#resultBtn').hidden = !on;
  $('#practiceBanner').hidden = on;

  if (!on) {
    document.querySelectorAll('#paperBody .answer').forEach(a => { a.hidden = true; });
    document.querySelectorAll('#paperBody .ans-btn').forEach(b => { b.textContent = '👁 उत्तर देखें'; });
    $('#revealAllBtn').textContent = 'सभी उत्तर दिखाएँ';
  }
}

$('#checkModeBtn').addEventListener('click', () => {
  if (!checkMode) {
    $('#ganeshError').hidden = true;
    $('#ganeshInput').value = '';
    $('#ganeshDialog').showModal();
    $('#ganeshInput').focus();
  } else {
    checkMode = false;
    applyMode();
  }
});

$('#ganeshForm').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = $('#ganeshError');

  if (!(window.crypto && window.crypto.subtle)) {
    errEl.textContent = 'यह सुविधा केवल सुरक्षित (https) या localhost पर काम करती है।';
    errEl.hidden = false;
    return;
  }

  const typed = $('#ganeshInput').value.trim();
  const hash = await sha256Hex(typed);

  if (hash === GANESH_HASH) {
    errEl.hidden = true;
    $('#ganeshDialog').close();
    checkMode = true;
    applyMode();
  } else {
    errEl.textContent = 'ग़लत कोड है।';
    errEl.hidden = false;
    $('#ganeshInput').value = '';
    $('#ganeshInput').focus();
  }
});

$('#ganeshCancel').addEventListener('click', () => {
  $('#ganeshDialog').close();
});

$('#ganeshDialog').addEventListener('click', e => {
  if (e.target === $('#ganeshDialog')) {
    $('#ganeshDialog').close();
  }
});

/* ==================== RESULT ==================== */

$('#resultBtn').addEventListener('click', renderResult);

function gradeFor(pct) {
  if (pct >= 90) return { g: 'A+ · अति उत्तम', msg: 'शाबाश! बहुत सुंदर तैयारी है। 🌟' };
  if (pct >= 75) return { g: 'A · उत्तम',      msg: 'बहुत अच्छा! थोड़े से अभ्यास से और निखार आएगा। 👏' };
  if (pct >= 60) return { g: 'B · अच्छा',      msg: 'अच्छा प्रयास! जिन प्रश्नों में कम अंक मिले, उन्हें दोबारा पढ़िए। 💪' };
  if (pct >= 40) return { g: 'C · संतोषजनक',   msg: 'ठीक है, पर पाठ को एक बार फिर ध्यान से पढ़िए। 📖' };
  return { g: 'D · और अभ्यास चाहिए', msg: 'कोई बात नहीं! पाठ दोबारा पढ़कर यह प्रश्नपत्र फिर हल कीजिए। 🌱' };
}

function renderResult() {
  const p = state.paper;
  let got = 0, answered = 0, count = 0;
  const rows = [];

  p.sections.forEach((sec, si) => {
    let sGot = 0, sAns = 0, sCount = 0;
    sec.blocks.forEach((blk, bi) => blk.items.forEach((it, ii) => {
      count++; sCount++;
      const v = state.scores[itemId(si, bi, ii)];
      if (v != null) { sGot += v; sAns++; answered++; got += v; }
    }));
    rows.push({ code: sec.code, title: sec.title, marks: sec.marks, got: sGot, ans: sAns, count: sCount });
  });

  const pct = Math.round((got / p.totalMarks) * 1000) / 10;
  const gr = gradeFor(pct);

  const view = $('#resultView');
  view.innerHTML = '';
  const card = el('div', 'result-card');

  card.append(el('h2', 'rc-title', 'परिणाम'));
  card.append(el('p', 'rc-for', `${(state.studentName || 'विद्यार्थी').trim()} · पाठ ${hin(p.chapter)} — ${p.title}`));

  const sc = el('div', 'rc-score');
  sc.append(document.createTextNode(hin(got)));
  sc.append(el('small', null, ' / ' + hin(p.totalMarks)));
  card.append(sc);
  card.append(el('div', 'rc-pct', hin(pct) + '%'));
  card.append(el('div', 'rc-grade', gr.g));
  card.append(el('p', 'rc-note', gr.msg));

  if (answered < count) {
    const warn = el('p', 'rc-note');
    warn.innerHTML = `⚠️ अभी <b>${hin(count - answered)}</b> प्रश्नों के अंक नहीं भरे गए हैं।`;
    card.append(warn);
  }

  const tbl = el('table', 'rc-table');
  tbl.innerHTML = '<thead><tr><th>खंड</th><th>अनुभाग</th><th>जाँचे गए</th><th>प्राप्तांक</th></tr></thead>';
  const tb = el('tbody');
  rows.forEach(r => {
    const tr = el('tr');
    tr.append(el('td', null, r.code));
    tr.append(el('td', null, r.title));
    tr.append(el('td', null, `${hin(r.ans)}/${hin(r.count)}`));
    tr.append(el('td', null, `${hin(r.got)} / ${hin(r.marks)}`));
    tb.append(tr);
  });
  const tr = el('tr');
  tr.append(el('td', null, ''));
  tr.append(el('td', null, 'कुल'));
  tr.append(el('td', null, `${hin(answered)}/${hin(count)}`));
  tr.append(el('td', null, `${hin(got)} / ${hin(p.totalMarks)}`));
  tb.append(tr);
  tbl.append(tb);
  card.append(tbl);

  const acts = el('div', 'rc-actions');
  const back = el('button', 'btn btn-ghost', '← प्रश्नपत्र पर लौटें');
  back.addEventListener('click', () => goto('paper'));
  const home = el('button', 'btn btn-primary', 'पाठ सूची');
  home.addEventListener('click', () => { renderChapters(); goto('chapters'); });
  const print = el('button', 'btn btn-ghost', '🖨️ परिणाम छापें');
  print.addEventListener('click', () => window.print());
  acts.append(back, print, home);
  card.append(acts);

  view.append(card);
  goto('result');
}

/* ==================== BOOT ==================== */

if (store.get(LS.session, false)) showApp(); else showLogin();
