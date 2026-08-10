/* ChordMaster 2 - chord library
 *
 * Strings are indexed 0..5 from LOW E (6th string) to HIGH e (1st string),
 * which is the order they appear top-to-bottom when you hold the guitar.
 *
 *   frets[i]   -1 = muted (x), 0 = open, n = fret number (absolute)
 *   fingers[i]  0 = open or unused, 1 = index .. 4 = pinky
 *   barre       { fret, from, to } inclusive string indices, or null
 *
 * openMidi lets the audio engine turn a shape into real pitches:
 * midi = openMidi[string] + fret
 */
(function (CM) {
  'use strict';

  var openMidi = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4

  var CHORDS = [
    /* ---------- open major ---------- */
    {
      id: 'A', name: 'A', longName: 'A major', type: 'major', shape: 'open',
      frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], barre: null,
      tip: 'Three fingers stacked in one fret. Curl them so the high E stays ringing.'
    },
    {
      id: 'C', name: 'C', longName: 'C major', type: 'major', shape: 'open',
      frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], barre: null,
      tip: 'Keep the ring finger arched — it likes to flatten and kill the D string.'
    },
    {
      id: 'D', name: 'D', longName: 'D major', type: 'major', shape: 'open',
      frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], barre: null,
      tip: 'Only strum the bottom four strings. The triangle shape should feel compact.'
    },
    {
      id: 'E', name: 'E', longName: 'E major', type: 'major', shape: 'open',
      frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], barre: null,
      tip: 'All six strings ring. This is the shape the F barre chord is built from.'
    },
    {
      id: 'G', name: 'G', longName: 'G major', type: 'major', shape: 'open',
      frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], barre: null,
      tip: 'Big stretch across the neck. Anchor the ring finger first, then fill in.'
    },
    {
      id: 'F', name: 'F', longName: 'F major', type: 'major', shape: 'barre', difficulty: 3,
      frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1],
      barre: { fret: 1, from: 0, to: 5 },
      tip: 'Roll the index finger onto its bony edge. Thumb low behind the neck.'
    },
    {
      id: 'B', name: 'B', longName: 'B major', type: 'major', shape: 'barre', difficulty: 3,
      frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1],
      barre: { fret: 2, from: 1, to: 5 },
      tip: 'An A shape moved up two frets. Mute the low E with the tip of your index.'
    },

    /* ---------- open minor ---------- */
    {
      id: 'Am', name: 'Am', longName: 'A minor', type: 'minor', shape: 'open',
      frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], barre: null,
      tip: 'Same fingers as E major, moved down one string. Learn them as a pair.'
    },
    {
      id: 'Dm', name: 'Dm', longName: 'D minor', type: 'minor', shape: 'open',
      frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], barre: null,
      tip: 'Bottom four strings only. The index finger drops to the first fret.'
    },
    {
      id: 'Em', name: 'Em', longName: 'E minor', type: 'minor', shape: 'open',
      frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], barre: null,
      tip: 'The easiest chord on the guitar. Two fingers, all six strings ring.'
    },
    {
      id: 'Bm', name: 'Bm', longName: 'B minor', type: 'minor', shape: 'barre', difficulty: 3,
      frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1],
      barre: { fret: 2, from: 1, to: 5 },
      tip: 'An Am shape barred at the second fret. Skip the low E string.'
    },
    {
      id: 'Cm', name: 'Cm', longName: 'C minor', type: 'minor', shape: 'barre', difficulty: 3,
      frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1],
      barre: { fret: 3, from: 1, to: 5 },
      tip: 'The Bm shape slid up one fret. If Bm works, this works.'
    },
    {
      id: 'Fm', name: 'Fm', longName: 'F minor', type: 'minor', shape: 'barre', difficulty: 3,
      frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1],
      barre: { fret: 1, from: 0, to: 5 },
      tip: 'F major with the index doing more work — lift finger 2 off and barre.'
    },
    {
      id: 'Gm', name: 'Gm', longName: 'G minor', type: 'minor', shape: 'barre', difficulty: 3,
      frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1],
      barre: { fret: 3, from: 0, to: 5 },
      tip: 'Fm moved up two frets, where the strings are kinder to your fingers.'
    },

    /* ---------- sevenths ---------- */
    {
      id: 'E7', name: 'E7', longName: 'E dominant 7', type: 'seventh', shape: 'open',
      frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], barre: null,
      tip: 'E major with the ring finger lifted. Instantly bluesy.'
    },
    {
      id: 'A7', name: 'A7', longName: 'A dominant 7', type: 'seventh', shape: 'open',
      frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], barre: null,
      tip: 'A major with the middle finger lifted off the G string.'
    },
    {
      id: 'D7', name: 'D7', longName: 'D dominant 7', type: 'seventh', shape: 'open',
      frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], barre: null,
      tip: 'The D triangle turned upside down.'
    },
    {
      id: 'G7', name: 'G7', longName: 'G dominant 7', type: 'seventh', shape: 'open',
      frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], barre: null,
      tip: 'G major, but the high E drops to the first fret. It wants to fall to C.'
    },
    {
      id: 'C7', name: 'C7', longName: 'C dominant 7', type: 'seventh', shape: 'open',
      frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 4, 2, 3, 1, 0], barre: null,
      tip: 'C major plus the pinky reaching to the G string.'
    },
    {
      id: 'B7', name: 'B7', longName: 'B dominant 7', type: 'seventh', shape: 'open',
      frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], barre: null,
      tip: 'Four fingers, awkward at first. Much easier than a full B barre.'
    },
    {
      id: 'Am7', name: 'Am7', longName: 'A minor 7', type: 'seventh', shape: 'open',
      frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], barre: null,
      tip: 'Am with the ring finger lifted. Two fingers, very forgiving.'
    },
    {
      id: 'Em7', name: 'Em7', longName: 'E minor 7', type: 'seventh', shape: 'open',
      frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0], barre: null,
      tip: 'One finger. Use it as a rest stop between harder shapes.'
    },
    {
      id: 'Dm7', name: 'Dm7', longName: 'D minor 7', type: 'seventh', shape: 'open',
      frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], barre: null,
      tip: 'A tiny two-string barre with the index — good barre practice.'
    },

    /* ---------- helpers, suspensions, easier substitutes ---------- */
    {
      id: 'Fmaj7', name: 'Fmaj7', longName: 'F major 7', type: 'other', shape: 'open',
      frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], barre: null,
      tip: 'The legal way to dodge the F barre. Sounds softer, works in most songs.'
    },
    {
      id: 'Fmini', name: 'F*', longName: 'F major (mini barre)', type: 'major', shape: 'barre', difficulty: 2,
      frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1],
      barre: { fret: 1, from: 4, to: 5 },
      tip: 'Four strings only — a stepping stone to the full F barre.'
    },
    {
      id: 'Cadd9', name: 'Cadd9', longName: 'C add 9', type: 'other', shape: 'open',
      frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], barre: null,
      tip: 'Keep ring and pinky planted and you can swap G/Cadd9/Em7 without lifting them.'
    },
    {
      id: 'Dsus4', name: 'Dsus4', longName: 'D suspended 4', type: 'other', shape: 'open',
      frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3], barre: null,
      tip: 'Add the pinky to D. Hammer it on and off for instant folk texture.'
    },
    {
      id: 'Dsus2', name: 'Dsus2', longName: 'D suspended 2', type: 'other', shape: 'open',
      frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0], barre: null,
      tip: 'D with the high E left open.'
    },
    {
      id: 'Asus2', name: 'Asus2', longName: 'A suspended 2', type: 'other', shape: 'open',
      frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0], barre: null,
      tip: 'A major minus the ring finger. Great resting shape.'
    },
    {
      id: 'Asus4', name: 'Asus4', longName: 'A suspended 4', type: 'other', shape: 'open',
      frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0], barre: null,
      tip: 'A major with the B string pushed up one fret.'
    },
    {
      id: 'Esus4', name: 'Esus4', longName: 'E suspended 4', type: 'other', shape: 'open',
      frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0], barre: null,
      tip: 'Three fingers in a row. Alternate with E major for a classic push-pull.'
    },
    {
      id: 'G/B', name: 'G/B', longName: 'G major over B', type: 'other', shape: 'open',
      frets: [-1, 2, 0, 0, 0, 3], fingers: [0, 1, 0, 0, 0, 3], barre: null,
      tip: 'A walking bass note between Am and C. Two fingers.'
    }
  ];

  var byId = {};
  CHORDS.forEach(function (c) {
    c.difficulty = c.difficulty || (c.shape === 'barre' ? 3 : 1);
    byId[c.id] = c;
  });

  /* Turn a shape into MIDI note numbers, low to high, skipping muted strings. */
  function midiNotes(chord) {
    var out = [];
    for (var i = 0; i < 6; i++) {
      if (chord.frets[i] >= 0) out.push({ string: i, midi: openMidi[i] + chord.frets[i] });
    }
    return out;
  }

  function get(id) {
    var c = byId[id];
    if (!c) throw new Error('Unknown chord: ' + id);
    return c;
  }

  /* Chords whose ids appear in the list, in the order given. */
  function pool(ids) {
    return ids.map(get);
  }

  function byType(type) {
    if (!type || type === 'all') return CHORDS.slice();
    return CHORDS.filter(function (c) { return c.type === type; });
  }

  CM.chords = {
    all: CHORDS,
    openMidi: openMidi,
    get: get,
    pool: pool,
    byType: byType,
    midiNotes: midiNotes,
    has: function (id) { return !!byId[id]; }
  };
})(window.CM = window.CM || {});
