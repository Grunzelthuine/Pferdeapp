'use strict';
/* Antrainieren – Trainingsplan-Begleiter
   Alle Daten liegen nur im Browser (localStorage) dieses Geräts. */

const KEY = 'antrainieren-v1';
const PHASES = { warm: 'Aufwärmen', work: 'Arbeitsphase', cool: 'Cool-Down', rest: 'Ruhetag' };
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const $ = s => document.querySelector(s);
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* ---------- Speicher ---------- */
let S;
function freshState() {
  const exercises = {};
  for (const [id, e] of Object.entries(SEED_EXERCISES)) exercises[id] = { id, ...e };
  return {
    version: 1,
    exercises,
    weeks: clone(SEED_WEEKS),
    program: { startDate: null, weekIds: SEED_WEEKS.map(w => w.id), log: {}, shifts: [] },
    settings: { pauseSec: 60, speak: true, beep: true, announceSwitch: true, rate: 1, voice: '',
                lockscreen: false, lastBackup: '', firstUse: '', backupSnooze: '' }
  };
}
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.exercises || !S.weeks || !S.program) S = freshState();
  S.settings = Object.assign(freshState().settings, S.settings);
  if (!S.settings.firstUse) { S.settings.firstUse = todayStr(); save(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Speichern fehlgeschlagen!'); }
}

/* ---------- Datum ---------- */
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }
function addDays(s, n) { return new Date(parseISO(s) + n * DAY).toISOString().slice(0, 10); }
function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / DAY); }
function fmtDate(s) { const d = new Date(parseISO(s)); return `${WD[d.getUTCDay()]}, ${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.`; }
function fmtShort(s) { const d = new Date(parseISO(s)); return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.`; }
function fmtLong(s) { return new Date(parseISO(s)).toLocaleDateString('de-DE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }); }
const num = n => String(Math.round(n * 100) / 100).replace('.', ',');
const fmtMin = m => `${num(m)} Min.`;
const speakMin = m => m === 1 ? 'eine Minute' : `${num(m)} Minuten`;

/* ---------- Trainingsplan ---------- */
const weekById = id => S.weeks.find(w => w.id === id);
function progDays() {
  const out = [];
  S.program.weekIds.forEach((wid, wi) => {
    const week = weekById(wid);
    if (!week) return;
    week.days.forEach((day, di) => out.push({ i: out.length, wi, di, week, day }));
  });
  return out;
}
function dateOf(i) {
  let off = 0;
  for (const s of S.program.shifts) if (s.from <= i) off += s.days;
  return addDays(S.program.startDate, i + off);
}
const validItems = day => day.items.filter(it => S.exercises[it.ex]);
const isRest = day => !validItems(day).some(it => it.min > 0);
const statusOf = i => (S.program.log[i] && S.program.log[i].status) || null;
const dayMinutes = items => items.reduce((a, it) => a + (S.exercises[it.ex] ? Number(it.min) || 0 : 0), 0);
function firstMissed(days, today) {
  return days.find(d => !statusOf(d.i) && !isRest(d.day) && dateOf(d.i) < today);
}
function dayState(d, today) {
  const st = statusOf(d.i), date = dateOf(d.i);
  if (st) return st;
  if (isRest(d.day)) return 'rest';
  if (date < today) return 'missed';
  if (date === today) return 'today';
  return 'open';
}
const dayTitle = d => `${d.week.name} · Tag ${d.di + 1}`;

/* ---------- Kopfzeile, Toast ---------- */
function setHeader(title, backHref, showGear = false) {
  $('#title').textContent = title;
  const b = $('#back');
  b.hidden = !backHref;
  if (backHref) b.setAttribute('href', backHref);
  $('#gear').hidden = !showGear;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
const go = h => { location.hash = h; };

/* ---------- Bausteine ---------- */
function exDetails(e) {
  if (!e.text) return `<div class="name">${esc(e.name)}</div>`;
  return `<details><summary><span class="name">${esc(e.name)}</span><span class="more">Info</span></summary><p>${esc(e.text)}</p></details>`;
}
function itemsList(items, withText = true) {
  return `<ul class="items">${items.map(it => {
    const e = S.exercises[it.ex];
    if (!e) return '';
    const hw = it.hw > 0 ? ` · Handwechsel alle ${fmtMin(it.hw)}` : '';
    return `<li><span class="dot ${e.phase}"></span>
      <div class="grow">${withText && e.text
        ? exDetails(e)
        : `<div class="name">${esc(e.name)}</div>`}
        <div class="muted small">${PHASES[e.phase] || ''}${hw}</div></div>
      <span class="mins">${it.min > 0 ? fmtMin(it.min) : ''}</span></li>`;
  }).join('')}</ul>`;
}
const STATE_BADGE = {
  done: '<span class="badge done">Erledigt ✓</span>',
  skipped: '<span class="badge skipped">Übersprungen</span>',
  missed: '<span class="badge missed">Verpasst</span>',
  today: '<span class="badge">Heute</span>',
  rest: '<span class="badge skipped">Ruhetag</span>',
  open: ''
};

/* ---------- Startseite ---------- */
function viewSetup() {
  setHeader('Antrainieren', null, true);
  return `<div class="card">
    <h2>Willkommen 🐴</h2>
    <p>Wähle das Datum, an dem du mit <b>Woche 1, Tag 1</b> beginnen möchtest. Die App plant dann alle weiteren Trainingstage.</p>
    <label class="field"><span>Startdatum</span><input type="date" id="startdate" value="${todayStr()}"></label>
    <button class="btn primary big" data-act="setup">Plan starten</button>
    <p class="note">Übungen, Wochen und Zeiten kannst du jederzeit unter ⚙ Einstellungen anpassen.</p>
  </div>`;
}

function viewHome() {
  if (!S.program.startDate) return viewSetup();
  setHeader('Antrainieren', null, true);
  const days = progDays(), today = todayStr();
  let h = '';
  if (!days.length) {
    return `<div class="card"><h2>Kein Plan</h2><p>Dein Trainingsplan enthält keine Wochen. Füge unter <a href="#/einstellungen/plan">Einstellungen › Trainingsplan</a> Wochen hinzu.</p></div>`;
  }
  const missed = firstMissed(days, today);
  if (missed) {
    h += `<div class="card banner">
      <p class="eyebrow">Verpasst · ${fmtDate(dateOf(missed.i))}</p>
      <h2>${esc(dayTitle(missed))}</h2>
      <p class="note">Wenn du den Tag heute nachholst, verschieben sich alle folgenden Termine entsprechend.</p>
      <div class="row">
        <button class="btn primary grow" data-act="catchup" data-i="${missed.i}">Heute nachholen</button>
        <button class="btn grow" data-act="skip" data-i="${missed.i}">Überspringen</button>
      </div></div>`;
  }
  const todayDay = days.find(d => dateOf(d.i) === today);
  const nextDay = days.find(d => dateOf(d.i) > today && !statusOf(d.i) && !isRest(d.day));
  if (todayDay) {
    h += dayCard(todayDay, `Heute · ${fmtDate(today)}`);
    if (statusOf(todayDay.i) && nextDay) h += dayCard(nextDay, `Nächstes Training · ${fmtDate(dateOf(nextDay.i))}`, true);
  } else if (nextDay) {
    h += dayCard(nextDay, `Nächstes Training · ${fmtDate(dateOf(nextDay.i))}`);
  } else if (!missed) {
    h += `<div class="card center"><h2>Plan abgeschlossen 🎉</h2>
      <p class="muted">Alle Trainingstage sind durch. Für das weiterführende Training kannst du unter Einstellungen neue Wochen anlegen und den Plan neu starten.</p>
      <a class="btn" href="#/einstellungen/plan">Zum Trainingsplan</a></div>`;
  }
  if (backupDue()) h += backupCard();
  h += overview(days, today);
  return h;
}

function dayCard(d, eyebrow, compact = false) {
  const st = statusOf(d.i);
  const rest = isRest(d.day);
  const items = validItems(d.day);
  let h = `<div class="card"><p class="eyebrow">${eyebrow}</p>
    <div class="row"><h2 class="grow">${esc(dayTitle(d))}</h2>${st ? STATE_BADGE[st] : ''}</div>`;
  if (d.day.note) h += `<p class="note">${esc(d.day.note)}</p>`;
  if (rest) {
    h += `<p>🌿 Ruhetag: Koppelpause oder Spaziergang.</p>`;
    return h + '</div>';
  }
  if (!compact) h += itemsList(items) + `<p class="muted small">Gesamt ca. ${fmtMin(dayMinutes(items))} + Pausen</p>`;
  else h += `<p class="muted small">${items.length} Übungen · ca. ${fmtMin(dayMinutes(items))}</p>`;
  h += `<a class="btn ${compact ? '' : 'primary big'}" href="#/tag/${d.i}">${st === 'done' ? 'Ansehen' : compact ? 'Ansehen' : 'Zum Training ›'}</a></div>`;
  return h;
}

function overview(days, today) {
  const ref = days.find(d => dateOf(d.i) >= today) || days[days.length - 1];
  const weeks = [];
  days.forEach(d => { (weeks[d.wi] = weeks[d.wi] || []).push(d); });
  let h = `<h3 class="eyebrow" style="margin:24px 4px 8px">Gesamter Plan</h3>`;
  weeks.forEach(wd => {
    if (!wd) return;
    const training = wd.filter(d => !isRest(d.day));
    const done = training.filter(d => statusOf(d.i) === 'done').length;
    const open = wd.some(d => d.i === ref.i);
    h += `<details class="card week" ${open ? 'open' : ''}><summary>${esc(wd[0].week.name)}
      <span class="muted small" style="font-weight:400">${fmtShort(dateOf(wd[0].i))} – ${fmtShort(dateOf(wd[wd.length - 1].i))}</span>
      <span class="progress">${done}/${training.length} ✓</span></summary><div class="days">`;
    wd.forEach(d => {
      const s = dayState(d, today), date = dateOf(d.i);
      const sym = { done: '✓', skipped: '–', missed: '!', rest: '🌿', today: '●', open: '' }[s];
      const cls = [s, date === today ? 'today' : ''].join(' ');
      h += `<a class="daychip ${cls}" href="#/tag/${d.i}"><b>${WD[new Date(parseISO(date)).getUTCDay()]}</b><span>${fmtShort(date)}</span><span class="st">${sym}</span></a>`;
    });
    h += `</div></details>`;
  });
  return h;
}

/* ---------- Tagesansicht / Trainingsvorbereitung ---------- */
let prep = null;
function viewDay(i) {
  const days = progDays(), d = days[i];
  if (!d || !S.program.startDate) { go('#/'); return ''; }
  if (!prep || prep.i !== i) {
    prep = {
      i, items: validItems(d.day).map(it => ({ ...it })),
      speak: S.settings.speak, beep: S.settings.beep, announceSwitch: S.settings.announceSwitch,
      lockscreen: S.settings.lockscreen
    };
  }
  setHeader(dayTitle(d), '#/');
  const today = todayStr(), date = dateOf(i), st = dayState(d, today);
  let h = `<div class="card"><p class="eyebrow">${fmtLong(date)}</p>
    <div class="row"><h2 class="grow">${esc(dayTitle(d))}</h2>${STATE_BADGE[st] || ''}</div>
    ${d.day.note ? `<p class="note">${esc(d.day.note)}</p>` : ''}</div>`;

  if (isRest(d.day)) {
    h += `<div class="card"><p>🌿 Ruhetag: Koppelpause oder Spaziergang.</p>${dayActions(i, st)}</div>`;
    return h;
  }

  h += `<div class="card"><div class="row" style="margin-bottom:4px"><h3 class="grow" style="margin:0">Übungen</h3>
    <button class="btn small" data-act="toggle-all">Alle aufklappen</button></div>
    <p class="note" style="margin-top:0">Tippe auf eine Übung, um die Beschreibung zu lesen.</p><ul class="items">`;
  prep.items.forEach((it, k) => {
    const e = S.exercises[it.ex];
    h += `<li><span class="dot ${e.phase}"></span><div class="grow">
      ${exDetails(e)}
      <div class="muted small">${PHASES[e.phase] || ''}${it.hw > 0 ? ` · Handwechsel alle ${fmtMin(it.hw)}` : ''}</div>
      <div class="stepper" style="margin-top:6px">
        <button data-act="min-step" data-k="${k}" data-d="-1" aria-label="Eine Minute weniger">−</button>
        <input type="number" inputmode="decimal" min="0" step="0.5" value="${it.min}" data-bind="prep.items.${k}.min" data-type="num" data-rr>
        <button data-act="min-step" data-k="${k}" data-d="1" aria-label="Eine Minute mehr">+</button>
        <span class="muted small">Min.</span>
      </div></div></li>`;
  });
  h += `</ul><p class="muted small">Gesamt ca. ${fmtMin(dayMinutes(prep.items))} + ${S.settings.pauseSec} s Pause zwischen den Übungen</p>
    <p class="note">Zeitänderungen hier gelten nur für dieses Training. Dauerhaft änderst du sie unter Einstellungen › Wochen.</p></div>`;

  h += `<div class="card"><h3>Vor dem Start</h3>
    ${toggle('Übungsbeschreibung vorlesen', 'prep.speak', prep.speak)}
    ${toggle('Hinweiston bei Start und Ende', 'prep.beep', prep.beep)}
    ${toggle('Handwechsel ansagen', 'prep.announceSwitch', prep.announceSwitch)}
    ${toggle('Anzeige auf dem Sperrbildschirm (Test)', 'prep.lockscreen', prep.lockscreen, 'Zeigt Übung und Restzeit wie bei Musik an. Ansagen laufen dann meist auch bei gesperrtem Handy weiter.')}
    <div class="hint">Tipp: Lautstärke aufdrehen. Beim iPhone den Stummschalter ausschalten, sonst bleibt der Ton aus.</div>
    <button class="btn primary big" data-act="start-run">▶ Training starten</button>
    </div>`;
  h += `<div class="card">${dayActions(i, st)}</div>`;
  return h;
}
function dayActions(i, st) {
  const b = [];
  if (st === 'done' || st === 'skipped') b.push(`<button class="btn grow" data-act="undo" data-i="${i}">Markierung zurücknehmen</button>`);
  else {
    b.push(`<button class="btn grow" data-act="done" data-i="${i}">Als erledigt markieren</button>`);
    if (st === 'missed') b.push(`<button class="btn grow" data-act="catchup" data-i="${i}">Heute nachholen</button>`);
    if (st !== 'rest') b.push(`<button class="btn grow" data-act="skip" data-i="${i}">Überspringen</button>`);
  }
  return `<div class="row">${b.join('')}</div>`;
}
function toggle(label, bind, checked, sub = '') {
  return `<label class="toggle"><span>${label}${sub ? `<span class="muted small" style="display:block">${sub}</span>` : ''}</span>
    <input type="checkbox" data-bind="${bind}" data-type="bool" ${checked ? 'checked' : ''}></label>`;
}

/* ---------- Training (Ablauf) ---------- */
let R = null, runTimer = null;
const cur = () => R.items[R.idx];

function startRun() {
  const d = progDays()[prep.i];
  const items = prep.items.filter(it => it.min > 0 && S.exercises[it.ex]).map(it => {
    const e = S.exercises[it.ex];
    return { name: e.name, text: e.text || '', phase: e.phase, min: Number(it.min), hw: Number(it.hw) || 0 };
  });
  if (!items.length) return toast('Keine Übungen mit Zeit vorhanden');
  R = { i: prep.i, title: dayTitle(d), items, idx: 0, phase: 'speak', endAt: 0, dur: 0, left: 0,
        paused: false, sw: 0, token: 0, opts: { speak: prep.speak, beep: prep.beep, sw: prep.announceSwitch, lock: prep.lockscreen } };
  unlockAudio();
  if (R.opts.lock) lockStart();
  requestWake();
  location.hash = '#/training';
  clearInterval(runTimer);
  runTimer = setInterval(tick, 250);
  beginExercise();
}
function beginExercise() {
  const it = cur();
  R.phase = 'speak'; R.sw = 0; R.paused = false;
  render();
  if (R.opts.speak) {
    const token = ++R.token;
    speak(`${it.name}. ${speakMin(it.min)}. ${it.text}`, () => {
      if (R && R.token === token && R.phase === 'speak') startWork();
    });
  } else startWork();
}
function startWork() {
  const it = cur();
  R.phase = 'work'; R.dur = it.min * 60000; R.endAt = Date.now() + R.dur;
  if (R.opts.beep) beep('start');
  render();
}
function endExercise(skipped) {
  if (!skipped && R.opts.beep) beep('end');
  if (R.idx >= R.items.length - 1) return finishRun();
  R.idx++;
  const ps = Number(S.settings.pauseSec) || 0;
  if (ps > 0) {
    R.phase = 'pause'; R.dur = ps * 1000; R.endAt = Date.now() + R.dur; R.paused = false;
    render();
    if (R.opts.speak) { R.token++; speak(`${skipped ? '' : 'Übung beendet. '}Pause. Als Nächstes: ${cur().name}.`); }
  } else beginExercise();
}
function finishRun() {
  R.phase = 'done';
  S.program.log[R.i] = { status: 'done', date: todayStr() };
  save();
  clearInterval(runTimer);
  releaseWake();
  if (R.opts.speak) speak('Training beendet. Super gemacht!');
  if (R.opts.lock) { lockUpdate(0); setTimeout(lockStop, 4000); }
  render();
}
function stopRun() {
  clearInterval(runTimer);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  releaseWake();
  lockStop();
  R = null;
}
function tick() {
  if (!R || R.paused || R.phase === 'speak' || R.phase === 'done') return;
  const left = R.endAt - Date.now();
  if (R.phase === 'work') {
    const it = cur();
    if (R.opts.sw && it.hw > 0) {
      const step = it.hw * 60000;
      const points = Math.ceil(R.dur / step) - 1;
      const due = Math.min(points, Math.floor((R.dur - left) / step));
      if (due > R.sw) { R.sw = due; announceSwitch(); }
    }
    if (left <= 0) return endExercise(false);
  } else if (R.phase === 'pause' && left <= 0) return beginExercise();
  updateRun(left);
}
function announceSwitch() {
  if (R.opts.beep) beep('switch');
  if (R.opts.speak) speak('Handwechsel');
  if (navigator.vibrate) navigator.vibrate([150, 100, 150]);
  toast('↔ Handwechsel');
}
const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
function remainingTotal(left) {
  const p = (Number(S.settings.pauseSec) || 0) * 1000;
  let ms = R.phase === 'speak' ? cur().min * 60000 : Math.max(0, left);
  if (R.phase === 'pause') ms += cur().min * 60000;
  for (let k = R.idx + 1; k < R.items.length; k++) ms += p + R.items[k].min * 60000;
  return ms;
}
/* ---------- Sperrbildschirm (Test) ----------
   Eine stumme Audiospur läuft in Schleife. Dadurch zeigt das Handy die Medien-Anzeige
   auf dem Sperrbildschirm, und die App wird meist nicht schlafen gelegt. */
let lockAudio = null, lockKey = '';
function silentWavUrl() {
  const rate = 8000, n = rate * 10, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function lockStart() {
  try {
    if (!lockAudio) {
      lockAudio = new Audio(silentWavUrl());
      lockAudio.loop = true;
      lockAudio.setAttribute('playsinline', '');
    }
    lockAudio.play().catch(() => {});
    lockKey = '';
    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch (e) {} };
      set('pause', () => { if (R && !R.paused && R.phase !== 'speak' && R.phase !== 'done') actions['run-pause'](); });
      set('play', () => { if (R && R.paused) actions['run-pause'](); else lockAudio && lockAudio.play().catch(() => {}); });
      set('nexttrack', () => { if (R && R.phase !== 'done') actions['run-skip'](); });
      set('previoustrack', null); set('seekbackward', null); set('seekforward', null); set('seekto', null);
    }
  } catch (e) { /* nicht unterstützt */ }
}
function lockStop() {
  try {
    if (lockAudio) lockAudio.pause();
    if ('mediaSession' in navigator) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; }
  } catch (e) {}
}
function lockUpdate(left) {
  if (!R || !R.opts.lock || !('mediaSession' in navigator)) return;
  try {
    const ms = navigator.mediaSession, it = cur(), n = R.items.length;
    let title, artist;
    if (R.phase === 'done') { title = 'Training beendet 🎉'; artist = R.title; }
    else if (R.phase === 'pause') { title = `Pause ${fmtClock(left)} · gleich: ${it.name}`; artist = `Übung ${R.idx + 1} von ${n} · Antrainieren`; }
    else if (R.phase === 'speak') { title = `Ansage: ${it.name}`; artist = `Übung ${R.idx + 1} von ${n} · Antrainieren`; }
    else { title = `${fmtClock(left)} · ${it.name}`; artist = `Übung ${R.idx + 1} von ${n} · Antrainieren`; }
    ms.metadata = new MediaMetadata({ title, artist, album: R.title,
      artwork: [{ src: new URL('icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }] });
    ms.playbackState = R.paused ? 'paused' : 'playing';
    // Fortschrittsbalken: nur bei Phasenwechsel neu setzen, dann läuft er von selbst
    const key = `${R.idx}|${R.phase}|${R.paused}`;
    if (key !== lockKey && ms.setPositionState && R.phase !== 'speak' && R.dur > 0) {
      lockKey = key;
      ms.setPositionState({ duration: R.dur / 1000, position: Math.min(R.dur, Math.max(0, R.dur - left)) / 1000, playbackRate: 1 });
    }
  } catch (e) {}
}

function updateRun(left) {
  lockUpdate(left);
  const t = $('#rt-time'); if (!t) return;
  t.textContent = fmtClock(left);
  const bar = $('#rt-bar'); if (bar) bar.style.width = `${Math.min(100, 100 * (1 - left / R.dur))}%`;
  const tot = $('#rt-total'); if (tot) tot.textContent = `Noch ca. ${Math.ceil(remainingTotal(left) / 60000)} Min. insgesamt`;
}
function viewRun() {
  if (!R) { go('#/'); return ''; }
  setHeader(R.title, null);
  if (R.phase === 'done') {
    return `<div class="card run"><p style="font-size:56px;margin:8px 0">🎉</p><h2>Geschafft!</h2>
      <p class="muted">${esc(R.title)} ist als erledigt markiert.</p>
      <button class="btn primary big" data-act="run-close">Zur Übersicht</button></div>`;
  }
  const it = cur(), n = R.items.length;
  const isPause = R.phase === 'pause';
  const next = R.items[R.idx + 1];
  const left = R.phase === 'speak' ? it.min * 60000 : (R.paused ? R.left : R.endAt - Date.now());
  const label = R.phase === 'speak' ? 'Ansage' : isPause ? 'Pause' : (PHASES[it.phase] || '');
  let controls;
  if (R.phase === 'speak') {
    controls = `<button class="btn primary" data-act="run-now">▶ Timer jetzt starten</button>
      <button class="btn" data-act="run-skip">⏭ Überspringen</button>
      <button class="btn danger" data-act="run-abort">✕ Abbrechen</button>`;
  } else if (isPause) {
    controls = `<button class="btn primary" data-act="run-skip">▶ Nächste Übung starten</button>
      <button class="btn" data-act="run-pause">${R.paused ? '▶ Weiter' : '⏸ Anhalten'}</button>
      <button class="btn danger" data-act="run-abort">✕ Abbrechen</button>`;
  } else {
    controls = `<button class="btn primary" data-act="run-pause">${R.paused ? '▶ Weiter' : '⏸ Pause'}</button>
      <button class="btn" data-act="run-skip">⏭ Übung beenden</button>
      <button class="btn danger" data-act="run-abort">✕ Abbrechen</button>`;
  }
  return `<div class="card run ${isPause ? 'pause-phase' : ''}">
    <div class="phase">${label} · Übung ${R.idx + 1} von ${n}</div>
    <div class="exname">${isPause ? 'Gleich: ' : ''}${esc(it.name)}</div>
    <div class="time" id="rt-time">${fmtClock(left)}</div>
    <div class="bar"><div id="rt-bar" style="width:${R.phase === 'speak' ? 0 : Math.min(100, 100 * (1 - left / R.dur))}%"></div></div>
    <div class="muted small" id="rt-total"></div>
    ${R.paused ? '<p><b>Angehalten</b></p>' : ''}
    <div class="controls">${controls}</div>
    ${it.text ? `<p class="desc">${esc(it.text)}</p>` : ''}
    ${it.hw > 0 && R.opts.sw ? `<p class="muted small">Handwechsel-Ansage alle ${fmtMin(it.hw)}</p>` : ''}
    ${next && !isPause ? `<p class="next">Danach: ${esc(next.name)} (${fmtMin(next.min)})</p>` : ''}
  </div>`;
}

/* ---------- Ton, Sprache, Bildschirm ---------- */
let actx = null;
function unlockAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    g.gain.value = 0; o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + 0.02);
  } catch (e) { actx = null; }
}
function tone(freq, start, dur) {
  const o = actx.createOscillator(), g = actx.createGain();
  const t = actx.currentTime + start;
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
function beep(kind) {
  if (!actx) unlockAudio();
  if (!actx) return;
  if (actx.state === 'suspended') actx.resume();
  if (kind === 'start') tone(880, 0, 0.25);
  else if (kind === 'switch') { tone(660, 0, 0.18); tone(660, 0.28, 0.18); }
  else { tone(988, 0, 0.3); tone(988, 0.4, 0.3); tone(1319, 0.8, 0.7); }
}

let voices = [];
// Bewertet Stimmen: natürliche/neuronale Stimmen klingen deutlich besser als ältere Systemstimmen
function voiceScore(v) {
  let s = 0;
  if (/natural|neural|online/i.test(v.name)) s += 50;
  if (/premium|enhanced|erweitert|siri/i.test(v.name)) s += 40;
  if (/google/i.test(v.name)) s += 30;
  if (/^de[-_]DE/i.test(v.lang)) s += 5;
  if (v.default) s += 2;
  return s;
}
const allVoiceCount = () => ('speechSynthesis' in window ? speechSynthesis.getVoices().length : 0);
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
}
const currentVoice = () => voices.find(v => v.voiceURI === S.settings.voice) || voices[0];

// Macht Texte sprechfreundlich: Klammern, Abkürzungen und Zeichen stören den Sprachfluss
function speechText(t) {
  return String(t)
    .replace(/(\d)\s*×/g, '$1 mal')
    .replace(/×/g, ' mal ')
    .replace(/\bSek\./g, 'Sekunden')
    .replace(/\bMin\./g, 'Minuten')
    .replace(/\bkm\/h\b/g, 'Kilometer pro Stunde')
    .replace(/\bz\. ?B\./g, 'zum Beispiel')
    .replace(/\bca\./g, 'circa')
    .replace(/\s*\(\s*/g, ', ').replace(/\s*\)\s*/g, ', ')
    .replace(/\s+[–-]\s+/g, ', ')
    .replace(/:/g, '.')
    .replace(/#/g, '')
    .replace(/\s*,\s*([,.!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
function speak(text, onend) {
  if (!('speechSynthesis' in window)) { if (onend) onend(); return; }
  speechSynthesis.cancel();
  text = speechText(text);
  const v = currentVoice();
  const rate = Number(S.settings.rate) || 1;
  // Online-Stimmen (z. B. Google) brechen lange Texte gern ab, daher satzweise sprechen
  const parts = v && !v.localService ? (text.match(/[^.!?]+[.!?]*/g) || [text]) : [text];
  let fired = false;
  const fin = () => { if (fired) return; fired = true; clearTimeout(guard); if (onend) onend(); };
  // Sicherheitsnetz: manche Handys melden das Ende der Ansage nicht zuverlässig
  const guard = setTimeout(fin, text.length * 95 / rate + 4000);
  parts.forEach((p, k) => {
    const u = new SpeechSynthesisUtterance(p.trim());
    u.lang = v ? v.lang : 'de-DE';
    u.rate = rate;
    if (v) u.voice = v;
    if (k === parts.length - 1) { u.onend = fin; u.onerror = fin; }
    speechSynthesis.speak(u);
  });
}

let wakeLock = null;
async function requestWake() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* nicht unterstützt */ }
}
function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) {} wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && R && R.phase !== 'done') { requestWake(); tick(); }
});

/* ---------- Einstellungen ---------- */
function viewSettings() {
  setHeader('Einstellungen', '#/');
  const nEx = Object.keys(S.exercises).length;
  return `<div class="card"><ul class="menu">
    <li><a href="#/einstellungen/allgemein">⏱ <span>Allgemein<span class="sub">Pausenzeit, Vorlesen, Ton, Stimme</span></span></a></li>
    <li><a href="#/einstellungen/plan">📅 <span>Trainingsplan<span class="sub">Startdatum, Reihenfolge der Wochen</span></span></a></li>
    <li><a href="#/einstellungen/wochen">🗓 <span>Wochen<span class="sub">${S.weeks.length} Wochen · Tage mit Übungen belegen</span></span></a></li>
    <li><a href="#/einstellungen/uebungen">📋 <span>Übungen<span class="sub">${nEx} Übungen · Datenbank bearbeiten</span></span></a></li>
    <li><a href="#/einstellungen/daten">💾 <span>Daten sichern<span class="sub">Sicherung, Wiederherstellen, Zurücksetzen</span></span></a></li>
    <li><a href="anleitung.html">❓ <span>Anleitung<span class="sub">Installieren und Bedienung</span></span></a></li>
  </ul></div>
  <div class="center"><button class="btn small" data-act="check-update">Nach Updates suchen</button>
  <p class="muted small" id="appver"></p></div>`;
}

function viewGeneral() {
  setHeader('Allgemein', '#/einstellungen');
  const st = S.settings;
  const best = voices[0];
  const voiceOpts = `<option value="">Automatisch${best ? ` (${esc(best.name)})` : ''}</option>` +
    voices.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === st.voice ? 'selected' : ''}>${voiceScore(v) >= 30 ? '★ ' : ''}${esc(v.name)}</option>`).join('');
  return `<div class="card">
    <label class="field"><span>Pause zwischen zwei Übungen (Sekunden)</span>
      <input type="number" inputmode="numeric" min="0" step="5" value="${st.pauseSec}" data-bind="set.pauseSec" data-type="num"></label>
    <p class="note">Gilt für alle Trainings. In der Pause sagt die App die nächste Übung an. Mit „Nächste Übung starten“ geht es sofort weiter.</p>
  </div>
  <div class="card"><h3>Voreinstellung vor jedem Training</h3>
    ${toggle('Übungsbeschreibung vorlesen', 'set.speak', st.speak)}
    ${toggle('Hinweiston bei Start und Ende', 'set.beep', st.beep)}
    ${toggle('Handwechsel ansagen', 'set.announceSwitch', st.announceSwitch)}
    ${toggle('Anzeige auf dem Sperrbildschirm (Test)', 'set.lockscreen', st.lockscreen, 'Übung und Restzeit erscheinen wie bei Musik auf dem Sperrbildschirm, mit Pause und Weiter.')}
    <p class="note">Du kannst das vor jedem Training noch einmal umstellen.</p>
  </div>
  <div class="card"><h3>Stimme</h3>
    <label class="field"><span>Stimme</span><select data-bind="set.voice" data-test-voice>${voiceOpts}</select></label>
    <p class="note">Mit ★ markierte Stimmen klingen meist natürlicher. Welche Stimmen es gibt, hängt vom Gerät ab. Am PC sind sie oft roboterhaft, auf dem Handy meist deutlich besser.</p>
    <details class="small" style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600">Bessere Stimme installieren</summary>
      <p><b>iPhone:</b> Einstellungen › Bedienungshilfen › Gesprochene Inhalte › Stimmen › Deutsch. Dort eine Stimme mit „Premium“ oder „Erweitert“ laden, z. B. Anna. Danach die App ganz schließen (vom unteren Rand nach oben wischen und wegschieben), neu öffnen und die Stimme hier auswählen. Achtung: Nicht jede iOS-Version gibt Premium-Stimmen an Web-Apps weiter.</p>
      <p><b>Android:</b> Einstellungen › „Text-in-Sprache“ (meist unter Bedienungshilfen oder System › Sprache) › Bevorzugte Engine „Google-Sprachausgabe“ › Zahnrad › Sprachdaten installieren › Deutsch. Dort lässt sich auch die Stimme wählen.</p>
    </details>
    <details class="small" style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600">Stimme fehlt? Liste prüfen</summary>
      <p>Das Gerät meldet der App ${allVoiceCount()} Stimmen, davon ${voices.length} deutsche:</p>
      <ul style="padding-left:20px">${voices.map(v => `<li>${esc(v.name)} <span class="muted">(${esc(v.lang)}${v.localService ? '' : ', online'})</span></li>`).join('') || '<li>keine</li>'}</ul>
      <button class="btn small" data-act="reload-voices">Stimmenliste neu laden</button>
      <p class="muted">Fehlt eine installierte Stimme hier auch nach Neustart der App, gibt das Handy sie nicht an Web-Apps weiter. Darauf hat die App keinen Einfluss.</p>
    </details>
    <label class="field"><span>Sprechtempo</span><select data-bind="set.rate" data-type="num" data-test-voice>
      ${[0.8, 0.9, 1, 1.1, 1.2].map(r => `<option value="${r}" ${Number(st.rate) === r ? 'selected' : ''}>${r === 1 ? 'normal' : num(r) + '×'}</option>`).join('')}
    </select></label>
    <div class="row"><button class="btn grow" data-act="test-speak">🔊 Vorlesen testen</button>
    <button class="btn grow" data-act="test-beep">🔔 Ton testen</button></div>
  </div>`;
}

