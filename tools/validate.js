/* Checks the app's data and wiring without a browser.
 *
 *   node tools/validate.js
 *
 * Run this after editing chords, progressions or lessons. It catches the
 * mistakes that are invisible until you are holding a guitar: a shape that
 * does not spell its own chord, a lesson that drills something it never
 * taught, a progression that plays back in the wrong order.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'js');

global.window = {};
require(path.join(JS, 'chords.js'));
require(path.join(JS, 'progressions.js'));
require(path.join(JS, 'exercises.js'));
require(path.join(JS, 'lessons.js'));
require(path.join(JS, 'diagram.js'));
require(path.join(JS, 'fretboard.js'));
const CM = global.window.CM;

// trainer.js closes over `window`; evaluate it against the same namespace.
eval(fs.readFileSync(path.join(JS, 'trainer.js'), 'utf8')
  .replace('window.CM = window.CM || {}', 'global.window.CM'));

const errors = [];
const warns = [];
const err = m => errors.push(m);
const warn = m => warns.push(m);

/* ================= music theory ================= */

const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

// Fifths are optional — real voicings drop them, especially in seventh chords.
const QUALITY = {
  major: { allowed: [0, 4, 7], required: [0, 4] },
  minor: { allowed: [0, 3, 7], required: [0, 3] },
  dom7:  { allowed: [0, 4, 7, 10], required: [0, 4, 10] },
  min7:  { allowed: [0, 3, 7, 10], required: [0, 3, 10] },
  maj7:  { allowed: [0, 4, 7, 11], required: [0, 4, 11] },
  sus2:  { allowed: [0, 2, 7], required: [0, 2, 7] },
  sus4:  { allowed: [0, 5, 7], required: [0, 5, 7] },
  add9:  { allowed: [0, 2, 4, 7], required: [0, 2, 4] }
};

const SPEC = {
  A: ['A', 'major'], C: ['C', 'major'], D: ['D', 'major'], E: ['E', 'major'],
  G: ['G', 'major'], F: ['F', 'major'], B: ['B', 'major'], Fmini: ['F', 'major'],
  Am: ['A', 'minor'], Dm: ['D', 'minor'], Em: ['E', 'minor'], Bm: ['B', 'minor'],
  Cm: ['C', 'minor'], Fm: ['F', 'minor'], Gm: ['G', 'minor'],
  E7: ['E', 'dom7'], A7: ['A', 'dom7'], D7: ['D', 'dom7'], G7: ['G', 'dom7'],
  C7: ['C', 'dom7'], B7: ['B', 'dom7'],
  Am7: ['A', 'min7'], Em7: ['E', 'min7'], Dm7: ['D', 'min7'],
  Fmaj7: ['F', 'maj7'], Cadd9: ['C', 'add9'],
  Dsus4: ['D', 'sus4'], Dsus2: ['D', 'sus2'], Asus2: ['A', 'sus2'],
  Asus4: ['A', 'sus4'], Esus4: ['E', 'sus4'], 'G/B': ['G', 'major']
};

