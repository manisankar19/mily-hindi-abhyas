/* हिंदी अभ्यास — कक्षा ४ (वीणा)
   Fixed chapter papers + school worksheets (v3) · reveal answer · checker enters marks. */

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
/* Marks may be halves on worksheets: 0.5 → ½, 1.5 → १½, 2 → २. */
const hinMarks = v => {
  const n = Number(v) || 0;
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  return (whole || !half ? hin(whole) : '') + (half ? '½' : '');
};

const DISCLAIMER = 'ये उत्तर अभ्यास के लिए लिखे गए हैं, शिक्षक ने नहीं दिए — ⚑ वाले उत्तर एक बार दोबारा देख लें।';

/* Score keys: chapters keep their v1 key (mily.scores.ch6) so saved marks survive;
   worksheets use their id (mily.scores.ws04). */
const LS = {
  session: 'mily.session',
  name:    'mily.studentName',
  scores:  key => `mily.scores.${key}`
};
const paperKey = p => (p.kind === 'school' ? p.ws : 'ch' + p.chapter);
const isSchool = p => !!p && p.kind === 'school';

const store = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } },
  set(k, v)  { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k)     { try { localStorage.removeItem(k); } catch {} }
};

const $  = s => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const tid = (node, id) => { node.dataset.testid = id; return node; };

const state = { paper: null, key: null, scores: {}, studentName: '' };
let embedded = null;

/* जाँच (marking) mode — in-memory only; never written to
   localStorage/sessionStorage/a cookie/the URL, so it resets to false on
   every page load for free. */
let checkMode = false;
const GANESH_HASH = '__GANESH_HASH__';

/* ==================== EMBEDDED DATA ==================== */

function data() {
  if (!embedded) {
    const read = (id, fb) => { const n = document.getElementById(id); return n ? JSON.parse(n.textContent) : fb; };
    embedded = { papers: read('papersData', {}), order: read('worksheetOrder', []), assets: read('assetsData', {}) };
  }
  return embedded;
}

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

/* ==================== CHAPTER LIST + WORKSHEETS ==================== */

function progress(key) {
  const s = store.get(LS.scores(key), {});
  const keys = Object.keys(s);
  let got = 0;
  keys.forEach(k => { got += Number(s[k]) || 0; });
  return { answered: keys.length, got };
}

function card({ num, name, meta, got, answered, total, onOpen }) {
  const c = el('button', 'ch-card');
  c.type = 'button';
  const top = el('div', 'ch-top');
  top.append(el('div', 'ch-num', num));
  const box = el('div');
  box.append(el('div', 'ch-name', name));
  box.append(el('div', 'ch-meta', meta));
  top.append(box);
  c.append(top);

  const bar = el('div', 'ch-bar');
  const fill = el('i');
  fill.style.width = Math.min(100, (got / total) * 100) + '%';
  bar.append(fill);
  c.append(bar);

  const st = el('div', 'ch-status');
  st.append(el('span', answered ? 'done' : '', answered ? `प्राप्तांक ${hinMarks(got)}/${hin(total)}` : 'अभी शुरू नहीं किया'));
  st.append(el('span', '', answered ? `${hin(answered)} प्रश्न जाँचे` : 'आरंभ करें →'));
  c.append(st);
  c.addEventListener('click', onOpen);
  return c;
}

