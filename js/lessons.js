/* ChordMaster 2 - the 30 day plan
 *
 * Four weeks and change, from "hold one shape" to playing a whole song.
 * Each day is 10-15 minutes of drills, which is short enough to actually do.
 *
 * A drill is one of:
 *   { type: 'random',      chords: [ids], barsPerChord, bpm, minutes, label }
 *   { type: 'progression', progression: id, bpm, minutes, label, sub: {F:'Fmaj7'} }
 *
 * `sub` swaps chords inside a stored progression, so the same I-vi-IV-V can be
 * drilled with the easy Fmaj7 in week 2 and the real barred F in week 4.
 */
(function (CM) {
  'use strict';

  var DAYS = [
    /* ============ WEEK 1 - the open chords ============ */
    {
      day: 1,
      title: 'One Shape, In Time',
      focus: 'E minor',
      brief: 'Em is the friendliest chord on the guitar: two fingers, and all six strings ring. Today is not about changing chords at all — it is about making one chord sound clean and landing your strum on the beat. Press just behind the fret, not on top of it.',
      newChords: ['Em'],
      drills: [
        { type: 'random', label: 'Hold Em, strum on every beat', chords: ['Em'], barsPerChord: 2, bpm: 60, minutes: 4 },
        { type: 'random', label: 'Lift off, replace, strum', chords: ['Em'], barsPerChord: 1, bpm: 60, minutes: 4 }
      ]
    },
    {
      day: 2,
      title: 'Your First Change',
      focus: 'A minor, and Em → Am',
      brief: 'Am is Em with the same two fingers moved down one string, plus your index on the B string. That is the whole trick. Move all your fingers as one block instead of placing them one at a time — that block movement is what changing chords actually is.',
      newChords: ['Am'],
      drills: [
        { type: 'random', label: 'Meet Am', chords: ['Am'], barsPerChord: 2, bpm: 60, minutes: 3 },
        { type: 'progression', label: 'Em to Am, two bars each', progression: 'em-am', bpm: 60, minutes: 5 },
        { type: 'random', label: 'Random: Em or Am', chords: ['Em', 'Am'], barsPerChord: 2, bpm: 60, minutes: 3 }
      ]
    },
    {
      day: 3,
      title: 'Four Strings Only',
      focus: 'D major',
      brief: 'D is a compact triangle on the top four strings, and your strumming hand has to learn to leave the low strings alone. If it sounds muddy, you are hitting the E and A strings — aim smaller.',
      newChords: ['D'],
      drills: [
        { type: 'random', label: 'Meet D', chords: ['D'], barsPerChord: 2, bpm: 60, minutes: 3 },
        { type: 'random', label: 'Em, Am, D', chords: ['Em', 'Am', 'D'], barsPerChord: 2, bpm: 60, minutes: 5 },
        { type: 'random', label: 'Same three, one bar each', chords: ['Em', 'Am', 'D'], barsPerChord: 1, bpm: 64, minutes: 3 }
      ]
    },
    {
      day: 4,
      title: 'The Shape You Already Know',
      focus: 'E major',
      brief: 'E major is the Am shape moved up one string. Learn Am and E as a pair and you get two chords for the price of one. This is also the shape the F barre chord is built from, so time spent here pays off in week three.',
      newChords: ['E'],
      drills: [
        { type: 'random', label: 'Meet E', chords: ['E'], barsPerChord: 2, bpm: 60, minutes: 3 },
        { type: 'random', label: 'Am to E, the same fingers', chords: ['Am', 'E'], barsPerChord: 1, bpm: 60, minutes: 4 },
        { type: 'random', label: 'Everything so far', chords: ['Em', 'Am', 'D', 'E'], barsPerChord: 2, bpm: 64, minutes: 4 }
      ]
    },
    {
      day: 5,
      title: 'Three Fingers In A Row',
      focus: 'A major, and your first I–IV–V',
      brief: 'A major crams three fingers into one fret. Curl them so the high E still rings — that is the hard part. With A, D and E you now have a complete key, which is enough for a huge amount of blues, folk and rock.',
      newChords: ['A'],
      drills: [
        { type: 'random', label: 'Meet A', chords: ['A'], barsPerChord: 2, bpm: 60, minutes: 3 },
        { type: 'progression', label: 'D to A', progression: 'd-a', bpm: 62, minutes: 3 },
        { type: 'progression', label: 'One–four–five in A', progression: 'onefourfive-A', bpm: 62, minutes: 5 }
      ]
    },
    {
      day: 6,
      title: 'The Long Reach',
      focus: 'G major',
      brief: 'G stretches across the whole neck and feels wrong for about a week, then suddenly feels like home. Plant your ring finger on the high E first and build the shape around it — that anchor makes the change in and out of G far quicker.',
      newChords: ['G'],
      drills: [
        { type: 'random', label: 'Meet G', chords: ['G'], barsPerChord: 2, bpm: 60, minutes: 4 },
        { type: 'random', label: 'G, Em, D', chords: ['G', 'Em', 'D'], barsPerChord: 2, bpm: 62, minutes: 4 },
        { type: 'random', label: 'All six chords', chords: ['Em', 'Am', 'D', 'E', 'A', 'G'], barsPerChord: 2, bpm: 62, minutes: 4 }
      ]
    },
    {
      day: 7,
      title: 'Week One Finish Line',
      focus: 'C major, and the G ↔ C pivot',
      brief: 'C is the last of the core open chords. Going from G to C, your ring finger stays on the third fret — pivot around it instead of lifting the whole hand. Then take stock: a week ago you had none of these.',
      newChords: ['C'],
      drills: [
        { type: 'random', label: 'Meet C', chords: ['C'], barsPerChord: 2, bpm: 60, minutes: 3 },
        { type: 'progression', label: 'G to C, pivot on the ring finger', progression: 'g-c', bpm: 62, minutes: 4 },
        { type: 'random', label: 'All seven, at random', chords: ['Em', 'Am', 'D', 'E', 'A', 'G', 'C'], barsPerChord: 2, bpm: 64, minutes: 5 }
      ]
    },

    /* ============ WEEK 2 - changes become progressions ============ */
    {
      day: 8,
      title: 'Speed Is Just Accuracy Repeated',
      focus: 'Clean changes under pressure',
      brief: 'No new chords today. One bar per chord means you get four beats to land the next shape, which is much less time than it sounds. If a change is consistently late, slow the tempo down rather than accepting a mush — you are training a habit either way, so train the right one.',
      newChords: [],
      drills: [
        { type: 'random', label: 'One bar each, all seven', chords: ['Em', 'Am', 'D', 'E', 'A', 'G', 'C'], barsPerChord: 1, bpm: 60, minutes: 5 },
        { type: 'random', label: 'Same again, a notch faster', chords: ['Em', 'Am', 'D', 'E', 'A', 'G', 'C'], barsPerChord: 1, bpm: 72, minutes: 5 },
        { type: 'progression', label: 'One–four–five in G', progression: 'onefourfive-G', bpm: 72, minutes: 4 }
      ]
    },
    {
      day: 9,
      title: 'The Four Chords',
      focus: 'I – V – vi – IV in G',
      brief: 'G, D, Em, C. This progression is behind a genuinely absurd number of pop songs, and you can already play all four shapes. Today it stops being four separate chords and becomes one repeating thing your hands know.',
      newChords: [],
      drills: [
        { type: 'progression', label: 'The four chords, slow', progression: 'pop-G', bpm: 64, minutes: 5 },
        { type: 'progression', label: 'Again, with a bit of push', progression: 'pop-G', bpm: 78, minutes: 5 },
        { type: 'random', label: 'Shuffle those four', chords: ['G', 'D', 'Em', 'C'], barsPerChord: 1, bpm: 72, minutes: 4 }
      ]
    },
    {
      day: 10,
      title: 'The Other Minor',
      focus: 'D minor',
      brief: 'Dm is D major with the top finger dropped a fret, and it is the saddest sound you have learned so far. It is also a four-string chord, so the same "aim smaller" discipline from day three applies.',
      newChords: ['Dm'],
      drills: [
        { type: 'random', label: 'Meet Dm', chords: ['Dm'], barsPerChord: 2, bpm: 62, minutes: 3 },
        { type: 'progression', label: 'Am to Dm', progression: 'am-dm', bpm: 66, minutes: 4 },
        { type: 'random', label: 'All three minors plus C and G', chords: ['Em', 'Am', 'Dm', 'C', 'G'], barsPerChord: 1, bpm: 70, minutes: 5 }
      ]
    },
    {
      day: 11,
      title: 'Dodging The F',
      focus: 'Fmaj7, and the doo-wop progression',
      brief: 'Real F needs a barre, which you are not doing yet. Fmaj7 gets you an F-shaped sound with three fingers and no barre, and it is a legitimate substitute in most songs. Use it now, learn the real thing in week three.',
      newChords: ['Fmaj7'],
      drills: [
        { type: 'random', label: 'Meet Fmaj7', chords: ['Fmaj7'], barsPerChord: 2, bpm: 62, minutes: 3 },
        { type: 'progression', label: 'Doo-wop, with the easy F', progression: 'doowop', sub: { F: 'Fmaj7' }, bpm: 66, minutes: 5 },
        { type: 'progression', label: 'The four chords in C', progression: 'pop-C', sub: { F: 'Fmaj7' }, bpm: 70, minutes: 5 }
      ]
    },
    {
      day: 12,
      title: 'Same Chords, Different Feeling',
      focus: 'vi – IV – I – V',
      brief: 'Am, F, C, G uses exactly the same four chords as yesterday, just starting somewhere else in the circle. It sounds completely different. That is the single most useful thing to understand about progressions: order carries the emotion.',
      newChords: [],
      drills: [
        { type: 'progression', label: 'The sad version', progression: 'axis-Am', sub: { F: 'Fmaj7' }, bpm: 66, minutes: 5 },
        { type: 'progression', label: 'The happy version, back to back', progression: 'pop-C', sub: { F: 'Fmaj7' }, bpm: 66, minutes: 5 },
        { type: 'random', label: 'Shuffle the four', chords: ['Am', 'Fmaj7', 'C', 'G'], barsPerChord: 1, bpm: 74, minutes: 4 }
      ]
    },
    {
      day: 13,
      title: 'Turn It Up',
      focus: 'The same progressions, faster',
      brief: 'Today is pure tempo work on ground you already hold. Push until the changes start to fray, drop back a step, and stay there. The edge of your ability is the only place practice does much.',
      newChords: [],
      drills: [
        { type: 'progression', label: 'Four chords, brisk', progression: 'pop-G', bpm: 88, minutes: 4 },
        { type: 'progression', label: 'Sad version, brisk', progression: 'axis-Am', sub: { F: 'Fmaj7' }, bpm: 84, minutes: 4 },
        { type: 'progression', label: 'Doo-wop, brisk', progression: 'doowop', sub: { F: 'Fmaj7' }, bpm: 84, minutes: 4 }
      ]
    },
    {
      day: 14,
      title: 'Two Weeks In',
      focus: 'Everything so far',
      brief: 'Nine shapes and four progressions. Today is a straight review with no new material — a full random shuffle at one bar each is the honest test of where you actually are. Then play an actual song, because you can: When the Saints needs only G, C and D.',
      newChords: [],
      drills: [
        { type: 'random', label: 'The full deck', chords: ['Em', 'Am', 'Dm', 'D', 'E', 'A', 'G', 'C', 'Fmaj7'], barsPerChord: 1, bpm: 72, minutes: 5 },
        { type: 'progression', label: 'Four chords in G', progression: 'pop-G', bpm: 80, minutes: 4 },
        { type: 'progression', label: 'When the Saints Go Marching In', progression: 'saints', bpm: 84, minutes: 5 }
      ]
    },

    /* ============ WEEK 3 - sevenths, blues, and the barre ============ */
    {
      day: 15,
      title: 'The Blues Chords',
      focus: 'E7 and A7',
      brief: 'Sevenths are the chords that sound restless — they want to move somewhere. Both of today\'s are easier than their plain versions: E7 is E with a finger lifted, A7 is A with a finger lifted.',
      newChords: ['E7', 'A7'],
      drills: [
        { type: 'random', label: 'Meet E7 and A7', chords: ['E7', 'A7'], barsPerChord: 2, bpm: 66, minutes: 4 },
        { type: 'random', label: 'Plain against seventh', chords: ['E', 'E7', 'A', 'A7'], barsPerChord: 1, bpm: 70, minutes: 5 },
        { type: 'progression', label: 'E to A — the blues change', progression: 'e-a', bpm: 80, minutes: 4 }
      ]
    },
    {
      day: 16,
      title: 'The Rest Of The Sevenths',
      focus: 'D7, G7 and C7',
      brief: 'G7 is the most useful chord you will learn this week: it pulls towards C so strongly that your ear expects it. Play G7 then C a few times and listen to how badly it wants to land. C7 does the same job pointing at F.',
      newChords: ['D7', 'G7', 'C7', 'Am7'],
      drills: [
        { type: 'random', label: 'Meet D7, G7 and C7', chords: ['D7', 'G7', 'C7'], barsPerChord: 2, bpm: 66, minutes: 4 },
        { type: 'random', label: 'G7 falling to C', chords: ['G7', 'C'], barsPerChord: 1, bpm: 72, minutes: 4 },
        { type: 'random', label: 'Every seventh so far', chords: ['E7', 'A7', 'D7', 'G7', 'C7', 'Am7'], barsPerChord: 1, bpm: 74, minutes: 5 }
      ]
    },
    {
      day: 17,
      title: 'Twelve Bars',
      focus: 'The blues in A',
      brief: 'Three chords, twelve bars, and a form that has carried a century of music. Count the bars as you go — the whole point is knowing where you are without thinking. The last bar is the turnaround that throws you back to the top.',
      newChords: [],
      drills: [
        { type: 'progression', label: '12-bar blues, slow', progression: 'blues-A', bpm: 62, minutes: 6 },
        { type: 'progression', label: '12-bar blues, walking', progression: 'blues-A', bpm: 82, minutes: 6 }
      ]
    },
    {
      day: 18,
      title: 'The Guitar Key',
      focus: 'B7, and the blues in E',
      brief: 'E is where the blues sits best on a guitar, because the open low strings ring underneath everything. B7 is four fingers and awkward for a day or two, but it is far kinder than a full B barre chord.',
      newChords: ['B7'],
      drills: [
        { type: 'random', label: 'Meet B7', chords: ['B7'], barsPerChord: 2, bpm: 64, minutes: 4 },
        { type: 'progression', label: '12-bar blues in E', progression: 'blues-E', bpm: 66, minutes: 6 },
        { type: 'progression', label: 'Again, walking', progression: 'blues-E', bpm: 84, minutes: 4 }
      ]
    },
    {
      day: 19,
      title: 'The Strongest Ending',
      focus: 'ii – V – I',
      brief: 'Dm, G7, C. This is the most final-sounding move in Western music and the backbone of jazz. Hear how G7 refuses to sit still and C answers it — once you notice that pull you will hear it everywhere.',
      newChords: [],
      drills: [
        { type: 'progression', label: 'Two–five–one, slow', progression: 'twofiveone', bpm: 66, minutes: 5 },
        { type: 'progression', label: 'Two–five–one, brisk', progression: 'twofiveone', bpm: 86, minutes: 4 },
        { type: 'random', label: 'Minors and sevenths shuffled', chords: ['Dm', 'Am', 'Em', 'G7', 'C7', 'D7'], barsPerChord: 1, bpm: 76, minutes: 5 }
      ]
    },
    {
      day: 20,
      title: 'Half A Barre',
      focus: 'F on four strings',
      brief: 'Today your index finger flattens across two strings for the first time. Roll it slightly onto its bony outside edge rather than the soft pad, and drop your thumb down behind the neck. Four strings today, all six tomorrow.',
      newChords: ['Fmini', 'Dm7'],
      drills: [
        { type: 'random', label: 'Dm7 — a two-string barre', chords: ['Dm7'], barsPerChord: 2, bpm: 64, minutes: 3 },
        { type: 'random', label: 'Meet the mini F', chords: ['Fmini'], barsPerChord: 2, bpm: 62, minutes: 4 },
        { type: 'random', label: 'C to mini F and back', chords: ['C', 'Fmini'], barsPerChord: 1, bpm: 66, minutes: 5 }
      ]
    },
    {
      day: 21,
      title: 'The Real F',
      focus: 'The full barre chord',
      brief: 'All six strings under one barre. Expect it to buzz today — everyone\'s does. Squeezing harder is not the fix: thumb low and centred behind the neck, index rolled onto its edge, elbow tucked in. Two minutes at a time, then shake it out.',
      newChords: ['F'],
      drills: [
        { type: 'random', label: 'Meet F — short bursts', chords: ['F'], barsPerChord: 2, bpm: 58, minutes: 4 },
        { type: 'random', label: 'F against the easy versions', chords: ['F', 'Fmini', 'Fmaj7'], barsPerChord: 2, bpm: 62, minutes: 4 },
        { type: 'random', label: 'Rest the hand — open chords only', chords: ['G', 'Em', 'C', 'D', 'Am'], barsPerChord: 1, bpm: 80, minutes: 4 }
      ]
    },

    /* ============ WEEK 4 - barres in context, and a song ============ */
    {
      day: 22,
      title: 'F In The Wild',
      focus: 'The four chords in C, for real',
      brief: 'C, G, Am, F with the actual barred F this time. Getting to F cleanly from Am is the change to drill — your index is already near the first fret, so it is a smaller move than it feels.',
      newChords: [],
      drills: [
        { type: 'random', label: 'Am to F', chords: ['Am', 'F'], barsPerChord: 1, bpm: 60, minutes: 4 },
        { type: 'progression', label: 'Four chords in C, with real F', progression: 'pop-C', bpm: 64, minutes: 5 },
        { type: 'progression', label: 'The sad version, with real F', progression: 'axis-Am', bpm: 68, minutes: 5 }
      ]
    },
    {
      day: 23,
      title: 'The Chord Everyone Quits Over',
      focus: 'B minor',
      brief: 'Bm is the Am shape barred at the second fret, where the strings are a little more forgiving than at the first. Skip the low E entirely. If you have F, you have most of this already.',
      newChords: ['Bm'],
      drills: [
        { type: 'random', label: 'Meet Bm', chords: ['Bm'], barsPerChord: 2, bpm: 60, minutes: 4 },
        { type: 'random', label: 'Bm against Am and F', chords: ['Am', 'Bm', 'F'], barsPerChord: 2, bpm: 64, minutes: 5 },
        { type: 'random', label: 'Open-chord rest', chords: ['G', 'D', 'Em', 'C'], barsPerChord: 1, bpm: 84, minutes: 4 }
      ]
    },
    {
      day: 24,
      title: 'One Shape, Whole Neck',
      focus: 'G minor, and moving a barre',
      brief: 'Gm is Fm slid up two frets — and that is the real prize of barre chords. One shape, moved, gives you every chord of that type. Cm is Bm moved up one, and B is the same A-shape barre you meet today. Learn four shapes and you own the whole neck.',
      newChords: ['Fm', 'Gm', 'Cm', 'B'],
      drills: [
        { type: 'random', label: 'Fm and Gm — the same shape moved', chords: ['Fm', 'Gm'], barsPerChord: 2, bpm: 58, minutes: 4 },
        { type: 'random', label: 'Bm to Cm — slide up one fret', chords: ['Bm', 'Cm', 'B'], barsPerChord: 2, bpm: 58, minutes: 4 },
        { type: 'progression', label: 'Barre endurance drill', progression: 'barre-drill', bpm: 58, minutes: 5 },
        { type: 'random', label: 'Shake it out — open chords', chords: ['Em', 'Am', 'G', 'C', 'D'], barsPerChord: 1, bpm: 84, minutes: 3 }
      ]
    },
    {
      day: 25,
      title: 'The Dramatic Descent',
      focus: 'The Andalusian cadence',
      brief: 'Am, G, F, E. Flamenco, surf rock, and every song that sounds like something bad is about to happen. Notice it ends on E rather than resolving home to Am — that unfinished feeling is exactly why it loops so well.',
      newChords: [],
      drills: [
        { type: 'progression', label: 'Andalusian, slow', progression: 'andalusian', bpm: 62, minutes: 5 },
        { type: 'progression', label: 'Andalusian, at pace', progression: 'andalusian', bpm: 82, minutes: 5 },
        { type: 'random', label: 'Those four, shuffled', chords: ['Am', 'G', 'F', 'E'], barsPerChord: 1, bpm: 76, minutes: 4 }
      ]
    },
    {
      day: 26,
      title: 'The Pretty Trick',
      focus: 'Cadd9, G/B, and a walking bass',
      brief: 'Keep your ring finger and pinky planted on the top two strings and you can slide between G, Cadd9 and Em7 barely moving. G/B is the passing chord that walks the bass down instead of jumping. The suspended chords do the same job the other way — add or lift one finger and a plain chord suddenly has movement in it.',
      newChords: ['Cadd9', 'G/B', 'Em7', 'Dsus4', 'Dsus2', 'Asus2', 'Asus4', 'Esus4'],
      drills: [
        { type: 'random', label: 'G to Cadd9, anchored fingers', chords: ['G', 'Cadd9'], barsPerChord: 1, bpm: 70, minutes: 3 },
        { type: 'progression', label: 'Descending bass line', progression: 'canon-lite', bpm: 68, minutes: 4 },
        { type: 'random', label: 'Suspensions — add and lift one finger', chords: ['D', 'Dsus4', 'Dsus2', 'A', 'Asus4', 'Asus2', 'E', 'Esus4'], barsPerChord: 1, bpm: 72, minutes: 4 },
        { type: 'progression', label: 'Amazing Grace — a waltz, counted in 3', progression: 'amazing-grace', bpm: 90, minutes: 4 }
      ]
    },
    {
      day: 27,
      title: 'Tempo Day',
      focus: 'Everything, faster',
      brief: 'No new shapes. Take three progressions you know and push each one until it breaks, then settle a step below. Compare it to day eight — that is a fair measure of three weeks.',
      newChords: [],
      drills: [
        { type: 'progression', label: 'Four chords, quick', progression: 'pop-G', bpm: 96, minutes: 4 },
        { type: 'progression', label: '12-bar blues, quick', progression: 'blues-A', bpm: 96, minutes: 4 },
        { type: 'progression', label: 'Doo-wop, quick', progression: 'doowop', bpm: 92, minutes: 4 },
        { type: 'random', label: 'Everything, one bar each', chords: ['G', 'C', 'D', 'Em', 'Am', 'Dm', 'A', 'E', 'F', 'Bm'], barsPerChord: 1, bpm: 76, minutes: 4 }
      ]
    },
    {
      day: 28,
      title: 'Learning The Parts',
      focus: 'The chords of the song',
      brief: 'The song is House of the Rising Sun, and you already have every chord in it: Am, C, D, F, E. Today you drill only the changes it needs, in the order it needs them, without worrying about the rhythm yet.',
      newChords: [],
      drills: [
        { type: 'random', label: 'First half: Am C D F', chords: ['Am', 'C', 'D', 'F'], barsPerChord: 1, bpm: 62, minutes: 5 },
        { type: 'random', label: 'Second half: Am C E', chords: ['Am', 'C', 'E'], barsPerChord: 1, bpm: 66, minutes: 4 },
        { type: 'random', label: 'The hard one: D straight to F', chords: ['D', 'F'], barsPerChord: 1, bpm: 58, minutes: 4 }
      ]
    },
    {
      day: 29,
      title: 'Counting In Six',
      focus: 'The whole song, slowly',
      brief: 'This one is counted in six, not four — one, two, three, four, five, six per chord. It rolls rather than marches. Play it slow enough that every change lands, because the tempo will come on its own.',
      newChords: [],
      drills: [
        { type: 'progression', label: 'House of the Rising Sun, very slow', progression: 'rising-sun', bpm: 92, minutes: 6 },
        { type: 'progression', label: 'Again, a little quicker', progression: 'rising-sun', bpm: 112, minutes: 6 }
      ]
    },
    {
      day: 30,
      title: 'Play The Song',
      focus: 'House of the Rising Sun, at tempo',
      brief: 'Thirty days ago you could not hold one chord. Today: a full song, in six, with a barre chord in it. Play it through, then take a victory lap through the progressions that got you here.',
      newChords: [],
      drills: [
        { type: 'progression', label: 'The song, at tempo', progression: 'rising-sun', bpm: 132, minutes: 6 },
        { type: 'progression', label: 'Victory lap: the four chords', progression: 'pop-G', bpm: 96, minutes: 3 },
        { type: 'progression', label: 'Victory lap: the blues', progression: 'blues-A', bpm: 96, minutes: 3 },
        { type: 'progression', label: 'One more time, the song', progression: 'rising-sun', bpm: 132, minutes: 4 }
      ]
    }
  ];

  /* Total minutes and the running set of chords known by each day. */
  var known = [];
  DAYS.forEach(function (d) {
    d.minutes = d.drills.reduce(function (sum, dr) { return sum + dr.minutes; }, 0);
    d.newChords.forEach(function (id) {
      if (known.indexOf(id) === -1) known.push(id);
    });
    d.knownChords = known.slice();
    d.week = Math.ceil(d.day / 7);
  });

  /* Apply a drill's chord substitutions to a progression's bars. */
  function drillBars(drill) {
    var prog = CM.progressions.get(drill.progression);
    var sub = drill.sub || {};
    return {
      progression: prog,
      bars: prog.bars.map(function (b) {
        return { chord: sub[b.chord] || b.chord, beats: b.beats };
      })
    };
  }

  CM.lessons = {
    days: DAYS,
    total: DAYS.length,
    get: function (day) {
      return DAYS[Math.max(0, Math.min(DAYS.length - 1, day - 1))];
    },
    drillBars: drillBars
  };
})(window.CM = window.CM || {});
