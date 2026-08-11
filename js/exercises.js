/* ChordMaster 2 - fretboard exercises
 *
 * Finger drills that move along the neck instead of playing chords: the spider
 * (1-2-3-4 across the strings), its finger-order variants, and the ladder
 * (chromatic up a single string).
 *
 * An exercise is data, not code. It declares how the hand walks and in what
 * order the fingers fall; `expand` below turns that into the flat list of notes
 * the trainer plays, one per step. Adding a new drill means adding an object to
 * EXERCISES - nothing else in the app needs to know about it.
 *
 *   walk      'across'  every finger on each string, string by string
 *             'along'   up one string, fret by fret
 *             'pair'    two fingers trilling on the spot, string by string
 *             'box'     a fixed shape - the pentatonic positions
 *   fingers   the order the fingers fall at each position (1 index .. 4 pinky)
 *   pairs     for 'pair': the two-finger combinations to work through
 *   shape     for 'box': per string, [fret offset, finger] for each note
 *   strings   which strings to cross, 0 = low E .. 5 = high e
 *   position  { from, to, step, andBack } lowest fret the hand sits at
 *   andBack   after the pass, play it in reverse (up the neck, then back down)
 *   bpm       a sane starting tempo - these are slow-practice drills
 *
 * A note is { string, fret, finger, pos, midi }, where `pos` is the fret the
 * hand is anchored at, so the fretboard view only shifts when the hand shifts.
 */