const phaseOrder = { warm: 0, work: 1, cool: 2, rest: 3 };
const sortedExercises = () => Object.values(S.exercises).sort((a, b) => (phaseOrder[a.phase] - phaseOrder[b.phase]) || a.name.localeCompare(b.name, 'de'));

function viewExercises() {
  setHeader('Übungen', '#/einstellungen');
  let h = `<button class="btn primary big" data-act="ex-new" style="margin-bottom:16px">＋ Neue Übung</button>`;
  for (const ph of Object.keys(PHASES)) {
    const list = sortedExercises().filter(e => e.phase === ph);
    if (!list.length) continue;
    h += `<div class="card"><h3>${PHASES[ph]}</h3><ul class="menu">${list.map(e =>
      `<li><a href="#/uebung/${encodeURIComponent(e.id)}"><span class="dot ${e.phase}" style="margin:0"></span><span>${esc(e.name)}<span class="sub">${fmtMin(e.min)}${e.hw > 0 ? ` · Handwechsel alle ${fmtMin(e.hw)}` : ''}</span></span></a></li>`).join('')}</ul></div>`;
  }
  return h;
}
function usageCount(exId) {
  let n = 0;
  S.weeks.forEach(w => w.days.forEach(d => d.items.forEach(it => { if (it.ex === exId) n++; })));
  return n;
}
function viewExercise(id) {
  const e = S.exercises[id];
  if (!e) { go('#/einstellungen/uebungen'); return ''; }
  setHeader('Übung bearbeiten', '#/einstellungen/uebungen');
  const used = usageCount(id);
  return `<div class="card">
    <label class="field"><span>Bezeichnung</span><input type="text" value="${esc(e.name)}" data-bind="ex.${id}.name"></label>
    <label class="field"><span>Bereich</span><select data-bind="ex.${id}.phase">
      ${Object.entries(PHASES).map(([k, v]) => `<option value="${k}" ${e.phase === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <div class="row">
      <label class="field grow"><span>Standardzeit (Min.)</span><input type="number" inputmode="decimal" min="0" step="0.5" value="${e.min}" data-bind="ex.${id}.min" data-type="num"></label>
      <label class="field grow"><span>Handwechsel alle (Min.)</span><input type="number" inputmode="decimal" min="0" step="0.5" value="${e.hw}" data-bind="ex.${id}.hw" data-type="num"></label>
    </div>
    <p class="note">Handwechsel 0 = keine Ansage. Die Standardzeit wird übernommen, wenn du die Übung neu in einen Tag einfügst.</p>
    <label class="field"><span>Beschreibung (wird vorgelesen)</span><textarea data-bind="ex.${id}.text">${esc(e.text)}</textarea></label>
    <button class="btn" data-act="ex-test" data-id="${esc(id)}">🔊 Vorlesen testen</button>
  </div>
  <div class="card"><p class="muted small">Wird in ${used} Trainingstag${used === 1 ? '' : 'en'} verwendet.</p>
    ${used ? `<button class="btn" data-act="ex-apply" data-id="${esc(id)}">Standardzeit in allen Tagen übernehmen</button>` : ''}
    <hr><button class="btn danger" data-act="ex-del" data-id="${esc(id)}">Übung löschen</button></div>`;
}

function viewWeeks() {
  setHeader('Wochen', '#/einstellungen');
  const inPlan = id => S.program.weekIds.filter(x => x === id).length;
  return `<div class="row" style="margin-bottom:16px"><button class="btn primary grow" data-act="week-new">＋ Neue leere Woche</button></div>
  <div class="card"><ul class="menu">${S.weeks.map(w => {
    const t = w.days.filter(d => !isRest(d)).length;
    return `<li><a href="#/woche/${encodeURIComponent(w.id)}"><span>${esc(w.name)}<span class="sub">${t} Trainingstage${inPlan(w.id) ? ' · im Plan' : ' · nicht im Plan'}</span></span></a></li>`;
  }).join('')}</ul></div>
  <p class="note">Neue Wochen musst du unter Einstellungen › Trainingsplan noch in den Plan aufnehmen.</p>`;
}

function exerciseOptions(selected, placeholder) {
  let h = placeholder ? `<option value="">${placeholder}</option>` : '';
  for (const ph of Object.keys(PHASES)) {
    const list = sortedExercises().filter(e => e.phase === ph);
    if (!list.length) continue;
    h += `<optgroup label="${PHASES[ph]}">${list.map(e => `<option value="${esc(e.id)}" ${e.id === selected ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</optgroup>`;
  }
  return h;
}
function viewWeek(id) {
  const w = weekById(id);
  if (!w) { go('#/einstellungen/wochen'); return ''; }
  setHeader(w.name, '#/einstellungen/wochen');
  let h = `<div class="card">
    <label class="field"><span>Name der Woche</span><input type="text" value="${esc(w.name)}" data-bind="week.${id}.name"></label>
    <div class="row"><button class="btn grow" data-act="week-copy" data-id="${esc(id)}">Woche kopieren</button>
    <button class="btn danger grow" data-act="week-del" data-id="${esc(id)}">Woche löschen</button></div></div>`;
  w.days.forEach((d, di) => {
    h += `<div class="card"><div class="row"><h3 class="grow" style="margin:0">Tag ${di + 1}</h3>
      <span class="muted small">${isRest(d) ? '🌿 Ruhetag' : 'ca. ' + fmtMin(dayMinutes(d.items))}</span></div>
      <label class="field" style="margin-top:8px"><span>Notiz</span><input type="text" value="${esc(d.note)}" placeholder="z. B. Ziel des Tages" data-bind="week.${id}.days.${di}.note"></label>`;
    d.items.forEach((it, k) => {
      const base = `data-w="${esc(id)}" data-d="${di}" data-k="${k}"`;
      h += `<div class="ex-row">
          <select data-change="item-ex" ${base}>${exerciseOptions(it.ex, S.exercises[it.ex] ? '' : '– Übung fehlt –')}</select>
          <div class="nums">
            <label>Min. <input type="number" inputmode="decimal" min="0" step="0.5" value="${it.min}" data-bind="week.${id}.days.${di}.items.${k}.min" data-type="num" data-rr></label>
            <label>Wechsel alle <input type="number" inputmode="decimal" min="0" step="0.5" value="${it.hw || 0}" data-bind="week.${id}.days.${di}.items.${k}.hw" data-type="num"></label>
            <span class="acts">
              <button class="icon-btn" data-act="item-move" data-dir="-1" ${base} aria-label="Nach oben">↑</button>
              <button class="icon-btn" data-act="item-move" data-dir="1" ${base} aria-label="Nach unten">↓</button>
              <button class="icon-btn danger" data-act="item-del" ${base} aria-label="Entfernen">✕</button>
            </span>
          </div></div>`;
    });
    h += `<select data-change="item-add" data-w="${esc(id)}" data-d="${di}" style="margin-top:8px">${exerciseOptions('', '＋ Übung hinzufügen …')}</select></div>`;
  });
  return h;
}

function viewPlan() {
  setHeader('Trainingsplan', '#/einstellungen');
  const p = S.program;
  const days = p.startDate ? progDays() : [];
  let idx = 0;
  const rows = p.weekIds.map((wid, wi) => {
    const w = weekById(wid);
    const first = idx; idx += w ? w.days.length : 0;
    const range = p.startDate && w ? `${fmtShort(dateOf(first))} – ${fmtShort(dateOf(idx - 1))}` : '';
    return `<div class="edit-item"><div><b>${wi + 1}. ${w ? esc(w.name) : '(gelöscht)'}</b><div class="muted small">${range}</div></div>
      <div class="acts">
        <button class="icon-btn" data-act="prog-move" data-k="${wi}" data-dir="-1" aria-label="Nach oben">↑</button>
        <button class="icon-btn" data-act="prog-move" data-k="${wi}" data-dir="1" aria-label="Nach unten">↓</button>
        <button class="icon-btn danger" data-act="prog-del" data-k="${wi}" aria-label="Entfernen">✕</button>
      </div></div>`;
  }).join('');
  const done = Object.values(p.log).filter(l => l.status === 'done').length;
  return `<div class="card">
    <label class="field"><span>Startdatum (Woche 1, Tag 1)</span><input type="date" value="${p.startDate || ''}" data-bind="prog.startDate" data-rr></label>
    ${days.length ? `<p class="muted small">Planende: ${fmtLong(dateOf(days.length - 1))} · ${done} Tage erledigt</p>` : ''}
    <p class="note">Wird ein Trainingstag verpasst und du holst ihn nach, verschieben sich alle folgenden Termine automatisch.</p>
  </div>
  <div class="card"><h3>Wochen im Plan</h3>${rows || '<p class="muted">Noch keine Wochen.</p>'}
    <select data-change="prog-add" style="margin-top:8px"><option value="">＋ Woche anhängen …</option>
      ${S.weeks.map(w => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}</select>
    <p class="note">Achtung: Wenn du die Reihenfolge änderst, nachdem du schon trainiert hast, verrutschen die Häkchen. Am besten vorher „Neu starten“.</p>
  </div>
  <div class="card"><h3>Plan neu starten</h3>
    <p class="note">Löscht alle Häkchen und Verschiebungen und beginnt ab dem gewählten Datum wieder bei Woche 1, Tag 1. Übungen und Wochen bleiben erhalten.</p>
    <label class="field"><span>Neues Startdatum</span><input type="date" id="restartdate" value="${todayStr()}"></label>
    <button class="btn danger" data-act="prog-restart">Neu starten</button>
  </div>`;
}

/* ---------- Sicherung ---------- */
const BACKUP_DAYS = 14;
function agoText(iso) {
  const n = diffDays(iso, todayStr());
  return n <= 0 ? 'heute' : n === 1 ? 'gestern' : `vor ${n} Tagen`;
}
function backupDue() {
  const st = S.settings, ref = st.lastBackup || st.firstUse;
  if (!S.program.startDate || !ref) return false;
  if (st.backupSnooze && diffDays(st.backupSnooze, todayStr()) < 3) return false;
  return diffDays(ref, todayStr()) >= BACKUP_DAYS;
}
function backupCard() {
  const lb = S.settings.lastBackup;
  return `<div class="card"><p class="eyebrow">💾 Sicherung</p>
    <p>${lb ? `Deine letzte Sicherung war ${agoText(lb)}.` : 'Du hast noch keine Sicherung erstellt.'} Deine Daten liegen nur auf diesem Handy.</p>
    <div class="row"><button class="btn primary grow" data-act="backup-now">Jetzt sichern</button>
    <button class="btn grow" data-act="backup-later">Später</button></div></div>`;
}
const canShareFiles = () => !!(navigator.share && navigator.canShare);
// Erstellt die Sicherungsdatei; Android erlaubt beim Teilen keine .json-Dateien, dann als .txt
function backupFile(forShare) {
  const name = `antrainieren-sicherung-${todayStr()}`;
  const json = JSON.stringify(S, null, 2);
  let file = new File([json], `${name}.json`, { type: 'application/json' });
  if (forShare && !navigator.canShare({ files: [file] })) file = new File([json], `${name}.txt`, { type: 'text/plain' });
  return file;
}

function viewData() {
  setHeader('Daten sichern', '#/einstellungen');
  const lb = S.settings.lastBackup;
  return `<div class="card"><h3>Sicherung</h3>
    <p class="note">Deine Daten liegen nur auf diesem Gerät. Die Sicherung enthält alles: Übungen mit Beschreibungen, Wochen, Trainingsplan, Fortschritt und Einstellungen.</p>
    <p><b>${lb ? `Letzte Sicherung: ${fmtLong(lb)} (${agoText(lb)})` : 'Noch keine Sicherung erstellt.'}</b></p>
    <div class="stack">
      ${canShareFiles() ? '<button class="btn primary big" data-act="share">📤 Sicherung teilen</button>' : ''}
      <div class="row"><button class="btn grow ${canShareFiles() ? '' : 'primary'}" data-act="export">⬇ Als Datei speichern</button>
      <label class="btn grow">⬆ Sicherung laden<input type="file" accept=".json,.txt,application/json,text/plain" data-change="import" hidden></label></div>
    </div>
    ${canShareFiles() ? '<p class="note">„Teilen“ öffnet das Teilen-Menü des Handys. So schickst du die Datei direkt per WhatsApp, Mail oder AirDrop, z. B. an dich selbst.</p>' : ''}
  </div>
  <div class="card"><h3>Handy wechseln</h3>
    <ol class="small" style="padding-left:20px;margin:0">
      <li>Auf dem alten Handy: Sicherung teilen oder speichern.</li>
      <li>Die Datei aufs neue Handy schicken.</li>
      <li>Auf dem neuen Handy die App installieren, dann hier „Sicherung laden“ und die Datei wählen.</li>
    </ol>
    <p class="note">Der Plan geht danach genau dort weiter, wo du aufgehört hast. Die Stimme musst du eventuell neu wählen.</p>
  </div>
  <div class="card"><h3>Als App installieren</h3>
    <p class="small"><b>iPhone (Safari):</b> Teilen-Symbol › „Zum Home-Bildschirm“.<br>
    <b>Android (Chrome):</b> Menü ⋮ › „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</p>
    <p class="note">Danach öffnet sich die App ohne Browserleiste und funktioniert auch ohne Internet.</p>
  </div>
  <div class="card"><h3>Zurücksetzen</h3>
    <p class="note">Setzt alles auf den Auslieferungszustand zurück: Übungen, Wochen, Plan und Häkchen.</p>
    <button class="btn danger" data-act="reset-all">Alles zurücksetzen</button></div>`;
}

/* ---------- Router ---------- */
let lastRoute = '';
function render() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [a, b] = h.split('/').filter(Boolean).map(decodeURIComponent);
  let html;
  if (!a) html = viewHome();
  else if (a === 'tag') html = viewDay(Number(b));
  else if (a === 'training') html = viewRun();
  else if (a === 'einstellungen') {
    html = ({ allgemein: viewGeneral, uebungen: viewExercises, wochen: viewWeeks, plan: viewPlan, daten: viewData }[b] || viewSettings)();
  } else if (a === 'uebung') html = viewExercise(b);
  else if (a === 'woche') html = viewWeek(b);
  else { go('#/'); return; }
  if (html === undefined) return;
  // Aufgeklappte Beschreibungen beim Neuzeichnen derselben Seite offen lassen
  const openIdx = h === lastRoute ? [...document.querySelectorAll('#app details')].map(d => d.open) : [];
  $('#app').innerHTML = html;
  document.querySelectorAll('#app details').forEach((d, k) => { if (openIdx[k]) d.open = true; });
  document.body.classList.toggle('in-training', a === 'training');
  showVersion();
  const tb = $('[data-act="toggle-all"]');
  if (tb && [...document.querySelectorAll('#app .items details')].every(d => d.open)) tb.textContent = 'Alle zuklappen';
  if (h !== lastRoute) { window.scrollTo(0, 0); lastRoute = h; }
  if (a === 'training' && R && R.phase !== 'done') updateRun(R.phase === 'speak' ? cur().min * 60000 : (R.paused ? R.left : R.endAt - Date.now()));
}
window.addEventListener('hashchange', () => {
  const h = location.hash;
  if (R && R.phase !== 'done' && !h.startsWith('#/training')) {
    if (!confirm('Training abbrechen?')) { history.pushState(null, '', '#/training'); return; }
    stopRun();
  }
  if (R && R.phase === 'done' && !h.startsWith('#/training')) R = null;
  render();
});

/* ---------- Eingaben ---------- */
function bindTarget(path) {
  const parts = path.split('.');
  const root = parts.shift();
  let obj = { set: S.settings, prep, prog: S.program }[root];
  if (root === 'ex') obj = S.exercises[parts.shift()];
  if (root === 'week') obj = weekById(parts.shift());
  const key = parts.pop();
  for (const p of parts) obj = obj && obj[p];
  return [obj, key];
}
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.bind) {
    const [obj, key] = bindTarget(el.dataset.bind);
    if (!obj) return;
    let v = el.value;
    if (el.dataset.type === 'bool') v = el.checked;
    else if (el.dataset.type === 'num') { v = parseFloat(String(v).replace(',', '.')); if (!(v >= 0)) v = 0; }
    obj[key] = v;
    if (el.dataset.bind === 'prog.startDate' && !v) obj[key] = null;
    if (!el.dataset.bind.startsWith('prep.')) save();
    if ('testVoice' in el.dataset) speak('So klinge ich. Führen in der Basisübung, zehn Minuten.');
    if ('rr' in el.dataset) render();
    return;
  }
  const ch = el.dataset.change;
  if (!ch) return;
  const d = el.dataset;
  if (ch === 'item-add' && el.value) {
    const e = S.exercises[el.value];
    weekById(d.w).days[+d.d].items.push({ ex: e.id, min: e.min, hw: e.hw });
    save(); render();
  } else if (ch === 'item-ex' && el.value) {
    const e = S.exercises[el.value];
    Object.assign(weekById(d.w).days[+d.d].items[+d.k], { ex: e.id, min: e.min, hw: e.hw });
    save(); render();
  } else if (ch === 'prog-add' && el.value) {
    S.program.weekIds.push(el.value);
    save(); render(); toast('Woche angehängt');
  } else if (ch === 'import' && el.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.exercises || !data.weeks || !data.program) throw new Error();
        if (!confirm('Sicherung laden? Alle aktuellen Daten werden ersetzt.')) return;
        S = data; S.settings = Object.assign(freshState().settings, S.settings);
        if (!S.settings.firstUse) S.settings.firstUse = todayStr();
        prep = null; save(); toast('Sicherung geladen'); go('#/');
      } catch (e) { alert('Die Datei ist keine gültige Antrainieren-Sicherung.'); }
    };
    r.readAsText(el.files[0]);
  }
});
document.addEventListener('input', ev => {
  const el = ev.target;
  if (!el.dataset.bind || el.dataset.type || el.tagName === 'SELECT') return;
  const [obj, key] = bindTarget(el.dataset.bind);
  if (obj) { obj[key] = el.value; save(); }
});