function renderChapters() {
  paintWho();
  const grid = $('#chapterGrid');
  grid.innerHTML = '';
  let totalGot = 0, totalAttempted = 0;

  CHAPTERS.forEach(ch => {
    const p = progress('ch' + ch.n);
    if (p.answered) { totalGot += p.got; totalAttempted++; }
    grid.append(tid(card({
      num: hin(ch.n), name: ch.title, meta: `पाठ ${hin(ch.n)} · ${ch.kind} · १०० अंक`,
      got: p.got, answered: p.answered, total: 100, onOpen: () => openPaper(String(ch.n))
    }), 'chapter-card'));
  });

  const oc = $('#overallCard');
  if (totalAttempted) {
    oc.innerHTML = `अब तक <b>${hin(totalAttempted)}</b> पाठ के प्रश्नपत्र जाँचे गए · कुल प्राप्तांक <b>${hinMarks(totalGot)}</b> / ${hin(totalAttempted * 100)}`;
  } else {
    oc.innerHTML = 'अभी कोई प्रश्नपत्र आरंभ नहीं हुआ। ऊपर से कोई पाठ चुनिए और उत्तर अपनी उत्तर-पुस्तिका में लिखिए। 📝';
  }

  /* School worksheets, in the owner-confirmed order (app/worksheet-order.json). */
  const { papers, order } = data();
  const wsGrid = $('#wsGrid');
  wsGrid.innerHTML = '';
  $('#wsGroup').hidden = !order.length;
  order.forEach((ws, i) => {
    const p = papers[ws];
    if (!p) return;
    const pr = progress(ws);
    const c = tid(card({
      num: hin(i + 1), name: p.shortLabel, meta: `${p.subtitle} · ${hin(p.totalMarks)} अंक`,
      got: pr.got, answered: pr.answered, total: p.totalMarks, onOpen: () => openPaper(ws)
    }), 'ws-card');
    c.dataset.ws = ws;
    c.classList.add('ws-card');
    wsGrid.append(c);
  });
}

/* ==================== PAPER ==================== */

function openPaper(id) {
  const paper = data().papers[id];
  if (!paper) {
    alert('क्षमा कीजिए, यह प्रश्नपत्र लोड नहीं हो सका। कृपया पृष्ठ पुनः लोड कीजिए।');
    return;
  }
  checkMode = false;
  state.paper = paper;
  state.key = paperKey(paper);
  state.scores = store.get(LS.scores(state.key), {});
  renderPaper();
  goto('paper');
}

function itemId(si, bi, ii) { return `${si}-${bi}-${ii}`; }

/* Text with the printed underlined (रेखांकित / गहरे) words wrapped in <u>. */
function underlined(text, spans) {
  const frag = document.createDocumentFragment();
  const words = (spans || []).filter(w => w && text.includes(w));
  /* Plain left-to-right scan (no RegExp built from data): at each position take
     the earliest, then longest, matching word. */
  let i = 0;
  while (i < text.length) {
    let at = -1, word = '';
    words.forEach(w => {
      const k = text.indexOf(w, i);
      if (k !== -1 && (at === -1 || k < at || (k === at && w.length > word.length))) { at = k; word = w; }
    });
    if (at === -1) { frag.append(text.slice(i)); break; }
    if (at > i) frag.append(text.slice(i, at));
    frag.append(el('u', null, word));
    i = at + word.length;
  }
  return frag;
}

function renderHead(p) {
  const head = $('#paperHead');
  head.innerHTML = '';
  if (isSchool(p)) {
    /* The worksheet's own printed header, line by line. */
    const hb = tid(el('div', 'ph-printed'), 'ws-header');
    (p.header || []).forEach(line => hb.append(el('div', 'ph-line', line)));
    head.append(hb);
    head.append(el('hr', 'ph-rule'));
    const grid = el('div', 'ph-grid');
    [['कुल अंक', hin(p.totalMarks)], ['विद्यार्थी', (state.studentName || '').trim() || '—']].forEach(([k, v]) => {
      const s = el('div');
      s.append(document.createTextNode(k + ': '));
      s.append(el('b', null, v));
      grid.append(s);
    });
    head.append(grid);
    const note = el('div', 'ph-note');
    note.innerHTML = '<b>निर्देश —</b> यह विद्यालय का कार्यपत्रक है, जैसा छपा था वैसा ही। उत्तर अपनी उत्तर-पुस्तिका में लिखिए; ' +
      'जहाँ लिखा हो, वह प्रश्न छपे हुए पत्र पर ही करें।';
    head.append(note);
    return;
  }

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
}

