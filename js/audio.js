/* ChordMaster 2 - audio engine
 *
 * Three independent voices, each switchable from Settings:
 *   metronome  a click on every beat, accented on beat 1
 *   chord      a synthesised strum of the target chord
 *   countIn    four clicks before the first chord
 *
 * Nothing is downloaded. The guitar tone is one Karplus-Strong plucked-string
 * buffer generated at load, then pitch-shifted per note with playbackRate -
 * so the whole instrument costs a single buffer instead of one per chord.
 *
 * Timing uses the standard Web Audio lookahead pattern: a coarse setInterval
 * schedules notes onto the audio clock ahead of time, and a requestAnimationFrame
 * loop drains a queue so the UI flips at the moment you actually hear the beat.
 */
(function (CM) {
  'use strict';

  var REF_MIDI = 45;        // A2, the pitch the master pluck is generated at
  var PLUCK_SECONDS = 3.2;
  var LOOKAHEAD_MS = 25;    // how often the scheduler wakes
  var SCHEDULE_AHEAD = 0.12; // how far ahead of the audio clock it schedules

  var ctx = null;
  var master = null;
  var pluckBuffer = null;
  var unlocked = false;

  var settings = { metronome: true, chord: true, countIn: true, volume: 0.8 };

  /* ---------------- context ---------------- */

  function ensureContext() {
    if (ctx) return ctx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
    pluckBuffer = buildPluck(ctx);
    return ctx;
  }

  /* Browsers start the context suspended until a real user gesture. */
  function unlock() {
    var c = ensureContext();
    if (!c) return Promise.resolve(false);
    var p = c.state === 'suspended' ? c.resume() : Promise.resolve();
    return p.then(function () {
      if (!unlocked) {
        // A zero-length silent buffer settles iOS down.
        var s = c.createBufferSource();
        s.buffer = c.createBuffer(1, 1, c.sampleRate);
        s.connect(c.destination);
        s.start(0);
        unlocked = true;
      }
      return true;
    }).catch(function () { return false; });
  }

  /* ---------------- the plucked string ---------------- */

  function buildPluck(c) {
    var sr = c.sampleRate;
    var freq = 440 * Math.pow(2, (REF_MIDI - 69) / 12);
    var n = Math.max(2, Math.round(sr / freq));
    var len = Math.floor(sr * PLUCK_SECONDS);
    var buf = c.createBuffer(1, len, sr);
    var out = buf.getChannelData(0);

    // Seed the delay line with noise, gently smoothed so the pick is warm
    // rather than a click.
    var ring = new Float32Array(n);
    var prev = 0;
    for (var i = 0; i < n; i++) {
      var white = Math.random() * 2 - 1;
      prev = (white + prev * 1.4) / 2.4;
      ring[i] = prev;
    }

    var idx = 0;
    var damp = 0.9965;
    for (var j = 0; j < len; j++) {
      var cur = ring[idx];
      var next = ring[(idx + 1) % n];
      out[j] = cur;
      ring[idx] = (cur + next) * 0.5 * damp;
      idx = (idx + 1) % n;
    }

    // Fade the tail so a truncated buffer never ends in a click.
    var fade = Math.floor(sr * 0.25);
    for (var k = 0; k < fade; k++) {
      out[len - 1 - k] *= k / fade;
    }
    return buf;
  }

  function playNote(midi, time, gain) {
    var c = ensureContext();
    if (!c || !pluckBuffer) return;
    var src = c.createBufferSource();
    src.buffer = pluckBuffer;
    src.playbackRate.value = Math.pow(2, (midi - REF_MIDI) / 12);

    // Roll the very top end off so high strings do not sound brittle.
    var tone = c.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3800;

    var g = c.createGain();
    g.gain.value = gain;

    src.connect(tone); tone.connect(g); g.connect(master);
    src.start(time);
    src.stop(time + PLUCK_SECONDS);
  }

  /**
   * Strum a chord. Notes are staggered low-to-high like a real downstroke,
   * and muted strings are simply skipped.
   */
  function strum(chord, time) {
    if (!settings.chord) return;
    var c = ensureContext();
    if (!c) return;
    var notes = CM.chords.midiNotes(chord);
    var spread = 0.024;
    notes.forEach(function (note, i) {
      // Bass strings a touch louder, top strings a touch quieter.
      var gain = 0.30 - note.string * 0.018;
      playNote(note.midi, time + i * spread, gain);
    });
  }

  /**
   * A single string, for the fretboard exercises. Shares the chord voice
   * toggle - it is the same guitar, just one note of it.
   */
  function pluck(midi, time) {
    if (!settings.chord) return;
    if (!ensureContext()) return;
    playNote(midi, time, 0.26);
  }

  /**
   * A soft two-partial bell, used as feedback while dragging the volume
   * slider. It deliberately ignores the metronome and chord toggles - it is
   * feedback for the volume control itself, so it has to be audible whatever
   * else is switched off, and it runs through the master gain so you hear the
   * level you just chose.
   */
  function ding(time) {
    var c = ensureContext();
    if (!c) return;
    var t = time || c.currentTime + 0.01;
    [[880, 0.20], [1320, 0.06]].forEach(function (partial) {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = partial[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(partial[1], t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(g); g.connect(master);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /**
   * A steady reference pitch for the tuner, held for `seconds`.
   *
   * The pluck is no good here — it decays away before you have finished turning
   * a peg — so this is an additive tone instead. The upper partials are not
   * decoration: a phone speaker cannot reproduce a low E at 82Hz at all, and
   * without them the bottom two strings would be silent on the device most
   * people will use this on.
   *
   * Like `ding` it ignores the chord and metronome toggles. The tuner is its
   * own feature, not part of a practice session.
   */
  function tone(midi, time, seconds) {
    var c = ensureContext();
    if (!c) return;
    var t = time && time > 0 ? time : c.currentTime + 0.02;
    var dur = Math.max(0.25, seconds || 1.2);
    var freq = 440 * Math.pow(2, (midi - 69) / 12);
    var attack = 0.03;
    var release = Math.min(0.22, dur * 0.35);

    [[1, 0.20], [2, 0.10], [3, 0.055], [4, 0.03], [5, 0.018]].forEach(function (partial) {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * partial[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(partial[1], t + attack);
      g.gain.setValueAtTime(partial[1], t + dur - release);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    });
  }

  function click(time, accent) {
    var c = ensureContext();
    if (!c) return;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1600 : 950;
    var peak = accent ? 0.26 : 0.15;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    osc.connect(g); g.connect(master);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  /* ---------------- beat clock ---------------- */

  /**
   * Clock drives everything in beats.
   *
   *   onSchedule(beat, audioTime)  called early, for scheduling sound
   *   onBeat(beat)                 called when that beat is actually audible
   *
   * `beat` counts up from 0 forever; negative beats are the count-in.
   */
  function Clock() {
    this.bpm = 80;
    this.running = false;
    this.beat = 0;
    this.nextTime = 0;
    this.queue = [];
    this.timer = null;
    this.raf = null;
    this.onSchedule = null;
    this.onBeat = null;
  }

  Clock.prototype.secondsPerBeat = function () {
    return 60 / this.bpm;
  };

  Clock.prototype.start = function (opts) {
    var self = this;
    var c = ensureContext();
    if (!c) return false;

    this.bpm = opts.bpm || this.bpm;
    this.onSchedule = opts.onSchedule || null;
    this.onBeat = opts.onBeat || null;
    this.beat = opts.startBeat != null ? opts.startBeat : 0;
    this.queue.length = 0;
    this.running = true;
    // A short cushion so the first beat is never late.
    this.nextTime = c.currentTime + 0.08;

    this.timer = setInterval(function () { self._schedule(); }, LOOKAHEAD_MS);
    this._schedule();
    this._drain();
    return true;
  };

  Clock.prototype.stop = function () {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.queue.length = 0;
  };

  Clock.prototype.setBpm = function (bpm) {
    // Takes effect on the next scheduled beat; already-queued beats keep their time.
    this.bpm = bpm;
  };

  Clock.prototype._schedule = function () {
    if (!this.running || !ctx) return;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      if (this.onSchedule) this.onSchedule(this.beat, this.nextTime);
      this.queue.push({ beat: this.beat, time: this.nextTime });
      this.nextTime += this.secondsPerBeat();
      this.beat++;
    }
  };

  Clock.prototype._drain = function () {
    var self = this;
    if (!this.running) return;
    while (this.queue.length && ctx && this.queue[0].time <= ctx.currentTime) {
      var item = this.queue.shift();
      if (this.onBeat) this.onBeat(item.beat);
    }
    this.raf = requestAnimationFrame(function () { self._drain(); });
  };

  /* ---------------- public surface ---------------- */

  CM.audio = {
    clock: new Clock(),
    unlock: unlock,
    strum: strum,
    pluck: pluck,
    ding: ding,
    tone: tone,

    tick: function (time, accent) {
      if (settings.metronome) click(time, accent);
    },

    /* The count-in ignores the metronome toggle - it is its own setting. */
    countInTick: function (time, accent) {
      if (settings.countIn) click(time, accent);
    },

    /* Play a chord right now, for previews and the lesson list. */
    preview: function (chord) {
      unlock().then(function () {
        if (!ctx) return;
        var was = settings.chord;
        settings.chord = true;
        strum(chord, ctx.currentTime + 0.02);
        settings.chord = was;
      });
    },

    settings: settings,

    applySettings: function (next) {
      if (next.metronome != null) settings.metronome = !!next.metronome;
      if (next.chord != null) settings.chord = !!next.chord;
      if (next.countIn != null) settings.countIn = !!next.countIn;
      if (next.volume != null) {
        settings.volume = Math.max(0, Math.min(1, Number(next.volume)));
        if (master) master.gain.value = settings.volume;
      }
    },

    countInBeats: function () {
      return settings.countIn ? 4 : 0;
    },

    isSupported: function () {
      return !!(window.AudioContext || window.webkitAudioContext);
    },

    now: function () { return ctx ? ctx.currentTime : 0; }
  };
})(window.CM = window.CM || {});
