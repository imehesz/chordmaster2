/* Tests the streak and lesson-progress logic against a fake clock and a fake
 * localStorage.
 *
 *   node tools/test-storage.js
 *
 * The date maths and the "who decides a lesson is finished" rule are both easy
 * to break by accident and impossible to eyeball, so they are pinned here.
 */
const path = require('path');
const JS = path.join(__dirname, '..', 'js');

let backing = {};
global.localStorage = {
  getItem: k => (k in backing ? backing[k] : null),
  setItem: (k, v) => { backing[k] = v; }
};
global.window = {};

// A clock we can move around.
const RealDate = Date;
let NOW = new RealDate(2026, 7, 10);
global.Date = class extends RealDate {
  constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(NOW); }
  static now() { return NOW.getTime(); }
};
const setDay = (y, m, d) => { NOW = new RealDate(y, m, d); };

require(path.join(JS, 'chords.js'));
require(path.join(JS, 'progressions.js'));
require(path.join(JS, 'lessons.js'));
require(path.join(JS, 'storage.js'));
const S = global.window.CM.store;

const fails = [];
const is = (got, want, label) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fails.push(`${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
  }
};

/* ---------------- the streak ---------------- */

is(S.recordVisit().streak, 1, 'first ever visit starts a streak');
is(S.recordVisit().streak, 1, 'a second visit the same day does not double count');

setDay(2026, 7, 11); is(S.recordVisit().streak, 2, 'consecutive day extends the streak');
setDay(2026, 7, 12); is(S.recordVisit().streak, 3, 'and again');
is(S.streak().longest, 3, 'longest follows the current streak up');

setDay(2026, 7, 15);
const broke = S.recordVisit();
is(broke.streak, 1, 'a three day gap resets the streak');
is(broke.broke, true, 'and reports that it broke');
is(S.streak().longest, 3, 'longest survives a break');

setDay(2026, 7, 20);
is(S.streak().current, 0, 'a streak untouched since before yesterday reads as zero');
is(S.streak().longest, 3, 'longest is still remembered');

setDay(2026, 7, 31); S.recordVisit();
setDay(2026, 8, 1); is(S.recordVisit().streak, 2, 'streak crosses a month boundary');

S.reset(); backing = {};
setDay(2026, 11, 31); S.recordVisit();
setDay(2027, 0, 1); is(S.recordVisit().streak, 2, 'streak crosses a year boundary');

/* ---------------- practice logging ---------------- */

S.recordPractice(12.5);
S.recordPractice(0.2);                       // under 30s, ignored
is(Math.round(S.totals().minutes), 13, 'minutes accumulate and sub-30s is ignored');
is(S.totals().sessions, 1, 'only the real session counted');
is(S.today().practiced, true, 'today is marked as practised');

const cal = S.calendar(35);
is(cal.length, 35, 'calendar returns 35 days');
is(cal[34].isToday, true, 'the last cell is today');
is(cal[34].practiced, true, 'today shows as practised');
is(cal[33].visited, true, 'yesterday shows as visited but not practised');
is(cal[33].practiced, false, 'yesterday was not practised');

/* ---------------- lessons are ticked off by hand ---------------- */

S.reset(); backing = {}; S.recordVisit();
is(S.lesson().currentDay, 1, 'the plan starts on day 1');

S.recordPractice(13);
is(S.isLessonComplete(1), false, 'playing the drills does NOT tick the day off');
is(S.lesson().currentDay, 1, 'and does NOT advance the plan');

S.recordPractice(13); S.recordPractice(13);
is(S.lesson().currentDay, 1, 'a day can be repeated as often as you like');
is(S.totals().sessions, 3, 'every run-through is still logged');

S.completeLesson(1, true);
is(S.isLessonComplete(1), true, 'the user ticking it off marks it done');
is(S.lesson().currentDay, 2, 'and moves the plan on');

S.completeLesson(5, false);
is(S.isLessonComplete(5), true, 'a later day can be ticked off out of order');
is(S.lesson().currentDay, 2, 'without dragging the current day along');

is(S.toggleLesson(5), false, 'toggle reports the new state');
is(S.isLessonComplete(5), false, 'a day can be unticked');
is(S.toggleLesson(5), true, 'and ticked again');

S.completeLesson(1, true); S.completeLesson(1, true);
is(S.lesson().completed.filter(d => d === 1).length, 1, 'marking twice makes no duplicate');

S.setLessonDay(1);
S.recordPractice(13);
is(S.isLessonComplete(1), true, 'redoing a finished day keeps it finished');
is(S.lesson().currentDay, 1, 'and does not jump forward');

S.completeLesson(30, true);
is(S.lesson().currentDay, 1, 'ticking off a far-off day never jumps the plan');

S.setLessonDay(30); S.completeLesson(30, true);
is(S.lesson().currentDay, 30, 'the plan stops at day 30');

S.setLessonDay(99); is(S.lesson().currentDay, 30, 'the day is clamped at the top');
S.setLessonDay(-4); is(S.lesson().currentDay, 1, 'and at the bottom');

/* ---------------- report ---------------- */

if (fails.length) {
  console.log(`${fails.length} failure(s):`);
  fails.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('All storage checks passed (streak, calendar, manual lesson completion).');