CM.chords.all.forEach(c => {
  // shape sanity
  if (c.frets.length !== 6) err(`${c.id}: frets length ${c.frets.length}`);
  if (c.fingers.length !== 6) err(`${c.id}: fingers length ${c.fingers.length}`);
  for (let i = 0; i < 6; i++) {
    const f = c.frets[i], fg = c.fingers[i];
    if (f < -1 || f > 12) err(`${c.id}: fret ${f} on string ${i}`);
    if (f <= 0 && fg !== 0) err(`${c.id}: finger ${fg} on an unfretted string`);
    if (f > 0 && (fg < 1 || fg > 4)) err(`${c.id}: fretted string ${i} has finger ${fg}`);
  }
  if (c.barre) {
    const b = c.barre;
    if (b.from < 0 || b.to > 5 || b.from >= b.to) err(`${c.id}: bad barre range`);
    for (let i = b.from; i <= b.to; i++) {
      if (c.frets[i] < b.fret) err(`${c.id}: string ${i} sits under the barre`);
    }
  }
  const at = {};
  c.frets.forEach((f, i) => {
    const fg = c.fingers[i];
    if (!fg) return;
    if (at[fg] != null && at[fg] !== f) err(`${c.id}: finger ${fg} is in two places at once`);
    at[fg] = f;
  });
  const span = c.frets.filter(f => f > 0);
  if (span.length && Math.max(...span) - Math.min(...span) > 3) {
    warn(`${c.id}: spans ${Math.max(...span) - Math.min(...span) + 1} frets`);
  }

  // does the shape actually spell the chord?
  const spec = SPEC[c.id];
  if (!spec) { err(`${c.id}: no theory spec — add one to tools/validate.js`); return; }
  const [rootName, qual] = spec;
  const q = QUALITY[qual];
  const ivals = [...new Set(CM.chords.midiNotes(c).map(n => ((n.midi - PC[rootName]) % 12 + 12) % 12))].sort((a, b) => a - b);
  const extra = ivals.filter(i => !q.allowed.includes(i));
  if (extra.length) err(`${c.id} (${rootName} ${qual}): wrong note(s) at interval ${extra.join(',')}`);
  const missing = q.required.filter(i => !ivals.includes(i));
  if (missing.length) err(`${c.id} (${rootName} ${qual}): missing interval ${missing.join(',')}`);
  if (c.id === 'G/B' && CM.chords.midiNotes(c)[0].midi % 12 !== PC.B) err('G/B: bass note is not B');
});

/* ================= diagrams ================= */

const X0 = 22, Y0 = 34, GX = 16, GY = 21;
CM.chords.all.forEach(c => {
  const svg = CM.diagram.render(c);
  if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) err(`${c.id}: malformed svg`);
  if (/NaN|undefined/.test(svg)) err(`${c.id}: svg contains NaN or undefined`);

  const dots = (svg.match(/class="dia-dot"/g) || []).length;
  const underBarre = c.barre
    ? c.frets.filter((f, i) => f === c.barre.fret && i >= c.barre.from && i <= c.barre.to).length : 0;
  const expected = c.frets.filter(f => f > 0).length - underBarre;
  if (dots !== expected) err(`${c.id}: drew ${dots} dots, expected ${expected}`);
  if (c.barre && !/class="dia-barre"/.test(svg)) err(`${c.id}: barre not drawn`);

  const marks = (svg.match(/class="dia-open"/g) || []).length + (svg.match(/class="dia-mute"/g) || []).length;
  if (marks !== c.frets.filter(f => f <= 0).length) err(`${c.id}: wrong number of open/mute marks`);

  [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="7"/g)].forEach(m => {
    const x = +m[1], y = +m[2];
    if (x < X0 - 0.1 || x > X0 + GX * 5 + 0.1 || y < Y0 || y > Y0 + GY * 5) {
      err(`${c.id}: a finger dot falls outside the fretboard`);
    }
  });
});

/* ================= progressions ================= */

CM.progressions.all.forEach(p => {
  if (!p.bars.length) err(`progression ${p.id}: no bars`);
  p.bars.forEach(b => {
    if (!CM.chords.has(b.chord)) err(`progression ${p.id}: unknown chord "${b.chord}"`);
  });

  const prov = CM.trainer.buildDrill({ type: 'progression', progression: p.id, bpm: 80 }).provider;
  const played = [];
  for (let beat = 0; beat < prov.totalBeats; beat++) {
    const info = prov.at(beat);
    if (info.boundary) played.push(info.chord);
    if (info.barIndex == null || info.barIndex >= p.bars.length) err(`${p.id}: bad bar index at beat ${beat}`);
  }
  const written = [];
  p.bars.forEach(b => { if (written[written.length - 1] !== b.chord) written.push(b.chord); });
  if (JSON.stringify(played) !== JSON.stringify(written)) {
    err(`${p.id}: plays [${played}] but is written [${written}]`);
  }
  if (prov.at(prov.totalBeats).chord !== prov.at(0).chord) err(`${p.id}: does not loop cleanly`);

  // Lyrics are indexed by bar. One short or long and every line after the gap
  // sits on the wrong chord, which is impossible to spot by reading the file.
  if (p.lyrics) {
    if (p.lyrics.length !== p.bars.length) {
      err(`${p.id}: ${p.lyrics.length} lyric lines for ${p.bars.length} bars`);
    } else if (p.lyrics.every(line => !line || line === '…')) {
      warn(`${p.id}: lyric lines are still placeholders`);
    }
  }
});