const actions = {
  setup() {
    const v = $('#startdate').value;
    if (!v) return toast('Bitte ein Datum wählen');
    Object.assign(S.program, { startDate: v, log: {}, shifts: [] });
    save(); render();
  },
  catchup(d) {
    const i = +d.i, today = todayStr();
    const shift = diffDays(dateOf(i), today);
    if (shift > 0) S.program.shifts.push({ from: i, days: shift });
    save(); prep = null; toast('Plan wurde verschoben'); go(`#/tag/${i}`); render();
  },
  skip(d) { S.program.log[d.i] = { status: 'skipped', date: todayStr() }; save(); render(); },
  done(d) { S.program.log[d.i] = { status: 'done', date: todayStr() }; save(); toast('Als erledigt markiert'); render(); },
  undo(d) { delete S.program.log[d.i]; save(); render(); },
  'min-step'(d) {
    const it = prep.items[+d.k];
    it.min = Math.max(0, (Number(it.min) || 0) + Number(d.d));
    render();
  },
  'toggle-all'() {
    const ds = [...document.querySelectorAll('#app .items details')];
    const open = !ds.every(d => d.open);
    ds.forEach(d => { d.open = open; });
    const b = document.querySelector('[data-act="toggle-all"]');
    if (b) b.textContent = open ? 'Alle zuklappen' : 'Alle aufklappen';
  },
  'do-update'() {
    if (R && R.phase !== 'done') return toast('Bitte erst das Training beenden');
    const w = swReg && swReg.waiting;
    if (w) w.postMessage('SKIP_WAITING'); else location.reload();
  },
  async 'check-update'() {
    if (!swReg) return toast('Updates sind nur in der installierten App möglich');
    if (swReg.waiting) return showUpdateBar();
    toast('Suche nach Updates …');
    try { await swReg.update(); } catch (e) { return toast('Keine Verbindung, bitte später erneut versuchen'); }
    if (swReg.installing) toast('Neue Version wird geladen …');
    else if (swReg.waiting) showUpdateBar();
    else toast('Du hast bereits die neueste Version');
  },
  'start-run': startRun,
  'run-now'() { if (R.phase === 'speak') { R.token++; if ('speechSynthesis' in window) speechSynthesis.cancel(); startWork(); } },
  'run-pause'() {
    if (R.paused) {
      R.endAt = Date.now() + R.left; R.paused = false; requestWake();
      if (R.opts.lock && lockAudio) lockAudio.play().catch(() => {});
    } else {
      R.left = R.endAt - Date.now(); R.paused = true; if ('speechSynthesis' in window) speechSynthesis.cancel();
      if (R.opts.lock && lockAudio) lockAudio.pause();
    }
    render();
  },
  'run-skip'() { if (R.phase === 'pause') beginExercise(); else { R.token++; endExercise(true); } },
  'run-abort'() {
    if (!confirm('Training abbrechen? Der Tag wird nicht als erledigt markiert.')) return;
    const i = R.i; stopRun(); go(`#/tag/${i}`);
  },
  'run-close'() { R = null; prep = null; go('#/'); },
  'test-speak'() { speak('Führen in der Basisübung. Zehn Minuten. Nach der Hälfte Handwechsel.'); },
  'reload-voices'() { loadVoices(); render(); toast(`${voices.length} deutsche Stimmen gefunden`); },
  'test-beep'() { unlockAudio(); beep('end'); },
  'ex-new'() {
    const id = newId('x');
    S.exercises[id] = { id, name: 'Neue Übung', phase: 'work', min: 10, hw: 0, text: '' };
    save(); go(`#/uebung/${id}`);
  },
  'ex-test'(d) { const e = S.exercises[d.id]; speak(`${e.name}. ${speakMin(e.min)}. ${e.text}`); },
  'ex-apply'(d) {
    const e = S.exercises[d.id];
    if (!confirm(`In allen Tagen ${fmtMin(e.min)} und Handwechsel alle ${fmtMin(e.hw)} setzen?`)) return;
    S.weeks.forEach(w => w.days.forEach(day => day.items.forEach(it => { if (it.ex === e.id) { it.min = e.min; it.hw = e.hw; } })));
    save(); prep = null; toast('Übernommen');
  },
  'ex-del'(d) {
    const n = usageCount(d.id);
    if (!confirm(n ? `Übung löschen? Sie wird auch aus ${n} Trainingstag(en) entfernt.` : 'Übung löschen?')) return;
    delete S.exercises[d.id];
    S.weeks.forEach(w => w.days.forEach(day => { day.items = day.items.filter(it => it.ex !== d.id); }));
    save(); prep = null; go('#/einstellungen/uebungen');
  },
  'week-new'() {
    const id = newId('w');
    S.weeks.push({ id, name: `Woche ${S.weeks.length + 1}`, days: Array.from({ length: 7 }, () => ({ note: '', items: [] })) });
    save(); go(`#/woche/${id}`);
  },
  'week-copy'(d) {
    const w = clone(weekById(d.id)); w.id = newId('w'); w.name += ' (Kopie)';
    S.weeks.push(w); save(); toast('Kopie angelegt'); go(`#/woche/${w.id}`);
  },
  'week-del'(d) {
    const inPlan = S.program.weekIds.includes(d.id);
    if (!confirm(inPlan ? 'Woche löschen? Sie wird auch aus dem Trainingsplan entfernt.' : 'Woche löschen?')) return;
    S.weeks = S.weeks.filter(w => w.id !== d.id);
    S.program.weekIds = S.program.weekIds.filter(x => x !== d.id);
    save(); prep = null; go('#/einstellungen/wochen');
  },
  'item-move'(d) {
    const items = weekById(d.w).days[+d.d].items, k = +d.k, j = k + Number(d.dir);
    if (j < 0 || j >= items.length) return;
    [items[k], items[j]] = [items[j], items[k]];
    save(); prep = null; render();
  },
  'item-del'(d) { weekById(d.w).days[+d.d].items.splice(+d.k, 1); save(); prep = null; render(); },
  'prog-move'(d) {
    const ids = S.program.weekIds, k = +d.k, j = k + Number(d.dir);
    if (j < 0 || j >= ids.length) return;
    [ids[k], ids[j]] = [ids[j], ids[k]];
    save(); render();
  },
  'prog-del'(d) { S.program.weekIds.splice(+d.k, 1); save(); render(); },
  'prog-restart'() {
    const v = $('#restartdate').value;
    if (!v) return toast('Bitte ein Datum wählen');
    if (!confirm('Plan neu starten? Alle Häkchen werden gelöscht.')) return;
    Object.assign(S.program, { startDate: v, log: {}, shifts: [] });
    save(); prep = null; toast('Plan neu gestartet'); go('#/');
  },
  export() {
    S.settings.lastBackup = todayStr();
    save();
    const file = backupFile(false);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Sicherung gespeichert');
    render();
  },
  share() {
    if (!canShareFiles()) return actions.export();
    const prev = S.settings.lastBackup;
    S.settings.lastBackup = todayStr();
    const file = backupFile(true);
    if (!navigator.canShare({ files: [file] })) { S.settings.lastBackup = prev; return actions.export(); }
    navigator.share({ files: [file], title: 'Antrainieren-Sicherung' })
      .then(() => { save(); toast('Sicherung geteilt'); render(); })
      .catch(e => { S.settings.lastBackup = prev; if (e.name !== 'AbortError') toast('Teilen hat nicht geklappt'); });
  },
  'backup-now'() { canShareFiles() ? actions.share() : actions.export(); },
  'backup-later'() { S.settings.backupSnooze = todayStr(); save(); render(); },
  'reset-all'() {
    if (!confirm('Wirklich ALLES zurücksetzen? Eigene Übungen, Wochen und Häkchen gehen verloren.')) return;
    S = freshState(); prep = null; save(); go('#/'); render();
  }
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el.dataset); }
});

