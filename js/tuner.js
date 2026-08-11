/* ChordMaster 2 - tuner
 *
 * Plays reference pitches so you can tune by ear. Seven tunings, each one six
 * MIDI notes ordered LOW string first, matching the string indexing used
 * everywhere else in the app (0 = low E / 6th string).
 *
 * Two things are under the user's control:
 *
 *   speed    one string per beat, so a slow tempo gives you a long note to
 *            listen to and a fast one is a quick sweep down the neck
 *   strings   each string can be muted. Mute five of them and the sixth just
 *            repeats, which is how you sit on one string and tune it.
 *
 * Timing is anchored to the audio clock rather than to setTimeout, so a note
 * that is scheduled late does not push every note after it late too.
 */
(function (CM) {
  'use strict';

  /* Flats, because that is how guitarists write these tunings — Eb standard,
     not D# standard. */
  var NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  var TUNINGS = [
    { id: 'standard', name: 'Standard', notes: [40, 45, 50, 55, 59, 64],
      blurb: 'Where everything in this app is written.' },
    { id: 'dropd', name: 'Drop D', notes: [38, 45, 50, 55, 59, 64],
      blurb: 'Low E dropped a whole step. One finger power chords.' },
    { id: 'halfstep', name: 'Half step down', notes: [39, 44, 49, 54, 58, 63],
      blurb: 'Everything down a semitone. Easier on the fingers and the voice.' },
    { id: 'dropc', name: 'Drop C', notes: [36, 43, 48, 53, 57, 62],
      blurb: 'Drop D taken down another whole step. Heavy.' },
    { id: 'openg', name: 'Open G', notes: [38, 43, 50, 55, 59, 62],
      blurb: 'Strum it open and you get G major. Slide and Stones country.' },
    { id: 'opend', name: 'Open D', notes: [38, 45, 50, 54, 57, 62],
      blurb: 'Open strings ring out a D major chord.' },
    { id: 'dadgad', name: 'DADGAD', notes: [38, 45, 50, 55, 57, 62],
      blurb: 'Neither major nor minor. Celtic tunes live here.' }
  ];

  var byId = {};
  TUNINGS.forEach(function (t) { byId[t.id] = t; });

  function noteName(midi) { return NAMES[((midi % 12) + 12) % 12]; }

  function get(id) { return byId[id] || byId.standard; }

  /** "E A D G B E", low string first — the line printed under the picker. */
  function spell(id) {
    return get(id).notes.map(noteName).join(' ');
  }

  /* ---------------- state ---------------- */

  var state = {
    tuning: 'standard',
    bpm: 40,
    strings: [true, true, true, true, true, true],
    running: false,
    index: -1,
    timer: null,
    nextTime: 0
  };

  var listeners = {};
  function emit(name, payload) {
    (listeners[name] || []).forEach(function (fn) { fn(payload); });
  }

  function notes() { return get(state.tuning).notes; }

  function enabledCount() {
    return state.strings.filter(Boolean).length;
  }

  /* The next lit string after `from`, wrapping. -1 when they are all muted. */
  function nextEnabled(from) {
    for (var i = 1; i <= 6; i++) {
      var idx = (from + i + 6) % 6;
      if (state.strings[idx]) return idx;
    }
    return -1;
  }

  function secondsPerString() { return 60 / state.bpm; }

  /* ---------------- the loop ---------------- */

  /* Wake this far before the note is due, and never schedule one closer than
     RESYNC to the present. WAKE has to be the larger of the two: if the timer
     woke us with less than RESYNC to spare we would push every note a few
     milliseconds late, and those milliseconds accumulate. */
  var WAKE = 0.06;
  var RESYNC = 0.04;

  function step() {
    if (!state.running) return;
    var idx = nextEnabled(state.index);
    if (idx === -1) { stop(); return; }

    var now = CM.audio.now();
    var length = secondsPerString();
    // Normally the timetable is already in the future and is used as is. It is
    // only in the past if the tab was backgrounded and the audio clock ran on
    // without us, in which case start again from here.
    var at = state.nextTime >= now + RESYNC ? state.nextTime : now + RESYNC;

    state.index = idx;
    state.nextTime = at + length;
    CM.audio.tone(notes()[idx], at, length);
    emit('string', { index: idx, midi: notes()[idx], name: noteName(notes()[idx]) });

    state.timer = setTimeout(step, Math.max(20, (state.nextTime - CM.audio.now() - WAKE) * 1000));
  }

  function start() {
    if (state.running) return false;
    if (!enabledCount()) return false;
    if (!CM.audio.isSupported()) return false;

    state.running = true;
    state.index = -1;
    emit('start', { tuning: state.tuning });

    CM.audio.unlock().then(function () {
      if (!state.running) return;
      state.nextTime = CM.audio.now() + WAKE;
      step();
    });
    return true;
  }

  function stop() {
    if (!state.running) return;
    state.running = false;
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.index = -1;
    emit('stop', {});
  }

  /* One string on its own, for the tap-to-hear feedback in the settings UI.
     Kept short so it does not sit under the loop if the tuner is running. */
  function playString(index) {
    if (index < 0 || index > 5) return;
    var midi = notes()[index];
    CM.audio.unlock().then(function () {
      CM.audio.tone(midi, 0, Math.min(1.4, secondsPerString()));
    });
  }

  CM.tuner = {
    tunings: TUNINGS,
    get: get,
    has: function (id) { return !!byId[id]; },
    noteName: noteName,
    spell: spell,

    notes: notes,
    strings: function () { return state.strings.slice(); },
    enabledCount: enabledCount,
    tuning: function () { return state.tuning; },
    bpm: function () { return state.bpm; },
    isRunning: function () { return state.running; },

    setTuning: function (id) {
      if (!byId[id]) return state.tuning;
      state.tuning = id;
      // Whatever is playing now belongs to the old tuning; start the new one
      // from the top rather than halfway through.
      if (state.running) state.index = -1;
      return state.tuning;
    },

    setBpm: function (v) {
      state.bpm = Math.max(15, Math.min(120, Math.round(v)));
      return state.bpm;
    },

    setStrings: function (list) {
      if (!list || list.length !== 6) return state.strings.slice();
      state.strings = list.map(function (v) { return !!v; });
      return state.strings.slice();
    },

    /** Flip one string. Returns its new state. */
    toggleString: function (i) {
      if (i < 0 || i > 5) return false;
      state.strings[i] = !state.strings[i];
      return state.strings[i];
    },

    setAll: function (on) {
      state.strings = [0, 1, 2, 3, 4, 5].map(function () { return !!on; });
      return state.strings.slice();
    },

    start: start,
    stop: stop,
    playString: playString,

    on: function (name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
    }
  };
})(window.CM = window.CM || {});
