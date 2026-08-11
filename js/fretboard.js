/* ChordMaster 2 - fretboard renderer
 *
 * Draws a slice of the neck lying flat, the way you see it looking down at the
 * guitar: high e on top, low E at the bottom, frets running left to right. Used
 * by the fretboard exercises, where what matters is one note at a time rather
 * than a whole shape.
 *
 * Like diagram.js it is pure inline SVG with every colour coming from a CSS
 * custom property, so it themes and scales for free.
 */
(function (CM) {
  'use strict';

  var STRINGS = 6;
  var VISIBLE_FRETS = 5;

  // Geometry, in viewBox units.
  var GAP_X = 34;   // fret width
  var GAP_Y = 13;   // string spacing
  var X0 = 24;      // left edge of the first visible fret
  var Y0 = 12;      // top string

  var W = X0 + GAP_X * VISIBLE_FRETS + 10;
  var H = Y0 + GAP_Y * (STRINGS - 1) + 24;

  // Row 0 is the high e, so string 5 draws at the top and string 0 at the bottom.
  function stringY(s) { return Y0 + (STRINGS - 1 - s) * GAP_Y; }
  function fretX(i) { return X0 + i * GAP_X; }

  /* The dots inlaid on a real neck. Anything above 12 repeats the pattern. */
  function isMarker(fret) {
    var f = fret % 12;
    return f === 3 || f === 5 || f === 7 || f === 9 || (fret > 0 && f === 0);
  }

  function dot(note, start, cls, showFinger) {
    var rel = note.fret - start;
    if (rel < 0 || rel >= VISIBLE_FRETS) return '';
    var cx = fretX(rel) + GAP_X / 2;
    var cy = stringY(note.string);
    var out = '<circle cx="' + cx + '" cy="' + cy + '" r="7.5" class="' + cls + '" />';
    if (showFinger && note.finger) {
      out += '<text x="' + cx + '" y="' + (cy + 3.2) + '" class="fb-finger" text-anchor="middle">' +
        note.finger + '</text>';
    }
    return out;
  }

  /**
   * render(note, opts) -> SVG string
   *   opts.next   a second note, drawn hollow as the one coming up
   *   opts.start  lowest fret in the window (defaults to the note's hand position)
   */
  function render(note, opts) {
    opts = opts || {};
    if (!note) return '<svg class="fretboard" viewBox="0 0 ' + W + ' ' + H + '"></svg>';

    var start = Math.max(1, opts.start != null ? opts.start : note.pos || note.fret);
    var svg = [];
    var right = fretX(VISIBLE_FRETS);
    var bottom = stringY(0);

    svg.push('<svg class="fretboard" viewBox="0 0 ' + W + ' ' + H +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
      CM.exercises.describe(note) + '">');

    // --- inlay markers, behind everything ---
    for (var m = 0; m < VISIBLE_FRETS; m++) {
      if (!isMarker(start + m)) continue;
      svg.push('<rect x="' + (fretX(m) + 4) + '" y="' + (Y0 - 5) + '" width="' + (GAP_X - 8) +
        '" height="' + (bottom - Y0 + 10) + '" rx="4" class="fb-inlay" />');
    }

    // --- frets (vertical). The nut only exists at the top of the neck. ---
    for (var f = 0; f <= VISIBLE_FRETS; f++) {
      var isNut = (f === 0 && start === 1);
      svg.push('<line x1="' + fretX(f) + '" y1="' + Y0 + '" x2="' + fretX(f) + '" y2="' + bottom +
        '" class="' + (isNut ? 'fb-nut' : 'fb-fret') + '" />');
    }

    // --- strings (horizontal), thicker towards the bass ---
    for (var s = 0; s < STRINGS; s++) {
      svg.push('<line x1="' + X0 + '" y1="' + stringY(s) + '" x2="' + right + '" y2="' + stringY(s) +
        '" class="fb-string" stroke-width="' + (1.9 - s * 0.18).toFixed(2) + '" />');
      svg.push('<text x="' + (X0 - 7) + '" y="' + (stringY(s) + 3) + '" class="fb-label" text-anchor="end">' +
        CM.exercises.stringNames[s] + '</text>');
    }

    // --- fret numbers under the board ---
    for (var n = 0; n < VISIBLE_FRETS; n++) {
      svg.push('<text x="' + (fretX(n) + GAP_X / 2) + '" y="' + (bottom + 15) +
        '" class="fb-fretnum" text-anchor="middle">' + (start + n) + '</text>');
    }

    // --- what is coming, then what to play now ---
    if (opts.next) svg.push(dot(opts.next, start, 'fb-next', false));
    svg.push(dot(note, start, 'fb-dot', true));

    svg.push('</svg>');
    return svg.join('');
  }

  CM.fretboard = { render: render, width: W, height: H, visibleFrets: VISIBLE_FRETS };
})(window.CM = window.CM || {});