/* ---------- Start ---------- */
load();
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = () => { loadVoices(); if (location.hash.includes('allgemein')) render(); };
  // Nach dem Installieren einer Stimme in den Handy-Einstellungen: beim Zurückkehren neu einlesen
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { loadVoices(); if (location.hash.includes('allgemein')) render(); }
  });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
/* ---------- Updates ---------- */
let swReg = null;
function showUpdateBar() {
  if ($('#updatebar')) return;
  const bar = document.createElement('div');
  bar.id = 'updatebar';
  bar.innerHTML = `<span>🔄 Neue Version verfügbar</span><button class="btn small primary" data-act="do-update">Jetzt aktualisieren</button>`;
  document.body.appendChild(bar);
  document.body.classList.add('has-update');
}
function watchWorker(w) {
  if (!w) return;
  w.addEventListener('statechange', () => {
    if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar();
  });
}
function checkForUpdate() {
  if (swReg) swReg.update().catch(() => {});
}
async function showVersion() {
  const el = $('#appver');
  if (!el || !('caches' in window)) return;
  const keys = await caches.keys();
  const vs = keys.map(k => +((k.match(/^antrainieren-v(\d+)$/) || [])[1] || 0)).filter(Boolean).sort((a, b) => b - a);
  if (!vs.length) return;
  const waiting = swReg && swReg.waiting;
  el.textContent = waiting && vs.length > 1 ? `Version ${vs[1]} · Version ${vs[0]} bereit` : `Version ${vs[0]}`;
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    swReg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar();
    watchWorker(reg.installing);
    reg.addEventListener('updatefound', () => watchWorker(reg.installing));
    checkForUpdate();
  }).catch(() => {});
  // Nach dem Aktualisieren einmal neu laden, damit die neue Version läuft
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !document.body.classList.contains('has-update')) return;
    reloading = true;
    location.reload();
  });
  // Auch beim Zurückkehren in die App (iPhone/Android öffnen sie oft nur wieder) nach Updates suchen
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}
render();
