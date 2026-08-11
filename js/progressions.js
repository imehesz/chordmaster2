/* ChordMaster 2 - chord progressions
 *
 * A progression is a list of bars. Each bar names a chord and how many beats
 * it lasts, so the trainer can advance in time with the metronome instead of
 * on a plain wall-clock timer.
 *
 * Songs here are traditional / public domain. A song may carry a `lyrics`
 * array: one short phrase per bar, exactly as long as `bars`, so the words on
 * screen follow the bar counter rather than the chord (a chord can hold across
 * two lines). An empty string is an instrumental bar. Still no tab.
 *
 * The lines below are placeholders - fill them in bar by bar. tools/validate.js
 * checks the array length against the bars, so a mis-split shows up there.
 */
(function (CM) {
  'use strict';

  function bars(spec, beats) {
    // "G D Em C" -> four bars of `beats` each. Use "G:8" to override one bar.
    return spec.trim().split(/\s+/).map(function (tok) {
      var parts = tok.split(':');
      return { chord: parts[0], beats: parts[1] ? Number(parts[1]) : beats };
    });
  }

  var PROGRESSIONS = [
    /* ---------- two-chord starters ---------- */
    {
      id: 'em-am', name: 'Em to Am', subtitle: 'Your first change', key: 'Am',
      category: 'starter', numerals: ['v', 'i'], beatsPerBar: 4,
      bars: bars('Em Am', 4),
      note: 'Two fingers each. The middle and ring finger just slide down one string.'
    },
    {
      id: 'g-c', name: 'G to C', subtitle: 'The workhorse change', key: 'G',
      category: 'starter', numerals: ['I', 'IV'], beatsPerBar: 4,
      bars: bars('G C', 4),
      note: 'Keep your ring finger on the same fret and pivot around it.'
    },
    {
      id: 'am-dm', name: 'Am to Dm', subtitle: 'Minor pair', key: 'Am',
      category: 'starter', numerals: ['i', 'iv'], beatsPerBar: 4,
      bars: bars('Am Dm', 4),
      note: 'The whole shape shifts down one string and over one fret.'
    },
    {
      id: 'd-a', name: 'D to A', subtitle: 'Bright pair', key: 'A',
      category: 'starter', numerals: ['IV', 'I'], beatsPerBar: 4,
      bars: bars('D A', 4),
      note: 'Both are four-string chords. Watch that the low strings stay quiet.'
    },
    {
      id: 'e-a', name: 'E to A', subtitle: 'Blues pair', key: 'A',
      category: 'starter', numerals: ['V', 'I'], beatsPerBar: 4,
      bars: bars('E A', 4),
      note: 'Same three fingers, shifted down one string. Move them as one block.'
    },

    /* ---------- core progressions ---------- */
    {
      id: 'pop-G', name: 'The Four Chords', subtitle: 'I – V – vi – IV in G', key: 'G',
      category: 'core', numerals: ['I', 'V', 'vi', 'IV'], beatsPerBar: 4,
      bars: bars('G D Em C', 4),
      note: 'An enormous share of pop songs live here. Learn it once, play hundreds.'
    },
    {
      id: 'pop-C', name: 'The Four Chords in C', subtitle: 'I – V – vi – IV in C', key: 'C',
      category: 'core', numerals: ['I', 'V', 'vi', 'IV'], beatsPerBar: 4,
      bars: bars('C G Am F', 4),
      note: 'The same progression in a key that makes you deal with F.'
    },
    {
      id: 'axis-Am', name: 'The Sad Version', subtitle: 'vi – IV – I – V in C', key: 'C',
      category: 'core', numerals: ['vi', 'IV', 'I', 'V'], beatsPerBar: 4,
      bars: bars('Am F C G', 4),
      note: 'The same four chords starting on the minor. Same notes, completely different mood.'
    },
    {
      id: 'doowop', name: 'Doo-Wop', subtitle: 'I – vi – IV – V in C', key: 'C',
      category: 'core', numerals: ['I', 'vi', 'IV', 'V'], beatsPerBar: 4,
      bars: bars('C Am F G', 4),
      note: 'Every slow dance from 1955. Also known as the "50s progression".'
    },
    {
      id: 'onefourfive-G', name: 'One Four Five', subtitle: 'I – IV – V in G', key: 'G',
      category: 'core', numerals: ['I', 'IV', 'V'], beatsPerBar: 4,
      bars: bars('G:8 C:4 D:4', 4),
      note: 'The backbone of folk, country and rock and roll.'
    },
    {
      id: 'onefourfive-A', name: 'One Four Five in A', subtitle: 'I – IV – V in A', key: 'A',
      category: 'core', numerals: ['I', 'IV', 'V'], beatsPerBar: 4,
      bars: bars('A:8 D:4 E:4', 4),
      note: 'Same idea, open A shapes. This is the doorway to the blues.'
    },
    {
      id: 'twofiveone', name: 'Two Five One', subtitle: 'ii – V – I in C', key: 'C',
      category: 'core', numerals: ['ii', 'V', 'I'], beatsPerBar: 4,
      bars: bars('Dm G7 C:8', 4),
      note: 'The strongest resolution in Western music, and the heart of jazz.'
    },
    {
      id: 'andalusian', name: 'Andalusian Cadence', subtitle: 'i – VII – VI – V in Am', key: 'Am',
      category: 'core', numerals: ['i', 'VII', 'VI', 'V'], beatsPerBar: 4,
      bars: bars('Am G F E', 4),
      note: 'Flamenco, surf rock and every dramatic descent. Ends on E, not Am — that is what keeps it moving.'
    },
    {
      id: 'canon-lite', name: 'Descending Bass', subtitle: 'I – V – vi – I/5 – IV in C', key: 'C',
      category: 'core', numerals: ['I', 'V', 'vi', 'IV'], beatsPerBar: 4,
      bars: bars('C G Am G/B F', 4),
      note: 'G/B is the glue: it walks the bass down C – B – A instead of jumping.'
    },
    {
      id: 'blues-A', name: '12-Bar Blues', subtitle: 'in A, with sevenths', key: 'A',
      category: 'core', numerals: ['I7', 'IV7', 'V7'], beatsPerBar: 4,
      bars: bars('A7 A7 A7 A7 D7 D7 A7 A7 E7 D7 A7 E7', 4),
      note: 'Twelve bars, three chords, a hundred years of music. The last bar turns it around.'
    },
    {
      id: 'blues-E', name: '12-Bar Blues in E', subtitle: 'the guitar key', key: 'E',
      category: 'core', numerals: ['I7', 'IV7', 'V7'], beatsPerBar: 4,
      bars: bars('E7 E7 E7 E7 A7 A7 E7 E7 B7 A7 E7 B7', 4),
      note: 'E is where the blues sits best on a guitar — open low strings ring under everything.'
    },
    {
      id: 'barre-drill', name: 'Barre Chord Drill', subtitle: 'moving one shape', key: 'F',
      category: 'core', numerals: ['I', 'ii', 'iii', 'IV'], beatsPerBar: 4,
      bars: bars('F Gm Am Bm', 4),
      note: 'Four barre chords in a row. Slow it right down — this one is about endurance.'
    },

    /* ---------- traditional songs (public domain) ---------- */
    {
      id: 'rising-sun', name: 'House of the Rising Sun', subtitle: 'traditional folk ballad', key: 'Am',
      category: 'song', numerals: [], beatsPerBar: 6,
      bars: bars('Am C D F Am C E E', 6),
      lyrics: [
        '…', // Am
        '…', // C
        '…', // D
        '…', // F
        '…', // Am
        '…', // C
        '…', // E
        '…'  // E
      ],
      note: 'Counted in 6. Eight bars, then it repeats. The F is the only hard one — Fmaj7 works if you need it.'
    },
    {
      id: 'saints', name: 'When the Saints Go Marching In', subtitle: 'traditional', key: 'G',
      category: 'song', numerals: [], beatsPerBar: 4,
      bars: bars('G G G G G C C G G D D G', 4),
      lyrics: [
        '…', // G
        '…', // G
        '…', // G
        '…', // G
        '…', // G
        '…', // C
        '…', // C
        '…', // G
        '…', // G
        '…', // D
        '…', // D
        '…'  // G
      ],
      note: 'Three chords, twelve bars, and it moves. Good first song to play with someone else.'
    },
    {
      id: 'amazing-grace', name: 'Amazing Grace', subtitle: 'traditional, in 3', key: 'G',
      category: 'song', numerals: [], beatsPerBar: 3,
      bars: bars('G G C G G D G G', 3),
      lyrics: [
        '…', // G
        '…', // G
        '…', // C
        '…', // G
        '…', // G
        '…', // D
        '…', // G
        '…'  // G
      ],
      note: 'A waltz — count 1-2-3. Simplified to one chord per bar.'
    }
  ];

  /* Derive the distinct chord list and total beats for each progression. */
  PROGRESSIONS.forEach(function (p) {
    // A short lyrics array would silently pin the words to the wrong bar, so
    // treat a mismatched one as absent rather than half-showing it.
    p.hasLyrics = !!(p.lyrics && p.lyrics.length === p.bars.length);
    var seen = {};
    p.chords = [];
    p.totalBeats = 0;
    p.bars.forEach(function (b) {
      p.totalBeats += b.beats;
      if (!seen[b.chord]) { seen[b.chord] = true; p.chords.push(b.chord); }
    });
    p.hardest = p.chords.reduce(function (max, id) {
      return CM.chords.has(id) ? Math.max(max, CM.chords.get(id).difficulty) : max;
    }, 1);
  });

  var byId = {};
  PROGRESSIONS.forEach(function (p) { byId[p.id] = p; });

  CM.progressions = {
    all: PROGRESSIONS,
    get: function (id) {
      var p = byId[id];
      if (!p) throw new Error('Unknown progression: ' + id);
      return p;
    },
    has: function (id) { return !!byId[id]; },
    byCategory: function (cat) {
      return PROGRESSIONS.filter(function (p) { return p.category === cat; });
    }
  };
})(window.CM = window.CM || {});
