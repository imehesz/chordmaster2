/* ChordMaster 2 - chord diagram renderer
 *
 * Draws a chord shape as inline SVG. Nothing is hard-coded to a colour: every
 * stroke and fill uses a CSS custom property, so the same markup works in both
 * themes and scales to any size without a single image file.
 */
(function (CM) {
  'use strict';

  var STRINGS = 6;
  var VISIBLE_FRETS = 5;

  // Geometry, in viewBox units.
  var GAP_X = 16;   // between strings
  var GAP_Y = 21;   // between frets
  var X0 = 22;      // left-most string
  var Y0 = 34;      // the nut / top fret line
  var MARK_Y = Y0 - 13;

  var W = X0 * 2 + GAP_X * (STRINGS - 1);
  var H = Y0 + GAP_Y * VISIBLE_FRETS + 12;

  function stringX(i) { return X0 + i * GAP_X; }
  function fretY(n) { return Y0 + n * GAP_Y; }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Where does the 5-fret window start, and do we draw the nut? */
  function window_(chord) {
    var fretted = chord.frets.filter(function (f) { return f > 0; });
    if (!fretted.length) return { start: 1, nut: true };
    var max = Math.max.apply(null, fretted);
    var min = Math.min.apply(null, fretted);
    if (max <= VISIBLE_FRETS) return { start: 1, nut: true };
    return { start: min, nut: false };
  }

  /**
   * render(chord, opts) -> SVG string
   *   opts.showFingers  draw finger numbers inside the dots (default true)
   *   opts.showName     draw the chord name above the grid (default false)
   *   opts.className    extra class on the <svg>
   */
  function render(chord, opts) {
    opts = opts || {};
    var showFingers = opts.showFingers !== false;
    var win = window_(chord);
    var svg = [];

    svg.push('<svg class="chord-diagram ' + (opts.className || '') + '" viewBox="0 0 ' + W + ' ' + H +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(chord.longName || chord.name) + ' chord diagram">');

    // --- frets (horizontal) ---
    for (var f = 0; f <= VISIBLE_FRETS; f++) {
      var isNut = (f === 0 && win.nut);
      svg.push('<line x1="' + stringX(0) + '" y1="' + fretY(f) + '" x2="' + stringX(STRINGS - 1) + '" y2="' + fretY(f) +
        '" class="' + (isNut ? 'dia-nut' : 'dia-fret') + '" />');
    }

    // --- strings (vertical) ---
    for (var s = 0; s < STRINGS; s++) {
      svg.push('<line x1="' + stringX(s) + '" y1="' + fretY(0) + '" x2="' + stringX(s) + '" y2="' + fretY(VISIBLE_FRETS) +
        '" class="dia-string" />');
    }

    // --- position marker for shapes that start above the nut ---
    if (!win.nut) {
      svg.push('<text x="' + (X0 - 9) + '" y="' + (fretY(0) + GAP_Y * 0.62) +
        '" class="dia-position" text-anchor="end">' + win.start + 'fr</text>');
    }

    // --- barre ---
    if (chord.barre) {
      var rel = chord.barre.fret - win.start;
      if (rel >= 0 && rel < VISIBLE_FRETS) {
        var bx1 = stringX(chord.barre.from);
        var bx2 = stringX(chord.barre.to);
        var by = fretY(rel) + GAP_Y / 2;
        svg.push('<rect x="' + (bx1 - 6) + '" y="' + (by - 6) + '" width="' + (bx2 - bx1 + 12) +
          '" height="12" rx="6" class="dia-barre" />');
      }
    }

    // --- open / muted markers above the nut ---
    for (var i = 0; i < STRINGS; i++) {
      var fr = chord.frets[i];
      var x = stringX(i);
      if (fr === -1) {
        var r = 3.6;
        svg.push('<path d="M' + (x - r) + ' ' + (MARK_Y - r) + 'L' + (x + r) + ' ' + (MARK_Y + r) +
          'M' + (x + r) + ' ' + (MARK_Y - r) + 'L' + (x - r) + ' ' + (MARK_Y + r) + '" class="dia-mute" />');
      } else if (fr === 0) {
        svg.push('<circle cx="' + x + '" cy="' + MARK_Y + '" r="3.8" class="dia-open" />');
      }
    }

    // --- finger dots ---
    for (var j = 0; j < STRINGS; j++) {
      var fret = chord.frets[j];
      if (fret <= 0) continue;
      var relFret = fret - win.start;
      if (relFret < 0 || relFret >= VISIBLE_FRETS) continue;

      var inBarre = chord.barre && chord.barre.fret === fret &&
        j >= chord.barre.from && j <= chord.barre.to;
      // The barre already covers its own fret; only draw dots that sit on top of it.
      if (inBarre) continue;

      var cx = stringX(j);
      var cy = fretY(relFret) + GAP_Y / 2;
      svg.push('<circle cx="' + cx + '" cy="' + cy + '" r="7" class="dia-dot" />');
      if (showFingers && chord.fingers && chord.fingers[j] > 0) {
        svg.push('<text x="' + cx + '" y="' + (cy + 3.4) + '" class="dia-finger" text-anchor="middle">' +
          chord.fingers[j] + '</text>');
      }
    }

    // --- the barre's own finger number, at the thick end ---
    if (chord.barre && showFingers) {
      var brel = chord.barre.fret - win.start;
      if (brel >= 0 && brel < VISIBLE_FRETS) {
        var fx = stringX(chord.barre.from);
        var fy = fretY(brel) + GAP_Y / 2;
        var num = (chord.fingers && chord.fingers[chord.barre.from]) || 1;
        svg.push('<text x="' + fx + '" y="' + (fy + 3.4) + '" class="dia-finger" text-anchor="middle">' + num + '</text>');
      }
    }

    svg.push('</svg>');
    return svg.join('');
  }

  /* Convenience: render by chord id. */
  function renderId(id, opts) {
    return CM.chords.has(id) ? render(CM.chords.get(id), opts)
      : '<svg class="chord-diagram" viewBox="0 0 ' + W + ' ' + H + '"></svg>';
  }

  CM.diagram = { render: render, renderId: renderId, width: W, height: H };
})(window.CM = window.CM || {});