function renderPaper() {
  const p = state.paper;
  const school = isSchool(p);
  renderHead(p);

  const body = $('#paperBody');
  body.innerHTML = '';
  let count = 0;

  p.sections.forEach((sec, si) => {
    const secEl = el('section', 'section');
    if (!school || sec.title) {
      const sh = el('div', 'section-head');
      sh.append(el('div', null, school ? sec.title : `खंड ${sec.code} — ${sec.title}`));
      sh.append(el('span', null, `${hinMarks(sec.marks)} अंक`));
      secEl.append(sh);
    }

    sec.blocks.forEach((blk, bi) => {
      const bEl = el('div', 'block');

      if (blk.num || blk.instruction) {
        const bh = el('div', 'block-head');
        if (blk.num) bh.append(el('div', 'block-num', blk.num));
        if (blk.instruction) bh.append(el('div', 'block-inst', blk.instruction));
        /* Printed block marks, e.g. "10 अंक" or "(5M)", unless already in the instruction text. */
        if (school && blk.printedMarks && !(blk.instruction || '').includes(blk.printedMarks)) {
          bh.append(el('span', 'block-marks', blk.printedMarks));
        }
        bEl.append(bh);
      }
      if (school && blk.adaptation) {
        const ad = tid(el('p', 'adaptation no-print'), 'adaptation');
        ad.append(el('b', null, 'यहाँ ऐसे करें: '), blk.adaptation);
        bEl.append(ad);
      }

      if (blk.passage) {
        const pe = el('div', 'passage' + (blk.passageType === 'poem' || blk.passageType === 'पद्यांश' ? ' poem' : ''), blk.passage);
        bEl.append(pe);
      }

      if (school && blk.picture) {
        const src = data().assets[blk.picture];
        if (src) {
          const img = tid(el('img', 'block-picture'), 'block-picture');
          img.src = src;
          img.alt = blk.pictureAlt || 'चित्र';
          img.loading = 'eager';
          bEl.append(img);
        }
      }

      /* Match questions: the printed right-hand column, once per block, in printed order. */
      const right = school && (blk.items.find(i => Array.isArray(i.printedRight) && i.printedRight.length) || {}).printedRight;
      if (right) {
        const mc = tid(el('div', 'match-col'), 'match-col');
        mc.append(el('b', null, 'मिलान के लिए: '));
        right.forEach((w, k) => { if (k) mc.append(' · '); mc.append(el('span', 'match-word', w)); });
        bEl.append(mc);
      }

      blk.items.forEach((it, ii) => {
        count++;
        bEl.append(renderItem(it, itemId(si, bi, ii), school));
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

/* Mark buttons: whole numbers on chapter papers (as before); ½ steps on worksheets. */
function markSteps(marks, school) {
  const step = school ? 0.5 : 1;
  const out = [];
  for (let v = 0; v <= marks + 1e-9; v += step) out.push(Math.round(v * 2) / 2);
  return out;
}

function renderItem(it, id, school) {
  const wrap = el('div', 'item');
  wrap.dataset.id = id;
  wrap._item = it;

  const q = el('div', 'item-q');
  const label = it.label || (school ? it.slot : '');
  if (label) q.append(el('div', 'item-label', label));
  const text = el('div', 'item-text');
  text.append(school ? underlined(it.q || '', it.underline) : (it.q || ''));
  if (school && Array.isArray(it.options) && it.options.length) {
    const ol = tid(el('div', 'options'), 'options');
    it.options.forEach(o => ol.append(el('span', 'option', o)));
    text.append(ol);
  }
  if (school && it.answerKind === 'paperOnly') {
    text.append(tid(el('div', 'paper-only no-print', '📝 यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।'), 'paper-only'));
  }
  q.append(text);
  q.append(el('div', 'item-marks', hinMarks(it.marks)));
  wrap.append(q);

  const tools = el('div', 'item-tools');

  const ansBtn = el('button', 'ans-btn', '👁 उत्तर देखें');
  ansBtn.type = 'button';
  ansBtn.addEventListener('click', () => toggleAnswer(wrap, !wrap.querySelector('.answer')));
  tools.append(ansBtn);

  const mrow = el('div', 'marks-row');
  mrow.append(el('span', null, school ? 'अंक:' : 'मेरे अंक:'));
  markSteps(it.marks, school).forEach(v => {
    const b = el('button', 'mk', hinMarks(v));
    b.type = 'button';
    b.dataset.val = v;
    if (state.scores[id] === v) b.classList.add('on');
    b.addEventListener('click', () => setMark(id, v, mrow, wrap));
    mrow.append(b);
  });
  const clr = el('button', 'mk', '✕');
  clr.type = 'button';
  clr.title = 'अंक हटाएँ';
  clr.addEventListener('click', () => setMark(id, null, mrow, wrap));
  mrow.append(clr);
  tools.append(mrow);

  wrap.append(tools);
  if (state.scores[id] != null) wrap.classList.add('scored');
  return wrap;
}

/* The answer panel is built only when revealed and removed when hidden, so no
   answer text (or ⚑, note, rubric) is in the page before "उत्तर देखें". */
function buildAnswer(it, school) {
  const ans = el('div', 'answer');
  ans.append(el('b', 'ans-tag', 'आदर्श उत्तर'));
  ans.append(document.createTextNode(it.a));
  if (!school) return ans;

  if (it.answerConfidence === 'check') {
    ans.append(tid(el('p', 'ans-flag', '⚑ दोबारा देखें — यह उत्तर विवेक से जाँचें।'), 'ans-flag'));
  }
  if (Array.isArray(it.acceptable) && it.acceptable.length) {
    const acc = tid(el('p', 'ans-acceptable'), 'ans-acceptable');
    acc.append(el('b', null, 'स्वीकार्य उत्तर: '), it.acceptable.join(' · '));
    ans.append(acc);
  }
  if (Array.isArray(it.rubric) && it.rubric.length) {
    const rb = tid(el('div', 'ans-rubric'), 'ans-rubric');
    rb.append(el('b', null, 'अंक-योजना:'));
    const ul = el('ul');
    it.rubric.forEach(r => ul.append(el('li', null, `${hinMarks(r.marks)} अंक — ${r.desc}`)));
    rb.append(ul);
    ans.append(rb);
  }
  if (it.teacherNote) {
    const n = tid(el('p', 'ans-note'), 'ans-note');
    n.append(el('b', null, 'टिप्पणी: '), it.teacherNote);
    ans.append(n);
  }
  if (it.answerRef && it.answerRef.trim() !== '—') {
    ans.append(el('p', 'ans-ref', 'स्रोत: ' + it.answerRef));
  }
  return ans;
}

function toggleAnswer(wrap, show) {
  const existing = wrap.querySelector('.answer');
  if (show && !existing) wrap.append(buildAnswer(wrap._item, isSchool(state.paper)));
  if (!show && existing) existing.remove();
  const btn = wrap.querySelector('.ans-btn');
  if (btn) btn.textContent = show ? '🙈 उत्तर छिपाएँ' : '👁 उत्तर देखें';
}

function setMark(id, val, mrow, wrap) {
  if (val === null) { delete state.scores[id]; wrap.classList.remove('scored'); }
  else { state.scores[id] = val; wrap.classList.add('scored'); }
  mrow.querySelectorAll('.mk').forEach(b => b.classList.toggle('on', b.dataset.val !== undefined && Number(b.dataset.val) === val));
  store.set(LS.scores(state.key), state.scores);
  updateScore();
}

function updateScore() {
  const keys = Object.keys(state.scores);
  let got = 0;
  keys.forEach(k => { got += Number(state.scores[k]) || 0; });
  const total = state.paper ? state.paper.totalMarks : 100;
  $('#sbGot').textContent = hinMarks(got);
  $('#sbDone').textContent = hin(keys.length);
  $('#sbFill').style.width = Math.min(100, (got / total) * 100) + '%';
}

/* ---- toolbar ---- */
$('#revealAllBtn').addEventListener('click', e => {
  const show = e.target.textContent.indexOf('दिखाएँ') > -1;
  document.querySelectorAll('#paperBody .item').forEach(w => toggleAnswer(w, show));
  e.target.textContent = show ? 'सभी उत्तर छिपाएँ' : 'सभी उत्तर दिखाएँ';
});

$('#printBtn').addEventListener('click', () => window.print());

$('#resetBtn').addEventListener('click', () => {
  if (!confirm('इस प्रश्नपत्र के सारे अंक मिटा दिए जाएँ?')) return;
  state.scores = {};
  store.del(LS.scores(state.key));
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

  /* Worksheet disclaimer: only in checking mode, only for school papers. */
  const old = $('#wsDisclaimer');
  if (old) old.remove();
  if (on && isSchool(state.paper)) {
    const d = tid(el('p', 'ws-disclaimer no-print', DISCLAIMER), 'ws-disclaimer');
    d.id = 'wsDisclaimer';
    $('#practiceBanner').after(d);
  }

  if (!on) {
    document.querySelectorAll('#paperBody .item').forEach(w => toggleAnswer(w, false));
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
  const school = isSchool(p);
  let got = 0, answered = 0, count = 0;
  const rows = [];

  p.sections.forEach((sec, si) => {
    let sGot = 0, sAns = 0, sCount = 0;
    sec.blocks.forEach((blk, bi) => blk.items.forEach((it, ii) => {
      count++; sCount++;
      const v = state.scores[itemId(si, bi, ii)];
      if (v != null) { sGot += v; sAns++; answered++; got += v; }
    }));
    rows.push({ code: sec.code, title: sec.title || '—', marks: sec.marks, got: sGot, ans: sAns, count: sCount });
  });

  const pct = Math.round((got / p.totalMarks) * 1000) / 10;
  const gr = gradeFor(pct);

  const view = $('#resultView');
  view.innerHTML = '';
  const cardEl = el('div', 'result-card');

  cardEl.append(el('h2', 'rc-title', 'परिणाम'));
  const who = (state.studentName || 'विद्यार्थी').trim();
  cardEl.append(el('p', 'rc-for', school ? `${who} · ${p.shortLabel}` : `${who} · पाठ ${hin(p.chapter)} — ${p.title}`));
  if (school) cardEl.append(el('p', 'rc-sub', p.title));

  const sc = el('div', 'rc-score');
  sc.append(document.createTextNode(hinMarks(got)));
  sc.append(el('small', null, ' / ' + hin(p.totalMarks)));
  cardEl.append(sc);
  cardEl.append(el('div', 'rc-pct', hin(pct) + '%'));
  cardEl.append(el('div', 'rc-grade', gr.g));
  cardEl.append(el('p', 'rc-note', gr.msg));

  if (answered < count) {
    const warn = el('p', 'rc-note');
    warn.innerHTML = `⚠️ अभी <b>${hin(count - answered)}</b> प्रश्नों के अंक नहीं भरे गए हैं।`;
    cardEl.append(warn);
  }

  const tbl = el('table', 'rc-table');
  tbl.innerHTML = '<thead><tr><th>खंड</th><th>अनुभाग</th><th>जाँचे गए</th><th>प्राप्तांक</th></tr></thead>';
  const tb = el('tbody');
  rows.forEach(r => {
    const tr = el('tr');
    tr.append(el('td', null, r.code));
    tr.append(el('td', null, r.title));
    tr.append(el('td', null, `${hin(r.ans)}/${hin(r.count)}`));
    tr.append(el('td', null, `${hinMarks(r.got)} / ${hinMarks(r.marks)}`));
    tb.append(tr);
  });
  const tr = el('tr');
  tr.append(el('td', null, ''));
  tr.append(el('td', null, 'कुल'));
  tr.append(el('td', null, `${hin(answered)}/${hin(count)}`));
  tr.append(el('td', null, `${hinMarks(got)} / ${hin(p.totalMarks)}`));
  tb.append(tr);
  tbl.append(tb);
  cardEl.append(tbl);

  const acts = el('div', 'rc-actions');
  const back = el('button', 'btn btn-ghost', '← प्रश्नपत्र पर लौटें');
  back.addEventListener('click', () => goto('paper'));
  const home = el('button', 'btn btn-primary', 'पाठ सूची');
  home.addEventListener('click', () => { renderChapters(); goto('chapters'); });
  const print = el('button', 'btn btn-ghost', '🖨️ परिणाम छापें');
  print.addEventListener('click', () => window.print());
  acts.append(back, print, home);
  cardEl.append(acts);

  view.append(cardEl);
  goto('result');
}

/* ==================== BOOT ==================== */

if (store.get(LS.session, false)) showApp(); else showLogin();
