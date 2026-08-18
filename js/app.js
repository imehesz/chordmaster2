/* ChordMaster 2 - UI wiring
 *
 * Owns the four tabs, the practice setup, and the screen wake lock. All state
 * that matters lives in CM.store; this file is the glue between it, the
 * trainer, and the DOM.
 */
(function (CM) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  var ui = {
    mode: 'chords',
    pool: [],
    progression: 'pop-G',
    exercise: 'spider-1234',
    bpm: 80,
    barsPerChord: 1,
    activeScreen: 'practice'
  };

  /* The support link's icon. Drawn rather than an emoji so it takes the theme
     accent like every other mark in the app, and kept here as one string
     instead of four copies of the same path in the markup. */
  var COFFEE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4.5 8.5h11.5v6.5a4 4 0 0 1-4 4H8.5a4 4 0 0 1-4-4V8.5Z"/>' +
    '<path d="M16 10.5h1.4a2.6 2.6 0 0 1 0 5.2H16"/>' +
    '<path d="M8.4 2.6c-.9 1.1-.9 2.2 0 3.3M12.1 2.6c-.9 1.1-.9 2.2 0 3.3"/></svg>';

  var wakeLock = null;
  var rafId = null;
  var beatNodes = [];
  var tunerNodes = [];
  var countinDrawn = false;
  var toastTimer = null;

  /* ================= boot ================= */

  function boot() {
    var s = CM.store.settings();

    // Practice preferences persist alongside the settings.
    ui.mode = s.lastMode || 'chords';
    ui.bpm = s.lastBpm || 80;
    ui.barsPerChord = s.lastBars || 1;
    ui.progression = CM.progressions.has(s.lastProgression) ? s.lastProgression : 'pop-G';
    ui.exercise = CM.exercises.has(s.lastExercise) ? s.lastExercise : 'spider-1234';
    ui.pool = (s.lastPool && s.lastPool.length ? s.lastPool : ['Em', 'Am', 'D', 'G', 'C'])
      .filter(function (id) { return CM.chords.has(id); });

    applyTheme(s.theme);
    CM.audio.applySettings(s);
    restoreTuner(s);

    var visit = CM.store.recordVisit();

    buildPool();
    buildProgressionList();
    buildExerciseList();
    buildLessonList();
    paintCoffee();
    bindNav();
    bindSetup();
    bindSettings();
    bindTuner();
    bindTrainer();
    bindFinishCard();

    setMode(ui.mode);
    renderBpm();
    renderBars();
    renderStats();
    renderSettings();
    renderStreakChip();

    if (visit.isNewDay && visit.streak > 1) {
      toast('Day ' + visit.streak + ' in a row. Nice.');
    } else if (visit.broke) {
      toast('Streak reset — back to day 1.');
    }

    registerServiceWorker();
  }

  /* ================= theme ================= */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'day' ? 'day' : 'night');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'day' ? '#f6f3ee' : '#0e1116');
  }

  function paintCoffee() {
    Array.prototype.forEach.call(document.querySelectorAll('.coffee'), function (a) {
      a.innerHTML = COFFEE_ICON;
    });
  }

  /* ================= navigation ================= */

  function bindNav() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
      tab.addEventListener('click', function () { showScreen(tab.dataset.screen); });
    });
    $('streak-chip').addEventListener('click', function () { showScreen('stats'); });
  }

  function showScreen(name) {
    // The tuner lives on the settings screen and has no business still
    // sounding once you have walked away from it.
    if (ui.activeScreen === 'settings' && name !== 'settings') CM.tuner.stop();
    ui.activeScreen = name;
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) {
      s.classList.toggle('is-active', s.id === 'screen-' + name);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('is-active', t.dataset.screen === name);
    });
    if (name === 'stats') renderStats();
    if (name === 'lessons') buildLessonList();
    if (name === 'settings') renderSettings();
  }

  /* ================= practice setup ================= */

  function setMode(mode) {
    ui.mode = mode;
    Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (b) {
      b.classList.toggle('is-on', b.dataset.mode === mode);
    });
    $('panel-chords').hidden = mode !== 'chords';
    $('panel-progression').hidden = mode !== 'progression';
    $('panel-exercise').hidden = mode !== 'exercise';
    $('panel-lesson').hidden = mode !== 'lesson';
    if (mode === 'lesson') renderLessonPreview();
    if (mode === 'progression') syncProgressionTempo();
    if (mode === 'exercise') syncExerciseTempo();
    CM.store.setSetting('lastMode', mode);
    syncLessonMark();
    renderSessionTitle();
  }

  function renderSessionTitle() {
    var t = $('session-title');
    if (ui.mode === 'chords') t.textContent = 'Free practice';
    else if (ui.mode === 'progression') t.textContent = CM.progressions.get(ui.progression).name;
    else if (ui.mode === 'exercise') t.textContent = CM.exercises.get(ui.exercise).name;
    else {
      var day = CM.store.lesson().currentDay;
      t.textContent = 'Day ' + day + ' — ' + CM.lessons.get(day).title;
    }
  }

  function buildPool() {
    var grid = $('pool-grid');
    grid.innerHTML = '';
    CM.chords.all.forEach(function (c) {
      var b = el('button', 'pool-btn', c.name);
      b.type = 'button';
      b.dataset.id = c.id;
      b.addEventListener('click', function () {
        var i = ui.pool.indexOf(c.id);
        if (i === -1) ui.pool.push(c.id); else ui.pool.splice(i, 1);
        syncPool();
      });
      grid.appendChild(b);
    });

    Array.prototype.forEach.call($('pool-filters').querySelectorAll('.chip'), function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.dataset.filter;
        if (f === 'none') ui.pool = [];
        else if (f === 'known') ui.pool = CM.lessons.get(CM.store.lesson().currentDay).knownChords.slice();
        else if (f === 'open') ui.pool = pick(function (c) { return c.shape === 'open'; });
        else if (f === 'barre') ui.pool = pick(function (c) { return c.shape === 'barre'; });
        else ui.pool = pick(function (c) { return c.type === f; });
        syncPool();
      });
    });
    syncPool();
  }

  function pick(fn) {
    return CM.chords.all.filter(fn).map(function (c) { return c.id; });
  }

  function syncPool() {
    Array.prototype.forEach.call($('pool-grid').children, function (b) {
      b.classList.toggle('is-on', ui.pool.indexOf(b.dataset.id) !== -1);
    });
    $('pool-count').textContent = ui.pool.length + ' selected';
    CM.store.setSetting('lastPool', ui.pool);
  }

  function buildProgressionList() {
    var list = $('prog-list');
    list.innerHTML = '';
    var groups = [
      ['starter', 'Two-chord starters'],
      ['core', 'Progressions'],
      ['song', 'Songs']
    ];
    groups.forEach(function (g) {
      list.appendChild(el('div', 'prog-group', g[1]));
      CM.progressions.byCategory(g[0]).forEach(function (p) {
        var card = el('button', 'prog-card');
        card.type = 'button';
        card.dataset.id = p.id;
        card.appendChild(el('h4', null, p.name));
        card.appendChild(el('p', null, p.subtitle));
        var row = el('div', 'prog-chords');
        p.chords.forEach(function (id) {
          row.appendChild(el('span', 'badge', CM.chords.has(id) ? CM.chords.get(id).name : id));
        });
        card.appendChild(row);
        card.addEventListener('click', function () {
          ui.progression = p.id;
          CM.store.setSetting('lastProgression', p.id);
          syncProgressionList();
          syncProgressionTempo();
          renderSessionTitle();
        });
        list.appendChild(card);
      });
    });
    syncProgressionList();
  }

  function syncProgressionList() {
    Array.prototype.forEach.call($('prog-list').querySelectorAll('.prog-card'), function (c) {
      c.classList.toggle('is-on', c.dataset.id === ui.progression);
    });
  }

  /* Songs in 3 or 6 need a faster click to feel right; nudge the tempo when
     the meter changes so the first play-through is not bizarre. */
  function syncProgressionTempo() {
    var p = CM.progressions.get(ui.progression);
    if (p.beatsPerBar >= 6 && ui.bpm < 100) setBpm(120);
    else if (p.beatsPerBar === 3 && ui.bpm < 80) setBpm(90);
  }

  /* ================= fretboard exercises ================= */

  /* The one-line summary that tells you what your hand will be doing. */
  function exerciseBadge(ex) {
    if (ex.fingers) return 'Fingers ' + ex.fingers.join('-');
    if (ex.pairs) {
      return (ex.pairs.length === 1 ? 'Pair ' : 'Pairs ') + ex.pairs.map(function (p) {
        return p.join('-');
      }).join(', ');
    }
    return null;
  }

  function buildExerciseList() {
    var list = $('ex-list');
    list.innerHTML = '';
    [['finger', 'Finger drills'], ['pentatonic', 'Pentatonic boxes']].forEach(function (g) {
      var group = CM.exercises.byCategory(g[0]);
      if (!group.length) return;
      list.appendChild(el('div', 'prog-group', g[1]));
      group.forEach(function (ex) {
        var card = el('button', 'prog-card');
        card.type = 'button';
        card.dataset.id = ex.id;
        card.appendChild(el('h4', null, ex.name));
        card.appendChild(el('p', null, ex.subtitle));

        var row = el('div', 'prog-chords');
        var badge = exerciseBadge(ex);
        if (badge) row.appendChild(el('span', 'badge', badge));
        row.appendChild(el('span', 'badge', 'Frets ' + ex.frets.min + '–' + ex.frets.max));
        row.appendChild(el('span', 'badge', ex.notes.length + ' notes'));
        card.appendChild(row);

        card.addEventListener('click', function () {
          ui.exercise = ex.id;
          CM.store.setSetting('lastExercise', ex.id);
          syncExerciseList();
          syncExerciseTempo();
          renderSessionTitle();
        });
        list.appendChild(card);
      });
    });
    syncExerciseList();
  }

  function syncExerciseList() {
    Array.prototype.forEach.call($('ex-list').querySelectorAll('.prog-card'), function (c) {
      c.classList.toggle('is-on', c.dataset.id === ui.exercise);
    });
  }

  /* These are slow-practice drills — a tempo carried over from strumming will
     be far too fast to place four fingers cleanly. Come down, never up. */
  function syncExerciseTempo() {
    var ex = CM.exercises.get(ui.exercise);
    if (ui.bpm > ex.bpm) setBpm(ex.bpm);
  }

  function renderLessonPreview() {
    var day = CM.store.lesson().currentDay;
    var lesson = CM.lessons.get(day);
    var box = $('lesson-preview');
    box.innerHTML = '';
    var done = CM.store.isLessonComplete(lesson.day);
    box.appendChild(el('div', 'day-num', 'Day ' + lesson.day + ' of 30 · ' + lesson.minutes + ' min' +
      (done ? ' · already done' : '')));
    box.appendChild(el('h3', null, lesson.title));
    box.appendChild(el('p', null, lesson.brief));
    if (lesson.newChords.length) {
      var nc = el('div', 'new-chords');
      nc.style.marginTop = '10px';
      lesson.newChords.forEach(function (id) {
        nc.appendChild(el('span', 'badge', 'New: ' + CM.chords.get(id).name));
      });
      box.appendChild(nc);
    }
    lesson.drills.forEach(function (d) {
      var line = el('div', 'drill-line');
      line.appendChild(el('span', null, d.label));
      line.appendChild(el('span', null, d.bpm + ' bpm · ' + d.minutes + ' min'));
      box.appendChild(line);
    });
    syncLessonMark();
  }

  // The same manual, reversible tick as on the plan card, kept under the
  // transport so finishing a day does not mean walking back to the list.
  function syncLessonMark() {
    var mark = $('go-mark');
    if (!mark) return;
    mark.hidden = ui.mode !== 'lesson';
    if (mark.hidden) return;
    var done = CM.store.isLessonComplete(CM.store.lesson().currentDay);
    mark.classList.toggle('is-done', done);
    mark.innerHTML = done ? '&#10003; Done — tap to undo' : 'Mark as done';
  }

  function bindSetup() {
    Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (b) {
      b.addEventListener('click', function () { setMode(b.dataset.mode); });
    });

    $('go-mark').addEventListener('click', function () {
      CM.store.toggleLesson(CM.store.lesson().currentDay);
      renderLessonPreview();   // redraws the "already done" line, and re-syncs the button
      updatePlanProgress();
      renderStats();
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-bpm]'), function (b) {
      b.addEventListener('click', function () { setBpm(ui.bpm + Number(b.dataset.bpm)); });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-bars]'), function (b) {
      b.addEventListener('click', function () {
        ui.barsPerChord = Math.max(1, Math.min(8, ui.barsPerChord + Number(b.dataset.bars)));
        CM.store.setSetting('lastBars', ui.barsPerChord);
        renderBars();
      });
    });

    $('go').addEventListener('click', toggleRun);
  }

  function setBpm(v) {
    ui.bpm = Math.max(40, Math.min(200, v));
    CM.store.setSetting('lastBpm', ui.bpm);
    renderBpm();
    if (CM.trainer.isRunning()) CM.trainer.setBpm(ui.bpm);
  }

  function renderBpm() { $('bpm-value').textContent = ui.bpm; }
  function renderBars() {
    $('bars-per-chord').textContent = ui.barsPerChord + (ui.barsPerChord === 1 ? ' bar' : ' bars');
  }

  /* ================= running ================= */

  function toggleRun() {
    if (CM.trainer.isRunning()) {
      CM.trainer.stop();
      return;
    }
    var session;
    if (ui.mode === 'chords') {
      if (!ui.pool.length) { toast('Pick at least one chord first.'); return; }
      session = {
        kind: 'free',
        label: 'Free practice',
        drills: [{
          type: 'random',
          label: ui.pool.length === 1 ? CM.chords.get(ui.pool[0]).longName : 'Random chords',
          chords: ui.pool,
          barsPerChord: ui.barsPerChord,
          beatsPerBar: 4,
          bpm: ui.bpm
        }]
      };
    } else if (ui.mode === 'progression') {
      var p = CM.progressions.get(ui.progression);
      session = {
        kind: 'progression',
        label: p.name,
        drills: [{ type: 'progression', label: p.name, progression: p.id, bpm: ui.bpm }]
      };
    } else if (ui.mode === 'exercise') {
      var ex = CM.exercises.get(ui.exercise);
      session = {
        kind: 'exercise',
        label: ex.name,
        drills: [{ type: 'exercise', label: ex.name, exercise: ex.id, bpm: ui.bpm }]
      };
    } else {
      session = CM.trainer.sessionForDay(CM.store.lesson().currentDay);
    }

    if (!CM.audio.isSupported()) toast('No audio on this browser — visual only.');
    CM.tuner.stop();
    CM.trainer.start(session);
  }

  /* Drawing the stage. Both of these are used twice: once for the count-in
     preview, and once for real when the beat lands. `flash` is what separates
     the two — the name only pops when the chord actually arrives. */

  function drawChord(chord, next, flash) {
    var name = $('chord-name');
    name.textContent = chord.name;
    name.classList.remove('is-flash');
    if (flash) {
      void name.offsetWidth;
      name.classList.add('is-flash');
    }
    $('chord-diagram').innerHTML = CM.diagram.render(chord, {
      showFingers: CM.store.settings().showFingers
    });
    $('chord-tip').textContent = chord.tip || '';
    if (next) {
      $('next-name').textContent = next.name;
      $('next-diagram').innerHTML = CM.diagram.render(next, { showFingers: false });
    }
  }

  function drawNote(note, next) {
    $('fretboard').innerHTML = CM.fretboard.render(note, { next: next, start: note.pos });
    $('ex-caption').textContent = CM.exercises.describe(note);
    $('ex-next').textContent = next ? 'Next  ·  ' + CM.exercises.describe(next) : '';
  }

  function bindTrainer() {
    CM.trainer.on('start', function (d) {
      hideFinishCard();
      document.body.classList.add('is-playing-mode');
      $('go').textContent = 'Stop';
      $('go').classList.add('is-playing');
      $('setup').hidden = true;
      // Exercises draw a neck and carry their own "next" line, so the chord
      // card and the next-chord strip stand down for the duration.
      var isExercise = d.session.kind === 'exercise';
      $('chord-card').hidden = isExercise;
      $('ex-card').hidden = !isExercise;
      $('next-strip').hidden = isExercise;
      $('beat-row').hidden = false;
      $('step-bar').hidden = false;
      showScreen('practice');
      requestWake();
      startRaf();
    });

    CM.trainer.on('drill', function (d) {
      // Every drill gets its own count-in, and its own first shape to show.
      countinDrawn = false;
      $('drill-label').textContent = d.drill.label + ' · ' + d.drill.bpm + ' bpm' +
        (d.total > 1 ? '  (' + (d.index + 1) + '/' + d.total + ')' : '');
      ui.bpm = d.drill.bpm;
      renderBpm();
    });

    CM.trainer.on('countin', function (c) {
      $('countin').hidden = false;
      $('countin-n').textContent = c.remaining;
      // Draw the first shape once, on the first click, and leave it up for the
      // whole count. Redrawing it every beat would re-run the flash animation
      // and make it look like the drill had already started.
      if (countinDrawn) return;
      countinDrawn = true;
      if (c.note) drawNote(c.note, c.nextNote);
      else if (c.chord) drawChord(c.chord, c.next, false);
      if (c.info) buildBeatDots(c.info.beatsPerBar);
    });

    CM.trainer.on('chord', function (c) {
      $('countin').hidden = true;
      drawChord(c.chord, c.next, true);

      var info = c.info;
      renderLyric(c.drill, info);
      if (info.totalBars != null) {
        $('bar-counter').hidden = false;
        $('bar-counter').textContent = 'Bar ' + (info.barIndex + 1) + ' of ' + info.totalBars;
      } else {
        $('bar-counter').hidden = true;
      }
      buildBeatDots(info.beatsPerBar);
    });

    CM.trainer.on('note', function (n) {
      $('countin').hidden = true;
      drawNote(n.note, n.next);
      $('bar-counter').hidden = true;
      buildBeatDots(n.info.beatsPerBar);
    });

    CM.trainer.on('beat', function (b) {
      buildBeatDots(b.beatsPerBar);
      beatNodes.forEach(function (n, i) { n.classList.toggle('is-on', i === b.beatInBar); });
      // The words move with the bar, which is not always a chord change.
      renderLyric(CM.trainer.currentDrill(), b.info);
      if (b.info.totalBars != null) {
        $('bar-counter').textContent = 'Bar ' + (b.info.barIndex + 1) + ' of ' + b.info.totalBars;
      }
    });

    CM.trainer.on('drillcomplete', function () {
      $('drill-label').textContent = 'Nice — next drill coming up';
    });

    CM.trainer.on('complete', function (r) {
      CM.store.recordPractice(r.minutes);
      resetStage();
      // Playing the drills through does not tick the day off — that is the
      // user's call, so they can run a day as many times as they want.
      if (r.kind === 'lesson') showFinishCard(r.day, r.minutes);
      else toast('Session done — ' + Math.round(r.minutes) + ' minutes.');
      renderStats();
      renderStreakChip();
    });

    CM.trainer.on('stop', function (r) {
      CM.store.recordPractice(r.minutes);
      resetStage();
      if (r.minutes >= 0.5) toast(Math.round(r.minutes) + ' min logged.');
      renderStats();
      renderStreakChip();
    });
  }

  /* ================= finishing a lesson ================= */

  var finishDay = null;

  function showFinishCard(day, minutes) {
    finishDay = day;
    var done = CM.store.isLessonComplete(day);
    $('finish-title').textContent = 'Day ' + day + ' finished';
    $('finish-sub').textContent = Math.round(minutes) + ' minutes played' +
      (done ? ' · already ticked off' : '');
    $('finish-done').textContent = done ? 'Move on to day ' + Math.min(CM.lessons.total, day + 1)
      : 'Mark day ' + day + ' done';
    $('finish-card').hidden = false;
    $('chord-card').hidden = true;
    $('step-bar').hidden = true;
    $('setup').hidden = true;
    $('drill-label').textContent = '';
    showScreen('practice');
  }

  function hideFinishCard() {
    finishDay = null;
    $('finish-card').hidden = true;
    $('chord-card').hidden = false;
    $('step-bar').hidden = true;
    $('setup').hidden = false;
    $('drill-label').textContent = 'Pick something to work on';
  }

  function bindFinishCard() {
    $('finish-done').addEventListener('click', function () {
      var day = finishDay;
      if (day == null) return;
      CM.store.completeLesson(day, true);
      hideFinishCard();
      var next = CM.store.lesson().currentDay;
      toast(day >= CM.lessons.total
        ? 'That is the whole plan. Well done.'
        : 'Day ' + day + ' ticked off — day ' + next + ' is up next.');
      renderLessonPreview();
      renderSessionTitle();
      buildLessonList();
      renderStats();
    });

    $('finish-again').addEventListener('click', function () {
      var day = finishDay;
      if (day == null) return;
      hideFinishCard();
      CM.trainer.start(CM.trainer.sessionForDay(day));
    });

    $('finish-later').addEventListener('click', function () {
      hideFinishCard();
      toast('Left open — run it again whenever you like.');
    });
  }

  /* ================= lyrics ================= */

  var lyricBar = -1;

  /* The next bar that actually has words, so an instrumental bar still shows
     you what is coming rather than going blank. */
  function upcomingLyric(lines, from) {
    for (var i = 1; i <= lines.length; i++) {
      var line = lines[(from + i) % lines.length];
      if (line) return line;
    }
    return '';
  }

  function renderLyric(drill, info) {
    var prog = drill && drill.progression;
    var box = $('lyric-line');
    if (!prog || !prog.hasLyrics || !info || info.barIndex == null) {
      clearLyric();
      return;
    }
    if (info.barIndex === lyricBar) return; // same bar, nothing to redraw
    lyricBar = info.barIndex;
    box.hidden = false;
    $('lyric-now').textContent = prog.lyrics[info.barIndex] || '';
    $('lyric-next').textContent = upcomingLyric(prog.lyrics, info.barIndex);
  }

  function clearLyric() {
    lyricBar = -1;
    $('lyric-line').hidden = true;
    $('lyric-now').textContent = '';
    $('lyric-next').textContent = '';
  }

  var IDLE_TIP = 'Choose a mode below and hit start.';

  /* Back to the empty state. Without this the last chord stays on screen after
     you stop, and once the setup panel reappears there is no room for it. */
  function clearChordDisplay() {
    var name = $('chord-name');
    name.textContent = '–';
    name.classList.remove('is-flash');
    $('chord-diagram').innerHTML = '';
    $('chord-tip').textContent = IDLE_TIP;
    $('next-name').textContent = '';
    $('next-diagram').innerHTML = '';
    beatNodes = [];
    $('beat-row').innerHTML = '';
    clearLyric();
    $('fretboard').innerHTML = '';
    $('ex-caption').textContent = '';
    $('ex-next').textContent = '';
  }

  function resetStage() {
    document.body.classList.remove('is-playing-mode');
    $('go').textContent = 'Start';
    $('go').classList.remove('is-playing');
    $('setup').hidden = false;
    $('ex-card').hidden = true;
    $('chord-card').hidden = false;
    $('next-strip').hidden = true;
    $('beat-row').hidden = true;
    $('bar-counter').hidden = true;
    $('countin').hidden = true;
    $('step-bar').hidden = true;
    $('step-fill').style.width = '0%';
    $('drill-label').textContent = 'Pick something to work on';
    clearChordDisplay();
    releaseWake();
    stopRaf();
  }

  function buildBeatDots(n) {
    if (beatNodes.length === n) return;
    var row = $('beat-row');
    row.innerHTML = '';
    beatNodes = [];
    for (var i = 0; i < n; i++) {
      var d = el('div', 'beat' + (i === 0 ? ' is-accent' : ''));
      row.appendChild(d);
      beatNodes.push(d);
    }
  }

  function startRaf() {
    stopRaf();
    var fill = $('step-fill');
    (function loop() {
      fill.style.width = (CM.trainer.stepProgress() * 100).toFixed(1) + '%';
      rafId = requestAnimationFrame(loop);
    })();
  }

  function stopRaf() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  /* ================= wake lock ================= */

  function requestWake() {
    if (!CM.store.settings().keepAwake) return;
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      lock.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () { /* denied, or the tab was backgrounded */ });
  }

  function releaseWake() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }

  // Coming back from a locked screen or another app drops the lock; take it again.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && CM.trainer.isRunning()) requestWake();
  });

  /* ================= lessons tab ================= */

  function buildLessonList() {
    var list = $('lesson-list');
    if (!list) return;
    list.innerHTML = '';
    var lesson = CM.store.lesson();
    var week = 0;

    CM.lessons.days.forEach(function (day) {
      if (day.week !== week) {
        week = day.week;
        var labels = ['', 'Week 1 · the open chords', 'Week 2 · changes become progressions',
          'Week 3 · sevenths, blues and the barre', 'Week 4 · barres in context', 'The finish'];
        list.appendChild(el('div', 'week-head', labels[week] || 'Week ' + week));
      }

      var done = CM.store.isLessonComplete(day.day);
      var isCurrent = day.day === lesson.currentDay;
      var card = el('div', 'day-card' + (done ? ' is-done' : '') + (isCurrent ? ' is-current' : ''));

      var badge = el('div', 'day-badge', done ? '&#10003;' : String(day.day));
      card.appendChild(badge);

      var body = el('div', 'day-body');
      body.appendChild(el('h4', null, day.title));
      body.appendChild(el('p', null, day.focus));
      body.appendChild(el('div', 'day-meta', day.minutes + ' min · ' + day.drills.length + ' drills' +
        (day.newChords.length ? ' · ' + day.newChords.length + ' new' : '')));

      var detail = el('div', 'day-detail');
      detail.hidden = true;
      detail.appendChild(el('p', null, day.brief));
      if (day.newChords.length) {
        var nc = el('div', 'new-chords');
        day.newChords.forEach(function (id) {
          nc.appendChild(el('span', 'badge', CM.chords.get(id).name));
        });
        detail.appendChild(nc);
      }
      day.drills.forEach(function (d) {
        var line = el('div', 'drill-line');
        line.appendChild(el('span', null, d.label));
        line.appendChild(el('span', null, d.bpm + ' bpm · ' + d.minutes + 'm'));
        detail.appendChild(line);
      });
      var start = el('button', 'day-start', 'Start day ' + day.day);
      start.type = 'button';
      start.addEventListener('click', function (e) {
        e.stopPropagation();
        CM.store.setLessonDay(day.day);
        setMode('lesson');
        renderLessonPreview();
        renderSessionTitle();
        showScreen('practice');
        CM.trainer.start(CM.trainer.sessionForDay(day.day));
      });
      detail.appendChild(start);

      // Ticking a day off is manual and reversible — nothing here is decided
      // by having played the drills.
      var mark = el('button', 'day-mark' + (done ? ' is-done' : ''),
        done ? '&#10003; Done — tap to undo' : 'Mark as done');
      mark.type = 'button';
      mark.addEventListener('click', function (e) {
        e.stopPropagation();
        var nowDone = CM.store.toggleLesson(day.day);
        // Update in place so the card you are reading does not collapse.
        card.classList.toggle('is-done', nowDone);
        badge.innerHTML = nowDone ? '&#10003;' : String(day.day);
        mark.classList.toggle('is-done', nowDone);
        mark.innerHTML = nowDone ? '&#10003; Done — tap to undo' : 'Mark as done';
        updatePlanProgress();
        renderStats();
      });
      detail.appendChild(mark);

      body.appendChild(detail);
      card.appendChild(body);
      card.addEventListener('click', function () { detail.hidden = !detail.hidden; });
      list.appendChild(card);
    });

    updatePlanProgress();
  }

  function updatePlanProgress() {
    var done = CM.store.lesson().completed.length;
    $('plan-bar-fill').style.width = Math.round(done / CM.lessons.total * 100) + '%';
    $('lesson-progress-meta').textContent = done + ' / ' + CM.lessons.total + ' done';
  }

  /* ================= stats tab ================= */

  function renderStreakChip() {
    $('streak-chip-n').textContent = CM.store.streak().current;
  }

  function renderStats() {
    var st = CM.store.streak();
    var t = CM.store.totals();

    $('stat-streak').textContent = st.current;
    $('stat-streak-word').textContent = st.current === 1 ? 'day in a row' : 'days in a row';
    $('stat-streak-note').textContent = st.current === 0
      ? 'Open the app tomorrow to start one.'
      : (st.current >= st.longest && st.longest > 1
        ? 'This is your best run yet.'
        : 'Best so far: ' + st.longest + ' days.');

    $('stat-longest').textContent = st.longest;
    $('stat-minutes').textContent = Math.round(t.minutes);
    $('stat-days').textContent = t.practicedDays;
    $('stat-lessons').textContent = t.lessonsDone;

    var cal = $('calendar');
    cal.innerHTML = '';
    CM.store.calendar(35).forEach(function (d) {
      var cell = el('div', 'cal-cell' +
        (d.practiced ? ' is-practiced' : (d.visited ? ' is-visited' : '')) +
        (d.isToday ? ' is-today' : ''));
      cell.title = d.date + (d.minutes ? ' — ' + Math.round(d.minutes) + ' min' : '');
      cal.appendChild(cell);
    });

    var known = CM.lessons.get(CM.store.lesson().currentDay).knownChords;
    var grid = $('known-grid');
    grid.innerHTML = '';
    CM.chords.all.forEach(function (c) {
      var b = el('span', 'badge' + (known.indexOf(c.id) !== -1 ? ' is-known' : ''), c.name);
      grid.appendChild(b);
    });
  }

  /* ================= settings tab ================= */

  function bindSettings() {
    var map = {
      'set-metronome': 'metronome',
      'set-chord': 'chord',
      'set-countin': 'countIn',
      'set-fingers': 'showFingers',
      'set-wake': 'keepAwake'
    };
    Object.keys(map).forEach(function (id) {
      $(id).addEventListener('change', function () {
        var key = map[id];
        CM.store.setSetting(key, $(id).checked);
        CM.audio.applySettings(CM.store.settings());
        if (key === 'keepAwake') {
          if (!$(id).checked) releaseWake();
          else if (CM.trainer.isRunning()) requestWake();
        }
      });
    });

    $('set-theme').addEventListener('change', function () {
      var theme = $('set-theme').checked ? 'night' : 'day';
      CM.store.setSetting('theme', theme);
      applyTheme(theme);
    });

    // Dragging applies the volume live and dings so you can hear the level,
    // but only writes to storage once you let go.
    var lastDing = 0;
    function volumeFeedback() {
      var now = Date.now();
      if (now - lastDing < 150) return;
      lastDing = now;
      CM.audio.unlock().then(function () { CM.audio.ding(); });
    }
    function volumeValue() {
      return Number($('set-volume').value) / 100;
    }
    $('set-volume').addEventListener('input', function () {
      CM.audio.applySettings({ volume: volumeValue() });
      volumeFeedback();
    });
    $('set-volume').addEventListener('change', function () {
      var v = volumeValue();
      CM.store.setSetting('volume', v);
      CM.audio.applySettings({ volume: v });
      volumeFeedback();
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-day]'), function (b) {
      b.addEventListener('click', function () {
        var next = CM.store.lesson().currentDay + Number(b.dataset.day);
        CM.store.setLessonDay(next);
        renderSettings();
        renderLessonPreview();
        renderSessionTitle();
        buildLessonList();
      });
    });

    $('set-reset').addEventListener('click', function () {
      if (!confirm('Erase your streak, stats and lesson progress on this device?')) return;
      CM.store.reset();
      applyTheme(CM.store.settings().theme);
      CM.audio.applySettings(CM.store.settings());
      CM.tuner.stop();
      restoreTuner(CM.store.settings());
      buildTunerStrings();
      CM.store.recordVisit();
      renderSettings();
      renderStats();
      renderStreakChip();
      buildLessonList();
      renderLessonPreview();
      toast('Progress erased.');
    });
  }

  function renderSettings() {
    var s = CM.store.settings();
    $('set-metronome').checked = !!s.metronome;
    $('set-chord').checked = !!s.chord;
    $('set-countin').checked = !!s.countIn;
    $('set-fingers').checked = !!s.showFingers;
    $('set-wake').checked = !!s.keepAwake;
    $('set-theme').checked = s.theme !== 'day';
    $('set-volume').value = Math.round((s.volume != null ? s.volume : 0.8) * 100);
    $('set-day').textContent = CM.store.lesson().currentDay;
    renderTuner();

    var hint = $('wake-hint');
    if (!('wakeLock' in navigator)) {
      hint.hidden = false;
      hint.textContent = 'This browser cannot hold the screen awake. Add the app to your home screen, or raise your phone\'s screen timeout.';
    } else {
      hint.hidden = true;
    }
  }

  /* ================= tuner ================= */

  function restoreTuner(s) {
    CM.tuner.setTuning(s.tuning || 'standard');
    CM.tuner.setBpm(s.tunerBpm || 40);
    if (s.tunerStrings) CM.tuner.setStrings(s.tunerStrings);
  }

  function bindTuner() {
    var row = $('tuner-tunings');
    CM.tuner.tunings.forEach(function (t) {
      var b = el('button', 'chip', t.name);
      b.type = 'button';
      b.dataset.tuning = t.id;
      b.addEventListener('click', function () {
        CM.store.setSetting('tuning', CM.tuner.setTuning(t.id));
        buildTunerStrings();
        renderTuner();
      });
      row.appendChild(b);
    });

    $('tuner-all').addEventListener('click', function () { setAllStrings(true); });
    $('tuner-none').addEventListener('click', function () { setAllStrings(false); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-tuner-bpm]'), function (b) {
      b.addEventListener('click', function () {
        var next = CM.tuner.setBpm(CM.tuner.bpm() + Number(b.dataset.tunerBpm));
        CM.store.setSetting('tunerBpm', next);
        renderTuner();
      });
    });

    $('tuner-go').addEventListener('click', function () {
      if (CM.tuner.isRunning()) { CM.tuner.stop(); return; }
      if (!CM.tuner.enabledCount()) { toast('Unmute a string first.'); return; }
      if (!CM.audio.isSupported()) { toast('No audio on this browser.'); return; }
      CM.tuner.start();
    });

    CM.tuner.on('string', function (s) {
      tunerNodes.forEach(function (n, i) { n.classList.toggle('is-now', i === s.index); });
    });
    CM.tuner.on('start', renderTuner);
    CM.tuner.on('stop', function () {
      tunerNodes.forEach(function (n) { n.classList.remove('is-now'); });
      renderTuner();
    });

    buildTunerStrings();
  }

  /* One button per string, low E on the left — the order the strings are
     numbered everywhere else in the app. Rebuilt on a tuning change because
     the note names on the buttons change with it. */
  function buildTunerStrings() {
    var row = $('tuner-strings');
    row.innerHTML = '';
    tunerNodes = [];
    CM.tuner.notes().forEach(function (midi, i) {
      var b = el('button', 'tuner-string');
      b.type = 'button';
      b.appendChild(el('span', 'tuner-string-n', String(6 - i)));
      b.appendChild(el('span', 'tuner-string-note', CM.tuner.noteName(midi)));
      b.addEventListener('click', function () {
        var on = CM.tuner.toggleString(i);
        CM.store.setSetting('tunerStrings', CM.tuner.strings());
        renderTuner();
        // Turning a string on plays it, so you can tap one and tune to it
        // without starting the loop at all.
        if (on) CM.tuner.playString(i);
      });
      row.appendChild(b);
      tunerNodes.push(b);
    });
    renderTuner();
  }

  function setAllStrings(on) {
    CM.store.setSetting('tunerStrings', CM.tuner.setAll(on));
    renderTuner();
  }

  function renderTuner() {
    var running = CM.tuner.isRunning();
    var strings = CM.tuner.strings();

    Array.prototype.forEach.call($('tuner-tunings').children, function (b) {
      b.classList.toggle('is-on', b.dataset.tuning === CM.tuner.tuning());
    });

    var t = CM.tuner.get(CM.tuner.tuning());
    $('tuner-spell').textContent = CM.tuner.spell(t.id) + ' — ' + t.blurb;

    tunerNodes.forEach(function (n, i) {
      n.classList.toggle('is-on', !!strings[i]);
    });

    $('tuner-bpm').textContent = CM.tuner.bpm();
    var go = $('tuner-go');
    go.textContent = running ? 'Stop' : 'Play the strings';
    go.classList.toggle('is-playing', running);
  }

  /* ================= toast ================= */

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add('is-up'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('is-up');
      setTimeout(function () { t.hidden = true; }, 220);
    }, 2600);
  }

  /* ================= service worker ================= */

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ });
  }

  /* Leaving the app mid-session should not silently keep the clock running. */
  window.addEventListener('pagehide', function () {
    if (CM.trainer.isRunning()) CM.trainer.stop();
    CM.tuner.stop();
  });

  document.addEventListener('DOMContentLoaded', boot);
})(window.CM = window.CM || {});
