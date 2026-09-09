/* ChordMaster 2 - circle of fifths
 *
 * The wheel every guitar teacher draws on a napkin, generated from data like
 * everything else here: twelve slots, each a fifth clockwise from the last,
 * majors on the outer ring and their relative minors on the inner one.
 *
 * The layout is not decoration - it is the lookup table. A key's six chords
 * are its own slot plus its two neighbours, on both rings:
 *
 *        IV  I  V        <- outer, majors
 *        ii  vi iii      <- inner, relative minors
 *
 * so picking a key is one bit of index arithmetic and the highlight is always
 * a contiguous slice. Like diagram.js it is inline SVG whose every colour is a
 * CSS custom property, so it themes and scales without a second set of assets.
 */
(function (CM) {
  'use strict';

  /* Clockwise from the top. `alt` is the enharmonic spelling of the same slot:
     F#/Gb and Db/C# are one key each, written two ways depending on which side
     of the wheel you arrived from. `altIs` says which side the alt belongs to. */
  var SLOTS = [
    { maj: 'C',  min: 'Am',  sig: 'no sharps or flats' },
    { maj: 'G',  min: 'Em',  sig: '1 sharp' },
    { maj: 'D',  min: 'Bm',  sig: '2 sharps' },
    { maj: 'A',  min: 'F#m', sig: '3 sharps' },
    { maj: 'E',  min: 'C#m', sig: '4 sharps' },
    { maj: 'B',  min: 'G#m', sig: '5 sharps' },
    { maj: 'F#', min: 'D#m', sig: '6 sharps', alt: 'Gb', altMin: 'Ebm', altIs: 'flat' },
    { maj: 'Db', min: 'Bbm', sig: '5 flats',  alt: 'C#', altMin: 'A#m', altIs: 'sharp' },
    { maj: 'Ab', min: 'Fm',  sig: '4 flats' },
    { maj: 'Eb', min: 'Cm',  sig: '3 flats' },
    { maj: 'Bb', min: 'Gm',  sig: '2 flats' },
    { maj: 'F',  min: 'Dm',  sig: '1 flat' }
  ];

  // Geometry, in viewBox units.
  var CX = 120, CY = 120;
  var R_OUT = 116;   // outside of the major ring
  var R_MID = 82;    // where majors end and minors begin
  var R_IN = 50;     // inside of the minor ring - the hub
  var SPAN = 30;     // degrees per slot
  var GAP = 1.5;     // trimmed off each side so the wedges do not touch

  var W = 240, H = 240;

  /* A key needs at least this many of its six chords in the library before it
     is worth practising. The far side of the wheel falls short - those keys
     are still drawn, because leaving them out would not be a circle of fifths
     any more, but they cannot be picked. */
  var MIN_CHORDS = 3;

  function at(i) { return SLOTS[((i % 12) + 12) % 12]; }

  /* The spelling of slot i as seen from a sharp key or a flat one. */
  function nameAt(i, sharpSide, tier) {
    var s = at(i);
    var useAlt = s.alt && ((s.altIs === 'sharp') === sharpSide);
    if (tier === 'min') return useAlt ? s.altMin : s.min;
    return useAlt ? s.alt : s.maj;
  }

  /* Chord names carry # and b so they can be looked up in the library; only
     the screen gets the proper glyphs. */
  function pretty(name) {
    return name.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭');
  }

  function libraryId(name) {
    return CM.chords.has(name) ? name : null;
  }

  /**
   * key(slot, tier) -> everything about one of the 24 keys
   *   name    'C major'
   *   sig     'no sharps or flats'
   *   chords  [{ degree, name, id }] in scale-degree order, id null when the
   *           chord library has no shape for it
   *   ids     the ids that do exist, ready to be a practice pool
   */
  function key(slot, tier) {
    var k = ((slot % 12) + 12) % 12;
    var isMinor = tier === 'min';
    var s = at(k);
    // Slots 0..6 are the sharp side of the wheel, 7..11 the flat side.
    var sharp = k <= 6;
    var maj = function (i) { return nameAt(i, sharp, 'maj'); };
    var min = function (i) { return nameAt(i, sharp, 'min'); };

    // Both rows read straight off the wheel: previous slot, this one, next.
    var degrees = isMinor
      ? [['i', min(k)], ['III', maj(k)], ['iv', min(k - 1)],
         ['v', min(k + 1)], ['VI', maj(k - 1)], ['VII', maj(k + 1)]]
      : [['I', maj(k)], ['ii', min(k - 1)], ['iii', min(k + 1)],
         ['IV', maj(k - 1)], ['V', maj(k + 1)], ['vi', min(k)]];

    var chords = degrees.map(function (d) {
      return { degree: d[0], name: d[1], id: libraryId(d[1]) };
    });
    var ids = chords.map(function (c) { return c.id; }).filter(Boolean);

    return {
      slot: k,
      tier: isMinor ? 'min' : 'maj',
      root: isMinor ? min(k) : maj(k),
      name: pretty(isMinor ? min(k).slice(0, -1) : maj(k)) + (isMinor ? ' minor' : ' major'),
      sig: s.sig,
      chords: chords,
      ids: ids,
      playable: ids.length >= MIN_CHORDS
    };
  }

  /* All 24 keys, majors first. */
  function keys() {
    var out = [];
    ['maj', 'min'].forEach(function (tier) {
      SLOTS.forEach(function (_, i) { out.push(key(i, tier)); });
    });
    return out;
  }

  /* ---------------- drawing ---------------- */

  function pt(r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return (CX + r * Math.cos(a)).toFixed(2) + ' ' + (CY + r * Math.sin(a)).toFixed(2);
  }

  function wedge(rOut, rIn, deg) {
    var a0 = deg - SPAN / 2 + GAP;
    var a1 = deg + SPAN / 2 - GAP;
    return 'M' + pt(rOut, a0) +
      'A' + rOut + ' ' + rOut + ' 0 0 1 ' + pt(rOut, a1) +
      'L' + pt(rIn, a1) +
      'A' + rIn + ' ' + rIn + ' 0 0 0 ' + pt(rIn, a0) + 'Z';
  }

  function label(r, deg, cls, text, size) {
    var p = pt(r, deg).split(' ');
    return '<text x="' + p[0] + '" y="' + (Number(p[1]) + size * 0.35).toFixed(2) +
      '" class="' + cls + '" font-size="' + size + '" text-anchor="middle">' + pretty(text) + '</text>';
  }

  function segment(i, tier, state) {
    var s = at(i);
    var isMin = tier === 'min';
    var name = isMin ? s.min : s.maj;
    var alt = isMin ? s.altMin : s.alt;
    var rOut = isMin ? R_MID : R_OUT;
    var rIn = isMin ? R_IN : R_MID;
    var deg = i * SPAN;
    var mid = (rOut + rIn) / 2;
    var cls = 'cof-seg' + (state.tonic ? ' is-tonic' : (state.inKey ? ' is-in' : '')) +
      (state.absent ? ' is-absent' : '') + (state.off ? ' is-off' : '');

    var out = '<g class="' + cls + '" data-slot="' + i + '" data-tier="' + tier +
      (state.off ? '" aria-disabled="true' : '" role="button" tabindex="0') +
      '" aria-label="Key of ' + pretty(isMin ? name.slice(0, -1) : name) +
      (isMin ? ' minor' : ' major') + '">';
    out += '<path d="' + wedge(rOut, rIn, deg) + '" class="cof-wedge" />';
    if (alt) {
      out += label(mid + (isMin ? 5 : 6), deg, 'cof-name', name, isMin ? 10 : 12.5);
      out += label(mid - (isMin ? 8 : 9), deg, 'cof-alt', alt, isMin ? 7 : 8);
    } else {
      out += label(mid, deg, 'cof-name', name, isMin ? 10.5 : 13);
    }
    return out + '</g>';
  }

  /**
   * render(sel) -> SVG string
   *   sel  { slot, tier } of the chosen key, or null for an untouched wheel
   *
   * The six chords of any key are the three slots centred on it, on both
   * rings, so the highlight is worked out from the slot distance alone.
   */
  function render(sel) {
    var k = sel ? key(sel.slot, sel.tier) : null;
    var have = {};
    if (k) k.chords.forEach(function (c) { if (c.id) have[c.name] = true; });

    var svg = ['<svg class="cof-svg" viewBox="0 0 ' + W + ' ' + H +
      '" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Circle of fifths">'];

    for (var i = 0; i < 12; i++) {
      // A key owns its own slot and the two either side of it, the short way
      // round the wheel.
      var step = k ? (i - k.slot + 12) % 12 : 99;
      var near = step <= 1 || step === 11;
      ['maj', 'min'].forEach(function (tier) {
        var s = at(i);
        var nm = tier === 'min' ? s.min : s.maj;
        var tonic = !!k && i === k.slot && tier === k.tier;
        svg.push(segment(i, tier, {
          inKey: near,
          tonic: tonic,
          // The key you picked always reads as picked, even when the app has
          // no shape for its own tonic - the chord list underneath says so.
          absent: !!k && near && !tonic && !have[nm],
          off: !key(i, tier).playable
        }));
      });
    }

    // The hub says what you are looking at, so the wheel explains itself with
    // no caption at all.
    svg.push('<circle cx="' + CX + '" cy="' + CY + '" r="' + (R_IN - 3) + '" class="cof-hub" />');
    if (k) {
      svg.push('<text x="' + CX + '" y="' + (CY - 1) + '" class="cof-hub-key" text-anchor="middle">' +
        k.name + '</text>');
      svg.push('<text x="' + CX + '" y="' + (CY + 15) + '" class="cof-hub-sig" text-anchor="middle">' +
        k.sig + '</text>');
    } else {
      svg.push('<text x="' + CX + '" y="' + (CY - 3) + '" class="cof-hub-hint" text-anchor="middle">Tap a key</text>');
      svg.push('<text x="' + CX + '" y="' + (CY + 12) + '" class="cof-hub-hint" text-anchor="middle">to load it</text>');
    }

    svg.push('</svg>');
    return svg.join('');
  }

  CM.circle = {
    slots: SLOTS,
    key: key,
    keys: keys,
    pretty: pretty,
    render: render,
    minChords: MIN_CHORDS,
    width: W,
    height: H
  };
})(window.CM = window.CM || {});