/* ================= fretboard exercises ================= */

const exIds = new Set();
CM.exercises.all.forEach(ex => {
  if (exIds.has(ex.id)) err(`duplicate exercise id "${ex.id}"`);
  exIds.add(ex.id);
  if (!ex.notes.length) err(`exercise ${ex.id}: expands to no notes`);

  ex.notes.forEach((n, i) => {
    if (n.string < 0 || n.string > 5) err(`${ex.id}: note ${i} is on string ${n.string}`);
    if (n.fret < 1 || n.fret > 15) err(`${ex.id}: note ${i} is at fret ${n.fret}`);
    if (n.finger < 1 || n.finger > 4) err(`${ex.id}: note ${i} uses finger ${n.finger}`);
    // The neck view shows five frets from the hand position; a note outside
    // that window would be played but never drawn.
    const off = n.fret - n.pos;
    if (off < 0 || off >= CM.fretboard.visibleFrets) {
      err(`${ex.id}: note ${i} sits ${off} frets from the hand position — off the drawn neck`);
    }
    if (n.midi !== CM.chords.openMidi[n.string] + n.fret) err(`${ex.id}: note ${i} has the wrong pitch`);
  });

  // The same fret twice running is a stutter, not a drill. The wrap from the
  // last note back to the first counts — these exercises loop.
  ex.notes.forEach((n, i) => {
    const p = ex.notes[(i - 1 + ex.notes.length) % ex.notes.length];
    if (ex.notes.length > 1 && p.string === n.string && p.fret === n.fret) {
      err(`${ex.id}: note ${i} repeats fret ${n.fret} on string ${6 - n.string}`);
    }
  });

  // A box is a hand-drawn shape. Proving it spells the scale it claims is the
  // only way to know a typo has not quietly put a wrong note in the middle.
  if (ex.scale) {
    const wanted = CM.exercises.scales[ex.scale];
    if (!wanted) err(`${ex.id}: unknown scale "${ex.scale}"`);
    else {
      const found = new Set();
      ex.notes.forEach((n, i) => {
        const pc = ((n.midi % 12) + 12) % 12;
        found.add(pc);
        if (!wanted.includes(pc)) {
          err(`${ex.id}: note ${i} (string ${6 - n.string} fret ${n.fret}) is not in ${ex.scale}`);
        }
      });
      wanted.forEach(pc => {
        if (!found.has(pc)) warn(`${ex.id}: never plays one of the ${ex.scale} notes`);
      });
    }
  }

  const prov = CM.trainer.buildDrill({ type: 'exercise', exercise: ex.id, bpm: 60 }).provider;
  if (prov.totalBeats !== ex.notes.length * ex.beatsPerNote) err(`${ex.id}: provider length disagrees with the note list`);
  for (let beat = 0; beat < prov.totalBeats; beat++) {
    const info = prov.at(beat);
    if (!info.note) err(`${ex.id}: no note at beat ${beat}`);
    if (info.boundary && info.note !== ex.notes[beat / ex.beatsPerNote]) {
      err(`${ex.id}: plays the wrong note at beat ${beat}`);
    }
  }
  if (prov.at(prov.totalBeats).note !== prov.at(0).note) err(`${ex.id}: does not loop cleanly`);
  if (ex.bpm < 40 || ex.bpm > 120) warn(`${ex.id}: starting tempo ${ex.bpm} bpm`);
});