(function (CM) {
  'use strict';

  var STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
  var ALL_STRINGS = [0, 1, 2, 3, 4, 5];

  /* The pitch classes a shape is meant to contain (0 = C), so a box entered by
     hand can be proved to spell the scale it claims rather than merely looking
     plausible on the neck. tools/validate.js does the proving. */
  var SCALES = {
    'Am-pentatonic': [9, 0, 2, 4, 7] // A C D E G
  };

  function noteAt(string, fret, finger, pos) {
    return {
      string: string,
      fret: fret,
      finger: finger,
      pos: pos,
      midi: CM.chords.openMidi[string] + fret
    };
  }

  /* One finger per fret, so finger 1 sits on the position fret. */
  function acrossPass(ex, pos) {
    var out = [];
    ex.strings.forEach(function (s) {
      ex.fingers.forEach(function (f) {
        out.push(noteAt(s, pos + f - 1, f, pos));
      });
    });
    return out;
  }

  /* Chromatic up one string. The hand shifts a whole position every four frets,
     so the fingering stays 1-2-3-4 the whole way up. */
  function alongPass(ex, pos) {
    var out = [];
    for (var i = 0; i < ex.span; i++) {
      out.push(noteAt(ex.string, pos + i, (i % 4) + 1, pos + Math.floor(i / 4) * 4));
    }
    return out;
  }

  /* Two fingers alternating on the spot, repeated, then moved to the next
     string. Hammer on and pull off rather than picking every note. */
  function pairPass(ex, pos) {
    var out = [];
    ex.pairs.forEach(function (pair) {
      ex.strings.forEach(function (s) {
        for (var r = 0; r < ex.repeats; r++) {
          pair.forEach(function (f) {
            out.push(noteAt(s, pos + f - 1, f, pos));
          });
        }
      });
    });
    return out;
  }

  /* A fixed shape rather than a walk: the fingering is part of the data,
     because a pentatonic box is not one finger per fret. */
  function boxPass(ex, pos) {
    var out = [];
    ex.shape.forEach(function (entries, s) {
      entries.forEach(function (e) {
        out.push(noteAt(s, pos + e[0], e[1], pos));
      });
    });
    return out;
  }

  /* Play it, then play it backwards. The turn note is dropped from the return
     leg so the top of the run is struck once, not twice. */
  function withReturn(pass) {
    return pass.concat(pass.slice(0, -1).reverse());
  }

  function positionsOf(ex) {
    var p = ex.position || { from: 1, to: 1 };
    var step = p.step || 1;
    var out = [];
    for (var f = p.from; f <= p.to; f += step) out.push(f);
    // Walking back down repeats neither end, so the loop does not stutter.
    if (p.andBack) out = out.concat(out.slice(1, -1).reverse());
    return out;
  }

  function same(a, b) {
    return a && b && a.string === b.string && a.fret === b.fret;
  }

  var WALKS = {
    across: acrossPass,
    along: alongPass,
    pair: pairPass,
    box: boxPass
  };

  function expand(ex) {
    var notes = [];
    var pass = WALKS[ex.walk] || acrossPass;
    positionsOf(ex).forEach(function (pos) {
      var run = pass(ex, pos);
      notes = notes.concat(ex.andBack ? withReturn(run) : run);
    });
    // These loop forever, so the join back to the start is a real edge: a run
    // that comes home to the note it began on would strike it twice.
    if (notes.length > 1 && same(notes[notes.length - 1], notes[0])) notes.pop();
    return notes;
  }

  var EXERCISES = [
    {
      id: 'spider-1234',
      name: 'The Spider',
      subtitle: '1-2-3-4 across the strings',
      walk: 'across',
      fingers: [1, 2, 3, 4],
      strings: ALL_STRINGS,
      position: { from: 1, to: 5, step: 1 },
      andBack: true,
      bpm: 60,
      note: 'One finger per fret, one note per click. Leave each finger down until you need it again — that is the whole exercise.'
    },
    {
      id: 'spider-1324',
      name: 'Finger Independence',
      subtitle: '1-3-2-4, the awkward order',
      walk: 'across',
      fingers: [1, 3, 2, 4],
      strings: ALL_STRINGS,
      position: { from: 1, to: 3, step: 1 },
      andBack: true,
      bpm: 52,
      note: 'Middle and ring want to move together. This is the drill that teaches them not to. Go slower than feels necessary.'
    },
    {
      id: 'spider-4321',
      name: 'Pinky First',
      subtitle: '4-3-2-1, backwards',
      walk: 'across',
      fingers: [4, 3, 2, 1],
      strings: ALL_STRINGS,
      position: { from: 1, to: 5, step: 1 },
      andBack: true,
      bpm: 52,
      note: 'Planting the pinky first is much harder than landing on it last. Build the weak finger before you need it for barre chords.'
    },
    {
      id: 'spider-skip',
      name: 'String Skipping',
      subtitle: '1-2-3-4, skipping a string',
      walk: 'across',
      fingers: [1, 2, 3, 4],
      strings: [0, 2, 4, 1, 3, 5],
      position: { from: 1, to: 3, step: 1 },
      andBack: true,
      bpm: 55,
      note: 'Same fingers, but the picking hand has to jump. Watch the right hand, not the left.'
    },
    {
      id: 'ladder-e',
      name: 'The Ladder',
      subtitle: 'chromatic up the low E',
      walk: 'along',
      string: 0,
      span: 12,
      position: { from: 1, to: 1 },
      andBack: true,
      bpm: 66,
      note: 'Twelve frets up one string and back. The hand shifts every four frets — keep the thumb behind the neck as it travels.'
    },

    /* ---------- trills: two fingers, on the spot ---------- */
    {
      id: 'trill-34',
      name: 'Ring & Pinky',
      subtitle: '3-4, the weakest pair',
      walk: 'pair',
      pairs: [[3, 4]],
      repeats: 6,
      strings: ALL_STRINGS,
      position: { from: 1, to: 1 },
      bpm: 56,
      note: 'Hammer on and pull off — pick only the first note of each string. The pair no other exercise reaches.'
    },
    {
      id: 'trill-pairs',
      name: 'Finger Pairs',
      subtitle: 'all six two-finger combinations',
      walk: 'pair',
      pairs: [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]],
      repeats: 4,
      strings: ALL_STRINGS,
      position: { from: 1, to: 1 },
      bpm: 60,
      note: 'Every pair your hand can make, worked in turn. The last three are the ones that matter — do not let the tempo carry you through them.'
    },

    /* ---------- pentatonic boxes ----------
     * A minor pentatonic, which is where everyone learns them. The shapes are
     * movable: change `position` and the same fingering is a different key.
     * Offsets are from the box's lowest fret, with the standard fingering.
     */
    {
      id: 'pent-1', category: 'pentatonic',
      scale: 'Am-pentatonic',
      name: 'Pentatonic Box 1', subtitle: 'A minor, 5th fret',
      walk: 'box',
      shape: [
        [[0, 1], [3, 4]],
        [[0, 1], [2, 3]],
        [[0, 1], [2, 3]],
        [[0, 1], [2, 3]],
        [[0, 1], [3, 4]],
        [[0, 1], [3, 4]]
      ],
      position: { from: 5, to: 5 },
      andBack: true,
      bpm: 70,
      note: 'The one everybody learns first. Index sits on the 5th fret the whole way through.'
    },
    {
      id: 'pent-2', category: 'pentatonic',
      scale: 'Am-pentatonic',
      name: 'Pentatonic Box 2', subtitle: 'A minor, 7th fret',
      walk: 'box',
      shape: [
        [[1, 1], [3, 3]],
        [[0, 1], [3, 4]],
        [[0, 1], [3, 4]],
        [[0, 1], [2, 3]],
        [[1, 1], [3, 3]],
        [[1, 1], [3, 3]]
      ],
      position: { from: 7, to: 7 },
      andBack: true,
      bpm: 70,
      note: 'Joins onto box 1 at the top. Learn where the two overlap and the neck starts opening up.'
    },
    {
      id: 'pent-3', category: 'pentatonic',
      scale: 'Am-pentatonic',
      name: 'Pentatonic Box 3', subtitle: 'A minor, 9th fret',
      walk: 'box',
      shape: [
        [[1, 1], [3, 3]],
        [[1, 1], [3, 3]],
        [[1, 1], [3, 3]],
        [[0, 1], [3, 4]],
        [[1, 1], [4, 4]],
        [[1, 1], [3, 3]]
      ],
      position: { from: 9, to: 9 },
      andBack: true,
      bpm: 70,
      note: 'The widest of the five — the B string asks for a real pinky stretch. Take it slowly.'
    },
    {
      id: 'pent-4', category: 'pentatonic',
      scale: 'Am-pentatonic',
      name: 'Pentatonic Box 4', subtitle: 'A minor, 12th fret',
      walk: 'box',
      shape: [
        [[0, 1], [3, 4]],
        [[0, 1], [3, 4]],
        [[0, 1], [2, 3]],
        [[0, 1], [2, 3]],
        [[1, 1], [3, 3]],
        [[0, 1], [3, 4]]
      ],
      position: { from: 12, to: 12 },
      andBack: true,
      bpm: 70,
      note: 'Box 1 an octave up, near enough — the frets are narrow here, so it is the kindest on the stretch.'
    },
    {
      id: 'pent-5', category: 'pentatonic',
      scale: 'Am-pentatonic',
      name: 'Pentatonic Box 5', subtitle: 'A minor, 2nd fret',
      walk: 'box',
      shape: [
        [[1, 1], [3, 3]],
        [[1, 1], [3, 3]],
        [[0, 1], [3, 4]],
        [[0, 1], [3, 4]],
        [[1, 1], [3, 3]],
        [[1, 1], [3, 3]]
      ],
      position: { from: 2, to: 2 },
      andBack: true,
      bpm: 70,
      note: 'Sits just below box 1 and wraps the neck back to the open strings. Widest frets on the guitar — a genuine stretch.'
    }
  ];

  EXERCISES.forEach(function (ex) {
    ex.strings = ex.strings || ALL_STRINGS;
    ex.walk = ex.walk || 'across';
    ex.category = ex.category || 'finger';
    // Accent the click on each string change where that lines up, else plain 4.
    ex.beatsPerBar = ex.beatsPerBar ||
      (ex.walk === 'across' ? ex.fingers.length : 4);
    ex.beatsPerNote = ex.beatsPerNote || 1;
    ex.notes = expand(ex);
    ex.frets = ex.notes.reduce(function (r, n) {
      return { min: Math.min(r.min, n.fret), max: Math.max(r.max, n.fret) };
    }, { min: 99, max: 0 });
  });

  var byId = {};
  EXERCISES.forEach(function (ex) { byId[ex.id] = ex; });

  /* "String 6 · fret 3 · finger 3" - the three things you need to be told. */
  function describe(note) {
    return 'String ' + (6 - note.string) + ' · fret ' + note.fret + ' · finger ' + note.finger;
  }

  CM.exercises = {
    all: EXERCISES,
    stringNames: STRING_NAMES,
    scales: SCALES,
    describe: describe,
    expand: expand,
    byCategory: function (cat) {
      return EXERCISES.filter(function (ex) { return ex.category === cat; });
    },
    get: function (id) {
      var ex = byId[id];
      if (!ex) throw new Error('Unknown exercise: ' + id);
      return ex;
    },
    has: function (id) { return !!byId[id]; }
  };
})(window.CM = window.CM || {});
