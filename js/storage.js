/* ChordMaster 2 - local storage
 *
 * Everything lives in one localStorage key. No account, no server, no network.
 *
 * Two things get tracked per day: whether you opened the app (the "login"
 * streak) and whether you actually practised. The streak counts opens, because
 * showing up is the habit worth rewarding, but the calendar shows the
 * difference so you can't kid yourself.
 */
(function (CM) {
  'use strict';

  var KEY = 'chordmaster2';
  var VERSION = 1;

  var DEFAULTS = {
    version: VERSION,
    settings: {
      theme: 'night',
      metronome: true,
      chord: true,
      countIn: true,
      volume: 0.8,
      keepAwake: true,
      showFingers: true,
      showCircle: true,
      tuning: 'standard',
      tunerBpm: 40,
      tunerStrings: [true, true, true, true, true, true]
    },
    days: {},              // 'YYYY-MM-DD' -> { visited, minutes, sessions, practiced }
    streak: { current: 0, longest: 0, lastVisit: null },
    lesson: { currentDay: 1, completed: [] },
    totals: { minutes: 0, sessions: 0 }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var data = null;

  function load() {
    if (data) return data;
    try {
      var raw = localStorage.getItem(KEY);
      data = raw ? JSON.parse(raw) : clone(DEFAULTS);
    } catch (e) {
      data = clone(DEFAULTS);
    }
    // Fill in anything a previous version did not have.
    var d = clone(DEFAULTS);
    Object.keys(d).forEach(function (k) {
      if (data[k] == null) data[k] = d[k];
    });
    Object.keys(d.settings).forEach(function (k) {
      if (data.settings[k] == null) data.settings[k] = d.settings[k];
    });
    data.version = VERSION;
    return data;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(load()));
    } catch (e) {
      /* private mode / quota: the app still works, it just forgets. */
    }
  }

  /* ---------------- dates ---------------- */

  function key(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function dayOffset(dateKey, days) {
    var parts = dateKey.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    return key(d);
  }

  function daysBetween(a, b) {
    var pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    var da = new Date(pa[0], pa[1] - 1, pa[2]);
    var db = new Date(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db - da) / 86400000);
  }

  function ensureDay(k) {
    var d = load();
    if (!d.days[k]) d.days[k] = { visited: false, practiced: false, minutes: 0, sessions: 0 };
    return d.days[k];
  }

  /* ---------------- the streak ---------------- */

  /** Call once when the app opens. Returns { streak, isNewDay, broke }. */
  function recordVisit() {
    var d = load();
    var today = key();
    var last = d.streak.lastVisit;
    var result = { streak: d.streak.current, isNewDay: false, broke: false };

    if (last === today) {
      ensureDay(today).visited = true;
      save();
      return result;
    }

    result.isNewDay = true;
    if (last && daysBetween(last, today) === 1) {
      d.streak.current += 1;
    } else {
      if (last && d.streak.current > 1) result.broke = true;
      d.streak.current = 1;
    }
    d.streak.lastVisit = today;
    d.streak.longest = Math.max(d.streak.longest, d.streak.current);
    ensureDay(today).visited = true;
    result.streak = d.streak.current;
    save();
    return result;
  }

  /** Practice time, in minutes. Anything under half a minute is ignored. */
  function recordPractice(minutes) {
    if (!minutes || minutes < 0.5) return;
    var d = load();
    var today = ensureDay(key());
    today.minutes += minutes;
    today.sessions += 1;
    today.practiced = true;
    d.totals.minutes += minutes;
    d.totals.sessions += 1;
    save();
  }

  /* Ticking a day off is always the user's call. Playing through the drills
     does not do it for them, so a day can be repeated as many times as they
     like before they decide they have it. */
  function completeLesson(day, advance) {
    var d = load();
    if (d.lesson.completed.indexOf(day) === -1) d.lesson.completed.push(day);
    // Only ever step forward from the day you just played. Ticking off some
    // other day out of order must not drag the plan along with it.
    if (advance && day === d.lesson.currentDay) {
      d.lesson.currentDay = Math.min(CM.lessons.total, day + 1);
    }
    save();
  }

  function uncompleteLesson(day) {
    var d = load();
    var i = d.lesson.completed.indexOf(day);
    if (i !== -1) d.lesson.completed.splice(i, 1);
    save();
  }

  /** Flip a day's done state. Returns the new state. */
  function toggleLesson(day) {
    var wasDone = isLessonComplete(day);
    if (wasDone) uncompleteLesson(day); else completeLesson(day, false);
    return !wasDone;
  }

  function isLessonComplete(day) {
    return load().lesson.completed.indexOf(day) !== -1;
  }

  /* ---------------- reads ---------------- */

  function streak() {
    var d = load();
    // A streak that was not continued today or yesterday is already dead.
    var last = d.streak.lastVisit;
    var live = last && daysBetween(last, key()) <= 1;
    return {
      current: live ? d.streak.current : 0,
      longest: d.streak.longest,
      lastVisit: last
    };
  }

  /** The last n days, oldest first, for the calendar strip. */
  function calendar(n) {
    var d = load();
    var out = [];
    var today = key();
    for (var i = n - 1; i >= 0; i--) {
      var k = dayOffset(today, -i);
      var rec = d.days[k];
      out.push({
        date: k,
        isToday: k === today,
        visited: !!(rec && rec.visited),
        practiced: !!(rec && rec.practiced),
        minutes: rec ? rec.minutes : 0
      });
    }
    return out;
  }

  function totals() {
    var d = load();
    var practicedDays = Object.keys(d.days).filter(function (k) { return d.days[k].practiced; }).length;
    return {
      minutes: d.totals.minutes,
      sessions: d.totals.sessions,
      practicedDays: practicedDays,
      visitedDays: Object.keys(d.days).filter(function (k) { return d.days[k].visited; }).length,
      lessonsDone: d.lesson.completed.length
    };
  }

  function today() {
    return ensureDay(key());
  }

  function lesson() {
    return load().lesson;
  }

  function setLessonDay(day) {
    var d = load();
    d.lesson.currentDay = Math.max(1, Math.min(CM.lessons.total, day));
    save();
  }

  /* ---------------- settings ---------------- */

  function settings() { return load().settings; }

  function setSetting(k, v) {
    var d = load();
    d.settings[k] = v;
    save();
    return d.settings;
  }

  function reset() {
    data = clone(DEFAULTS);
    save();
  }

  CM.store = {
    load: load,
    save: save,
    todayKey: key,
    recordVisit: recordVisit,
    recordPractice: recordPractice,
    completeLesson: completeLesson,
    uncompleteLesson: uncompleteLesson,
    toggleLesson: toggleLesson,
    isLessonComplete: isLessonComplete,
    streak: streak,
    calendar: calendar,
    totals: totals,
    today: today,
    lesson: lesson,
    setLessonDay: setLessonDay,
    settings: settings,
    setSetting: setSetting,
    reset: reset
  };
})(window.CM = window.CM || {});