/* ================= the 30 day plan ================= */

const taught = new Set();
CM.lessons.days.forEach(d => {
  d.newChords.forEach(id => {
    if (!CM.chords.has(id)) err(`day ${d.day}: unknown new chord "${id}"`);
    if (taught.has(id)) warn(`day ${d.day}: "${id}" was already taught`);
    taught.add(id);
  });

  d.drills.forEach(dr => {
    if (!dr.bpm || dr.bpm < 30 || dr.bpm > 220) err(`day ${d.day}: odd tempo ${dr.bpm}`);
    if (!dr.minutes) err(`day ${d.day}: drill has no duration`);

    if (dr.type === 'random') {
      if (!dr.chords || !dr.chords.length) err(`day ${d.day}: random drill has no chords`);
      (dr.chords || []).forEach(id => {
        if (!CM.chords.has(id)) err(`day ${d.day}: unknown chord "${id}"`);
        else if (!taught.has(id)) err(`day ${d.day}: drills "${id}" before teaching it`);
      });
    } else if (dr.type === 'progression') {
      if (!CM.progressions.has(dr.progression)) {
        err(`day ${d.day}: unknown progression "${dr.progression}"`);
        return;
      }
      CM.lessons.drillBars(dr).bars.forEach(b => {
        if (!CM.chords.has(b.chord)) err(`day ${d.day}: unknown chord "${b.chord}" after substitution`);
        else if (!taught.has(b.chord)) err(`day ${d.day}: "${dr.progression}" needs "${b.chord}" before it is taught`);
      });
      Object.keys(dr.sub || {}).forEach(k => {
        if (!CM.progressions.get(dr.progression).chords.includes(k)) {
          warn(`day ${d.day}: substitutes "${k}", which is not in ${dr.progression}`);
        }
      });
    } else err(`day ${d.day}: unknown drill type "${dr.type}"`);

    const built = CM.trainer.buildDrill(dr);
    if (!built.provider) err(`day ${d.day}: drill produced no provider`);
    if (!isFinite(built.totalBeats)) err(`day ${d.day}: drill never ends`);
  });

  if (d.minutes < 8 || d.minutes > 24) warn(`day ${d.day}: ${d.minutes} minutes total`);
});

const untaught = CM.chords.all.filter(c => !taught.has(c.id)).map(c => c.id);
if (untaught.length) warn(`never taught in the plan: ${untaught.join(', ')}`);

/* ================= random drills ================= */

const rp = CM.trainer.buildDrill({ type: 'random', chords: ['G', 'C', 'D'], barsPerChord: 2, beatsPerBar: 4, bpm: 80, minutes: 1 });
if (rp.totalBeats !== 80) err(`one minute at 80bpm should be 80 beats, got ${rp.totalBeats}`);
let prev = null;
for (let b = 0; b < 400; b++) {
  const info = rp.provider.at(b);
  if (!info.boundary) continue;
  if (info.chord === prev) err('random drill repeated a chord back to back');
  if (b % 8 !== 0) err(`random drill changed chord off the bar, at beat ${b}`);
  prev = info.chord;
}

/* ================= app wiring ================= */

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(JS, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'app.css'), 'utf8');

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
[...app.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]).forEach(id => {
  if (!htmlIds.has(id)) err(`app.js reaches for #${id}, which is not in index.html`);
});

const jsCreated = new Set([...app.matchAll(/el\('[a-z]+',\s*'([^' ]+)/g)].map(m => m[1]));
[...app.matchAll(/querySelectorAll\('([^']+)'\)/g)].map(m => m[1]).forEach(s => {
  if (s.startsWith('.')) {
    const cls = s.slice(1).split(/[\s[:]/)[0];
    if (!jsCreated.has(cls) && !new RegExp(`class="[^"]*\\b${cls}\\b`).test(html)) {
      err(`querySelectorAll('${s}') matches nothing in index.html`);
    }
  } else if (s.startsWith('[data-')) {
    const attr = s.slice(1, -1);
    if (!html.includes(attr + '=')) err(`querySelectorAll('${s}') matches nothing in index.html`);
  }
});

