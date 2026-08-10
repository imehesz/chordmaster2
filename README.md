# ChordMaster

A guitar chord and progression trainer, built as an offline-capable web app for
phones. It shows you a chord, plays it, keeps time, and cycles to the next one
so you can practise changes without looking at a screen the whole time.

Successor to `src/chordmaster` (the Create React App version), rewritten with no
framework, no build step and no server.

## Running it

There is nothing to install and nothing to compile.

```bash
cd src/chordmaster2
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly from the filesystem mostly works, but the service
worker and "add to home screen" need a real `http://` origin, so use the server
above while developing.

Deployment is a file copy: put the folder on any static host. The only server
requirement is that `.json` files are not aggressively cached.

## What it does

**Practice** — three modes:

- **Chords** — pick a pool of chords and drill them at random. This is the old
  app's behaviour, but beat-based instead of seconds-based, so the changes line
  up with the click.
- **Progressions** — 20 built-in progressions, from two-chord starters through
  the 12-bar blues to three traditional songs.
- **Today** — runs the current day of the 30 day plan, drill by drill, changing
  tempo between them.

**Plan** — a 30 day curriculum, roughly 13 minutes a day, from holding a single
Em to playing *House of the Rising Sun*. Tap any day to read it and start it.

Days are ticked off **by hand, never automatically**. Playing through the drills
logs the minutes but does not decide you are finished, so you can run the same
day as many times as you like before moving on. When a lesson session ends you
get a choice — mark it done, run it again, or leave it open — and any day can be
ticked or unticked later from the Plan tab. Only ticking off the day you are
currently on moves the plan forward.

**Progress** — a daily streak, a five-week calendar, total minutes, and which
chords you have met so far.

**Settings** — independent toggles for metronome, chord playback and count-in,
plus volume, night/day theme, finger numbers, and keeping the screen awake.

## How it is put together

```
index.html          the four tabs, all markup
css/app.css         two themes, entirely token-driven
js/chords.js        32 chord shapes (frets, fingers, barres)
js/progressions.js  20 progressions as lists of bars
js/lessons.js       the 30 day plan
js/diagram.js       chord shape -> inline SVG
js/audio.js         Web Audio: metronome, plucked-string synth, beat clock
js/trainer.js       the practice engine
js/storage.js       localStorage: streak, stats, settings
js/app.js           UI wiring, tabs, wake lock
tools/validate.js   checks the data without a browser
tools/make-icons.js regenerates the PWA icons
sw.js               offline cache
```

Files are loaded as plain `<script>` tags in dependency order and share a single
`window.CM` namespace. No modules, no bundler.

### Chord diagrams are drawn, not drawn-by-hand

Every diagram is generated from data at render time. `js/chords.js` holds the
shape:

```js
{
  id: 'Am',
  frets:   [-1, 0, 2, 2, 1, 0],   // -1 muted, 0 open, low E first
  fingers: [ 0, 0, 2, 3, 1, 0],   // 1 index .. 4 pinky
  barre:   null                   // or { fret, from, to }
}
```

`js/diagram.js` turns that into SVG whose every stroke is a CSS custom property,
which is why the diagrams recolour themselves in night and day mode with no
second set of assets. Adding a chord is one object; no image files exist.

### The sound

`js/audio.js` synthesises everything — there are no audio files to download.
The guitar tone is a single Karplus-Strong plucked-string buffer generated at
startup and pitch-shifted per note with `playbackRate`, so the whole instrument
costs about 600 KB of memory rather than a sample per chord.

Timing uses the standard Web Audio lookahead pattern: a coarse `setInterval`
schedules notes onto the audio clock in advance, and a `requestAnimationFrame`
loop drains a queue so the screen flips at the moment you hear the beat, not
whenever a timer happens to fire.

### Keeping the screen on

Practice sessions request a `navigator.wakeLock`, and re-request it when you
come back from another app. Supported on Android Chrome and iOS Safari 16.4+.
Where it is not available, Settings shows a note suggesting you install the app
to your home screen or raise the phone's screen timeout instead.

## Changing the content

After editing `chords.js`, `progressions.js` or `lessons.js`:

```bash
node tools/validate.js
```

It checks the things that are invisible until you are holding a guitar:

- every shape actually spells the chord it claims to (it computes the real
  pitches and compares them against the expected chord tones)
- no finger is in two places at once, nothing sits under its own barre
- diagrams draw the right number of dots and nothing falls off the fretboard
- every progression plays back in the order it is written, and loops seamlessly
- **no lesson drills a chord before the plan teaches it**
- `app.js` does not reach for DOM ids that do not exist

And for the streak and lesson-progress logic:

```bash
node tools/test-storage.js
```

which runs the date maths against a fake clock (month and year boundaries
included) and pins the rule that finishing a session never ticks a day off by
itself.

To regenerate the icons after changing the mark:

```bash
node tools/make-icons.js
```

## Known limits

- **iOS mute switch.** Web Audio respects the physical silent switch on iPhones.
  If the app is silent, check that switch before debugging anything else.
- **Service worker caching.** Bump `CACHE` in `sw.js` when you ship changes, or
  returning visitors keep the old files.
- **Songs.** Only traditional/public-domain songs are included, and only their
  chord changes — no lyrics or tab.
- The plan assumes standard tuning and a right-handed player.

## Data

Everything is stored in one `localStorage` key (`chordmaster2`) on the device.
There is no account, no server and no network traffic. "Erase all progress" in
Settings clears it.
