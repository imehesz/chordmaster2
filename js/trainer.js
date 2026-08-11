/* ChordMaster 2 - practice engine
 *
 * Everything is measured in beats rather than seconds, so the chord you are
 * looking at always lines up with the click you are hearing.
 *
 * A session is a queue of drills. Each drill has a provider that answers the
 * only question that matters: "at beat N, what chord should be on screen, and
 * what is coming next?"
 *
 *   RandomProvider       shuffles a pool, never repeating a chord twice running
 *   ProgressionProvider  walks a fixed list of bars and loops
 *   ExerciseProvider     walks a fixed list of single notes and loops
 *
 * The first two answer with a chord id; the third answers with a note, and its
 * drills carry kind 'exercise' so the UI knows to draw a neck instead of a
 * chord box.
 */
(function (CM) {
  'use strict';

  /* ---------------- providers ---------------- */

  function RandomProvider(chordIds, barsPerChord, beatsPerBar) {
    this.ids = chordIds.slice();
    this.beatsPerStep = Math.max(1, barsPerChord) * beatsPerBar;
    this.beatsPerBar = beatsPerBar;
    this.picks = [];
    this.finite = false;
  }

  RandomProvider.prototype._pick = function (index) {
    while (this.picks.length <= index) {
      var choice;
      if (this.ids.length === 1) {
        choice = this.ids[0];
      } else {
        var prev = this.picks[this.picks.length - 1];
        do {
          choice = this.ids[Math.floor(Math.random() * this.ids.length)];
        } while (choice === prev);
      }
      this.picks.push(choice);
    }
    return this.picks[index];
  };

  RandomProvider.prototype.at = function (beat) {
    var step = Math.floor(beat / this.beatsPerStep);
    var into = beat - step * this.beatsPerStep;
    return {
      chord: this._pick(step),
      next: this._pick(step + 1),
      stepIndex: step,
      beatsInStep: this.beatsPerStep,
      beatInStep: into,
      beatsPerBar: this.beatsPerBar,
      beatInBar: beat % this.beatsPerBar,
      barIndex: null,
      totalBars: null,
      boundary: into === 0
    };
  };

  function ProgressionProvider(bars, beatsPerBar) {
    this.bars = bars;
    this.beatsPerBar = beatsPerBar;
    this.totalBars = bars.length;

    // Merge consecutive bars of the same chord into one display step, but keep
    // the bar count intact so "bar 7 of 12" still means something.
    this.steps = [];
    var self = this;
    bars.forEach(function (bar, i) {
      var last = self.steps[self.steps.length - 1];
      if (last && last.chord === bar.chord) {
        last.beats += bar.beats;
      } else {
        self.steps.push({ chord: bar.chord, beats: bar.beats, firstBar: i });
      }
    });

    // Flatten to a beat -> position lookup. Progressions are short; this is
    // cheaper and far less error-prone than arithmetic at every beat.
    this.map = [];
    var stepStart = 0;
    this.steps.forEach(function (step, si) {
      for (var b = 0; b < step.beats; b++) {
        self.map.push({ stepIndex: si, beatInStep: b, beatsInStep: step.beats });
      }
      stepStart += step.beats;
    });
    this.barOfBeat = [];
    bars.forEach(function (bar, bi) {
      for (var b = 0; b < bar.beats; b++) self.barOfBeat.push({ bar: bi, beatInBar: b });
    });
    this.totalBeats = this.map.length;
    this.finite = false;
  }

  ProgressionProvider.prototype.at = function (beat) {
    var pos = ((beat % this.totalBeats) + this.totalBeats) % this.totalBeats;
    var m = this.map[pos];
    var bar = this.barOfBeat[pos];
    var step = this.steps[m.stepIndex];
    var next = this.steps[(m.stepIndex + 1) % this.steps.length];
    return {
      chord: step.chord,
      next: next.chord,
      stepIndex: m.stepIndex,
      beatsInStep: m.beatsInStep,
      beatInStep: m.beatInStep,
      beatsPerBar: this.beatsPerBar,
      beatInBar: bar.beatInBar,
      barIndex: bar.bar,
      totalBars: this.totalBars,
      loopBeat: pos,
      loopBeats: this.totalBeats,
      boundary: m.beatInStep === 0
    };
  };

  /* One note per step, looping forever. `beatsPerNote` above 1 is slow practice:
     the note stays put while the click keeps time. */
  function ExerciseProvider(notes, beatsPerNote, beatsPerBar) {
    this.notes = notes;
    this.beatsPerNote = Math.max(1, beatsPerNote || 1);
    this.beatsPerBar = beatsPerBar || 4;
    this.totalBeats = notes.length * this.beatsPerNote;
    this.finite = false;
  }

  ExerciseProvider.prototype.at = function (beat) {
    var pos = ((beat % this.totalBeats) + this.totalBeats) % this.totalBeats;
    var idx = Math.floor(pos / this.beatsPerNote);
    var into = pos - idx * this.beatsPerNote;
    return {
      chord: null,
      next: null,
      note: this.notes[idx],
      nextNote: this.notes[(idx + 1) % this.notes.length],
      stepIndex: idx,
      stepCount: this.notes.length,
      beatsInStep: this.beatsPerNote,
      beatInStep: into,
      beatsPerBar: this.beatsPerBar,
      // Counted off the absolute beat: a run rarely divides evenly into bars,
      // and the click has to stay steady across the loop point regardless.
      beatInBar: ((beat % this.beatsPerBar) + this.beatsPerBar) % this.beatsPerBar,
      barIndex: null,
      totalBars: null,
      loopBeat: pos,
      loopBeats: this.totalBeats,
      boundary: into === 0
    };
  };

  /* ---------------- drill construction ---------------- */

  function buildDrill(spec) {
    // spec: { type, chords|progression, sub, barsPerChord, beatsPerBar, bpm, minutes, label }
    var bpm = spec.bpm || 80;
    var drill = { label: spec.label || '', bpm: bpm, raw: spec, kind: 'chord' };

    if (spec.type === 'exercise') {
      var ex = CM.exercises.get(spec.exercise);
      drill.kind = 'exercise';
      drill.exercise = ex;
      drill.provider = new ExerciseProvider(ex.notes,
        spec.beatsPerNote || ex.beatsPerNote, ex.beatsPerBar);
      drill.label = drill.label || ex.name;
    } else if (spec.type === 'progression') {
      var built = CM.lessons.drillBars(spec);
      var bpb = spec.beatsPerBar || built.progression.beatsPerBar || 4;
      drill.provider = new ProgressionProvider(built.bars, bpb);
      drill.progression = built.progression;
      drill.label = drill.label || built.progression.name;
    } else {
      var beatsPerBar = spec.beatsPerBar || 4;
      drill.provider = new RandomProvider(spec.chords, spec.barsPerChord || 1, beatsPerBar);
      drill.label = drill.label || 'Random chords';
    }

    // minutes -> beats. No minutes means practise until stopped.
    drill.totalBeats = spec.minutes ? Math.round(spec.minutes * bpm) : Infinity;
    return drill;
  }

  /* ---------------- the trainer ---------------- */

  var listeners = {};
  function emit(name, payload) {
    (listeners[name] || []).forEach(function (fn) { fn(payload); });
  }

  var state = {
    running: false,
    drills: [],
    drillIndex: 0,
    drill: null,
    beat: 0,
    countIn: 0,
    stepStartAt: 0,
    stepSeconds: 0,
    current: null,
    sessionKind: 'free',
    sessionLabel: '',
    startedAt: 0,
    elapsedMs: 0,
    gapTimer: null
  };

  function currentDrill() { return state.drill; }

  function beginDrill(index) {
    state.drillIndex = index;
    state.drill = state.drills[index];
    state.beat = 0;
    state.countIn = CM.audio.countInBeats();

    emit('drill', {
      drill: state.drill,
      index: index,
      total: state.drills.length,
      bpm: state.drill.bpm
    });

    CM.audio.clock.start({
      bpm: state.drill.bpm,
      startBeat: -state.countIn,
      onSchedule: onSchedule,
      onBeat: onBeat
    });
  }

  /* Runs early, on the audio clock. Only job: put sound on the timeline. */
  function onSchedule(beat, time) {
    var drill = state.drill;
    if (!drill) return;

    if (beat < 0) {
      // count-in: accent the first of the four
      CM.audio.countInTick(time, beat === -CM.audio.countInBeats());
      return;
    }

    // The scheduler runs ahead of the audible beat, so it can reach past the
    // end of a drill. Do not put sound on the timeline for beats we will never
    // actually get to.
    if (beat >= drill.totalBeats) return;

    var info = drill.provider.at(beat);
    CM.audio.tick(time, info.beatInBar === 0);
    if (!info.boundary) return;
    if (drill.kind === 'exercise') {
      CM.audio.pluck(info.note.midi, time);
    } else if (CM.chords.has(info.chord)) {
      CM.audio.strum(CM.chords.get(info.chord), time);
    }
  }

  /* Runs when the beat is actually audible. Only job: update the UI. */
  function onBeat(beat) {
    var drill = state.drill;
    if (!drill) return;

    if (beat < 0) {
      // Count the player in *to something*. The provider already knows what
      // beat 0 holds, so send it along: four clicks that resolve onto a shape
      // you have never seen are no use to a beginner, and on a long drill it
      // can be a while before it comes round again.
      var first = drill.provider.at(0);
      var isExercise = drill.kind === 'exercise';
      emit('countin', {
        remaining: -beat,
        info: first,
        drill: drill,
        note: isExercise ? first.note : null,
        nextNote: isExercise ? first.nextNote : null,
        chord: !isExercise && CM.chords.has(first.chord) ? CM.chords.get(first.chord) : null,
        next: !isExercise && CM.chords.has(first.next) ? CM.chords.get(first.next) : null
      });
      return;
    }

    if (beat >= drill.totalBeats) {
      finishDrill();
      return;
    }

    var info = drill.provider.at(beat);
    var secPerBeat = 60 / drill.bpm;

    if (info.boundary || !state.current) {
      state.stepStartAt = CM.audio.now();
      state.stepSeconds = info.beatsInStep * secPerBeat;
      state.current = info;
      if (drill.kind === 'exercise') {
        emit('note', { note: info.note, next: info.nextNote, info: info, drill: drill });
      } else {
        emit('chord', {
          chord: CM.chords.get(info.chord),
          next: CM.chords.has(info.next) ? CM.chords.get(info.next) : null,
          info: info,
          drill: drill
        });
      }
    }

    emit('beat', {
      beat: beat,
      beatInBar: info.beatInBar,
      beatsPerBar: info.beatsPerBar,
      isBarStart: info.beatInBar === 0,
      info: info,
      drillProgress: drill.totalBeats === Infinity ? null : beat / drill.totalBeats
    });
  }

  function finishDrill() {
    CM.audio.clock.stop();
    var next = state.drillIndex + 1;
    if (next < state.drills.length) {
      emit('drillcomplete', { index: state.drillIndex, total: state.drills.length });
      // A short breath between drills, then count in the next one.
      state.gapTimer = setTimeout(function () {
        if (state.running) beginDrill(next);
      }, 1400);
    } else {
      completeSession();
    }
  }

  function completeSession() {
    var elapsed = Date.now() - state.startedAt;
    stop(true);
    emit('complete', {
      kind: state.sessionKind,
      label: state.sessionLabel,
      minutes: elapsed / 60000,
      day: state.day || null
    });
  }

  /**
   * start({ kind, label, day, drills: [drillSpec, ...] })
   * A free-practice session is just a one-drill session with no minutes.
   */
  function start(session) {
    stop(true);
    return CM.audio.unlock().then(function () {
      state.drills = session.drills.map(buildDrill);
      if (!state.drills.length) return false;
      state.running = true;
      state.sessionKind = session.kind || 'free';
      state.sessionLabel = session.label || '';
      state.day = session.day || null;
      state.startedAt = Date.now();
      state.current = null;
      emit('start', { session: session, drills: state.drills });
      beginDrill(0);
      return true;
    });
  }

  function stop(silent) {
    if (state.gapTimer) { clearTimeout(state.gapTimer); state.gapTimer = null; }
    CM.audio.clock.stop();
    var was = state.running;
    var elapsed = was ? Date.now() - state.startedAt : 0;
    state.running = false;
    state.drill = null;
    state.current = null;
    if (was && !silent) {
      emit('stop', {
        kind: state.sessionKind,
        label: state.sessionLabel,
        minutes: elapsed / 60000,
        day: state.day || null,
        completed: false
      });
    }
  }

  /* Fraction through the current chord, for the progress ring. Read on rAF. */
  function stepProgress() {
    if (!state.running || !state.stepSeconds) return 0;
    var t = (CM.audio.now() - state.stepStartAt) / state.stepSeconds;
    return Math.max(0, Math.min(1, t));
  }

  function setBpm(bpm) {
    if (state.drill) {
      state.drill.bpm = bpm;
      CM.audio.clock.setBpm(bpm);
    }
  }

  CM.trainer = {
    start: start,
    stop: stop,
    isRunning: function () { return state.running; },
    stepProgress: stepProgress,
    setBpm: setBpm,
    currentDrill: currentDrill,
    state: state,
    buildDrill: buildDrill,
    on: function (name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
    },
    /* Helper: turn a lesson day into a session. */
    sessionForDay: function (day) {
      var lesson = CM.lessons.get(day);
      return {
        kind: 'lesson',
        label: 'Day ' + lesson.day + ' — ' + lesson.title,
        day: lesson.day,
        drills: lesson.drills
      };
    }
  };
})(window.CM = window.CM || {});