/* An author `display` rule beats the UA's `[hidden] { display: none }`, so any
 * element JS hides with .hidden whose class sets a display needs its own
 * [hidden] rule — otherwise it simply never disappears. */
const esc = c => c.replace(/-/g, '\\-');
new Set([...app.matchAll(/\$\('([^']+)'\)\.hidden\s*=/g)].map(m => m[1])).forEach(id => {
  const tag = html.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`));
  if (!tag) return;
  const clsAttr = tag[0].match(/class="([^"]+)"/);
  const classes = clsAttr ? clsAttr[1].split(/\s+/) : [];
  const setsDisplay = classes.some(c => new RegExp(`\\.${esc(c)}\\s*\\{[^}]*display\\s*:`).test(css));
  if (!setsDisplay) return;
  const guarded = new RegExp(`#${esc(id)}\\[hidden\\]`).test(css) ||
    classes.some(c => new RegExp(`\\.${esc(c)}\\[hidden\\]`).test(css));
  if (!guarded) {
    err(`#${id} is toggled via .hidden and its class sets display — add a [hidden] rule or it will never hide`);
  }
});

const classes = new Set();
[...app.matchAll(/el\('[a-z]+',\s*'([^']+)'/g)].forEach(m => m[1].split(/\s+/).forEach(c => classes.add(c)));
[...app.matchAll(/classList\.(?:add|toggle)\('([^']+)'/g)].forEach(m => classes.add(m[1]));
[...fs.readFileSync(path.join(JS, 'diagram.js'), 'utf8').matchAll(/class="(dia-[a-z]+)"/g)].forEach(m => classes.add(m[1]));
[...fs.readFileSync(path.join(JS, 'fretboard.js'), 'utf8').matchAll(/class="(fb-[a-z]+)"/g)].forEach(m => classes.add(m[1]));
classes.forEach(c => {
  if (c && !new RegExp(`\\.${c.replace(/-/g, '\\-')}\\b`).test(css)) warn(`class .${c} is set by JS but never styled`);
});

const shell = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
[...html.matchAll(/(?:src|href)="((?:js|css|icons)\/[^"]+|manifest\.json)"/g)].forEach(m => {
  // Strip the ?v={{version}} cache-buster the deploy stamps in — it is not
  // part of the path on disk, and the service worker lists the plain files.
  const rel = m[1].split('?')[0];
  if (!fs.existsSync(path.join(ROOT, rel))) err(`index.html links ${rel}, which does not exist`);
  if (!shell.includes(`'${rel}'`)) warn(`${rel} is not in the service worker cache list`);
});

/* The whole point of the token is that every deploy looks new. A file that
 * links assets without it will be served from a stale cache after a deploy. */
[...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)].forEach(m => {
  if (!m[1].includes('{{version}}')) warn(`index.html links ${m[1]} with no ?v={{version}} — it will go stale`);
});
if (!/CACHE\s*=\s*'[^']*\{\{version\}\}/.test(shell)) {
  warn('sw.js CACHE has no {{version}} — the service worker will keep serving the old shell');
}

/* ================= report ================= */

console.log(`${CM.chords.all.length} chords · ${CM.progressions.all.length} progressions · ${CM.exercises.all.length} exercises · ${CM.lessons.days.length} days · ${CM.lessons.days.reduce((s, d) => s + d.minutes, 0)} minutes of drills`);
if (warns.length) {
  console.log(`\n${warns.length} warning(s):`);
  warns.forEach(w => console.log('  · ' + w));
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  errors.forEach(e => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log('\nAll checks passed.');
