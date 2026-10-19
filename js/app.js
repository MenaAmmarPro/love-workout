"use strict";

/*
 * love-workout — partner workout.
 *
 * Preset bodyweight routines with timed / rep exercises, a workout + rest
 * timer with Web Audio beeps, a completion log, a day streak and history.
 * Everything is kept in localStorage on this device only.
 *
 * Pure logic is exposed on `window.MenaWorkout` so it can be tested with a
 * bare Node harness (test/harness.js).
 */

(function () {
  var STORE = "mena-workout";

  /* ---------- preset routines ---------- */

  var ROUTINES = [
    {
      id: "wakeup",
      name: "Good Morning Wake-up",
      emoji: "\u2600\uFE0F",
      note: "Seven gentle minutes to start the day together.",
      exercises: [
        { name: "Jumping jacks", secs: 30, reps: 0, rest: 15 },
        { name: "Bodyweight squats", secs: 0, reps: 15, rest: 20 },
        { name: "Push-ups", secs: 0, reps: 10, rest: 20 },
        { name: "Plank", secs: 30, reps: 0, rest: 20 },
        { name: "Reverse lunges", secs: 0, reps: 12, rest: 20 },
        { name: "Glute bridges", secs: 0, reps: 15, rest: 20 },
        { name: "Full-body stretch", secs: 45, reps: 0, rest: 0 }
      ]
    },
    {
      id: "cardio",
      name: "Cardio Burst",
      emoji: "\uD83D\uDD25",
      note: "Short on time? Ten minutes and you're glowing.",
      exercises: [
        { name: "High knees", secs: 40, reps: 0, rest: 20 },
        { name: "Jump squats", secs: 30, reps: 0, rest: 25 },
        { name: "Mountain climbers", secs: 40, reps: 0, rest: 25 },
        { name: "Burpees", secs: 30, reps: 0, rest: 30 },
        { name: "Skater jumps", secs: 40, reps: 0, rest: 25 },
        { name: "Star jumps", secs: 30, reps: 0, rest: 25 },
        { name: "March in place", secs: 60, reps: 0, rest: 0 }
      ]
    },
    {
      id: "core",
      name: "Core & Abs",
      emoji: "\uD83E\uDDCA",
      note: "Strong centre, kind pace.",
      exercises: [
        { name: "Dead bug", secs: 0, reps: 12, rest: 15 },
        { name: "Crunches", secs: 0, reps: 15, rest: 20 },
        { name: "Bicycle kicks", secs: 30, reps: 0, rest: 20 },
        { name: "Leg raises", secs: 0, reps: 12, rest: 20 },
        { name: "Russian twists", secs: 30, reps: 0, rest: 20 },
        { name: "Side plank (each side)", secs: 30, reps: 0, rest: 20 },
        { name: "Superman hold", secs: 30, reps: 0, rest: 0 }
      ]
    },
    {
      id: "fullbody",
      name: "Full Body (no kit)",
      emoji: "\uD83D\uDCAA",
      note: "The one we do side by side.",
      exercises: [
        { name: "Squats", secs: 0, reps: 15, rest: 20 },
        { name: "Push-ups", secs: 0, reps: 12, rest: 20 },
        { name: "Lunges", secs: 0, reps: 12, rest: 20 },
        { name: "Plank", secs: 45, reps: 0, rest: 25 },
        { name: "Tricep dips", secs: 0, reps: 12, rest: 20 },
        { name: "Wall sit", secs: 40, reps: 0, rest: 25 },
        { name: "Bird-dog", secs: 0, reps: 12, rest: 0 }
      ]
    },
    {
      id: "legs",
      name: "Legs & Glutes",
      emoji: "\uD83E\uDDB5",
      note: "For the days we climb all those stairs.",
      exercises: [
        { name: "Squats", secs: 0, reps: 18, rest: 25 },
        { name: "Sumo squats", secs: 0, reps: 15, rest: 25 },
        { name: "Reverse lunges", secs: 0, reps: 14, rest: 25 },
        { name: "Calf raises", secs: 0, reps: 20, rest: 20 },
        { name: "Glute bridges", secs: 0, reps: 18, rest: 25 },
        { name: "Wall sit", secs: 45, reps: 0, rest: 0 }
      ]
    },
    {
      id: "cooldown",
      name: "Cool-down & Stretch",
      emoji: "\uD83C\uDF3F",
      note: "Breathe out. We made it.",
      exercises: [
        { name: "Neck rolls", secs: 30, reps: 0, rest: 10 },
        { name: "Shoulder rolls", secs: 30, reps: 0, rest: 10 },
        { name: "Standing forward fold", secs: 40, reps: 0, rest: 10 },
        { name: "Quad stretch", secs: 30, reps: 0, rest: 10 },
        { name: "Butterfly stretch", secs: 40, reps: 0, rest: 10 },
        { name: "Deep breaths", secs: 45, reps: 0, rest: 0 }
      ]
    }
  ];

  /* ---------- pure helpers ---------- */

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function fmtTime(sec) {
    var s = Math.max(0, Math.round(Number(sec) || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + pad2(r);
  }

  function dayISO(date) {
    var d = date || new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function asDate(iso) {
    var parts = String(iso).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function shiftDay(iso, delta) {
    var d = asDate(iso);
    d.setDate(d.getDate() + delta);
    return dayISO(d);
  }

  // Estimated seconds for a rep-based exercise (3s per rep, at least 10s).
  function workSecs(exercise) {
    if (!exercise) return 0;
    if (exercise.secs > 0) return Math.max(1, Math.round(exercise.secs));
    return Math.max(10, Math.round((exercise.reps || 0) * 3));
  }

  function buildSteps(exercises) {
    var steps = [];
    var list = Array.isArray(exercises) ? exercises : [];
    for (var i = 0; i < list.length; i += 1) {
      var e = list[i] || {};
      steps.push({
        type: "work",
        name: String(e.name || "Exercise"),
        secs: workSecs(e),
        reps: Math.max(0, Math.round(e.reps || 0)),
        index: i,
        total: list.length
      });
      if (e.rest > 0) {
        steps.push({
          type: "rest",
          name: "Rest",
          secs: Math.max(1, Math.round(e.rest)),
          reps: 0,
          index: i,
          total: list.length
        });
      }
    }
    return steps;
  }

  function routineDuration(routine) {
    var steps = buildSteps(routine && routine.exercises);
    var total = 0;
    for (var i = 0; i < steps.length; i += 1) total += steps[i].secs;
    return total;
  }

  function stepAt(steps, index) {
    if (!Array.isArray(steps) || !steps.length) return null;
    var i = Math.max(0, Math.min(steps.length - 1, index | 0));
    return steps[i];
  }

  function progressPct(done, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, (done / total) * 100));
  }

  function findRoutine(id) {
    for (var i = 0; i < ROUTINES.length; i += 1) {
      if (ROUTINES[i].id === id) return ROUTINES[i];
    }
    return ROUTINES[0];
  }

  // Longest run of consecutive days ending today or yesterday.
  function computeStreak(log, today) {
    var days = {};
    var list = Array.isArray(log) ? log : [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] && typeof list[i].date === "string") days[list[i].date] = true;
    }
    var t = today || dayISO();
    var start = days[t] ? t : (days[shiftDay(t, -1)] ? shiftDay(t, -1) : null);
    if (!start) return 0;
    var count = 0;
    var cur = start;
    while (days[cur]) {
      count += 1;
      cur = shiftDay(cur, -1);
    }
    return count;
  }

  function summarize(log, today) {
    var list = Array.isArray(log) ? log : [];
    var secs = 0;
    var last = "";
    for (var i = 0; i < list.length; i += 1) {
      var e = list[i] || {};
      secs += Math.max(0, Math.round(e.secs || 0));
      if (typeof e.date === "string" && e.date > last) last = e.date;
    }
    return {
      count: list.length,
      secs: secs,
      streak: computeStreak(list, today),
      last: last
    };
  }

  // Sort newest first for the history list.
  function sortedLog(log) {
    var list = (Array.isArray(log) ? log : []).slice();
    list.sort(function (a, b) {
      var ta = (a && a.at) || 0;
      var tb = (b && b.at) || 0;
      if (ta !== tb) return tb - ta;
      var da = (a && a.date) || "";
      var db = (b && b.date) || "";
      return da < db ? 1 : da > db ? -1 : 0;
    });
    return list;
  }

  /* ---------- storage ---------- */

  var state = { routines: [], log: [], beeps: true, lastRoutine: ROUTINES[0].id };

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) { raw = null; }
    var s = null;
    if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
    if (!s) return;
    if (Array.isArray(s.log)) {
      state.log = [];
      s.log.forEach(function (e) {
        if (e && typeof e.date === "string" && typeof e.name === "string") {
          state.log.push({
            date: e.date,
            name: e.name.slice(0, 60),
            secs: Math.max(0, Math.round(e.secs || 0)),
            at: isFinite(e.at) ? Math.floor(e.at) : 0
          });
        }
      });
    }
    if (typeof s.beeps === "boolean") state.beeps = s.beeps;
    if (typeof s.lastRoutine === "string") state.lastRoutine = s.lastRoutine;
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- Web Audio beeps ---------- */

  var audioCtx = null;

  function getAudio() {
    if (audioCtx) return audioCtx;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }

  // kind: "tick" | "work" | "rest" | "done"
  function beep(kind) {
    if (!state.beeps) return;
    var ctx = getAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    var freq;
    var dur = 0.16;
    switch (kind) {
      case "tick": freq = 660; dur = 0.09; break;
      case "rest": freq = 440; dur = 0.22; break;
      case "done": freq = 880; dur = 0.42; break;
      default: freq = 784; dur = 0.22; break;
    }
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = kind === "rest" ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (e) { /* audio is a bonus, never fatal */ }
  }

  /* ---------- workout engine ---------- */

  var engine = {
    routine: findRoutine(state.lastRoutine),
    steps: [],
    index: 0,
    remaining: 0,
    running: false,
    tickTimer: null,
    elapsed: 0
  };

  function loadRoutine(id) {
    engine.routine = findRoutine(id);
    engine.steps = buildSteps(engine.routine.exercises);
    engine.index = 0;
    engine.remaining = engine.steps.length ? engine.steps[0].secs : 0;
    engine.elapsed = 0;
    engine.running = false;
    state.lastRoutine = engine.routine.id;
    save();
  }

  function currentStep() {
    return stepAt(engine.steps, engine.index);
  }

  function startTimer() {
    if (engine.running) return;
    if (!engine.steps.length) return;
    engine.running = true;
    getAudio(); // unlock audio on the user gesture
    engine.tickTimer = setInterval(tick, 1000);
    renderPlayer();
  }

  function pauseTimer() {
    if (!engine.running) return;
    engine.running = false;
    if (engine.tickTimer) clearInterval(engine.tickTimer);
    engine.tickTimer = null;
    renderPlayer();
  }

  function stopTimer() {
    engine.running = false;
    if (engine.tickTimer) clearInterval(engine.tickTimer);
    engine.tickTimer = null;
  }

  function resetTimer() {
    stopTimer();
    engine.index = 0;
    engine.elapsed = 0;
    engine.remaining = engine.steps.length ? engine.steps[0].secs : 0;
    renderPlayer();
  }

  function tick() {
    if (!engine.running) return;
    engine.remaining -= 1;
    engine.elapsed += 1;

    if (engine.remaining > 0 && engine.remaining <= 3) {
      beep("tick");
    }

    if (engine.remaining <= 0) {
      advance();
      return;
    }
    renderPlayer();
  }

  function advance() {
    var step = currentStep();
    var wasWork = step && step.type === "work";

    // If the finished step was the last exercise work step, finish.
    if (engine.index >= engine.steps.length - 1) {
      finishWorkout();
      return;
    }

    engine.index += 1;
    var next = currentStep();
    engine.remaining = next ? next.secs : 0;

    if (next && next.type === "rest") beep("rest");
    else if (wasWork || (next && next.type === "work")) beep("work");

    renderPlayer();
    renderPlayerFocus();
  }

  function skipStep() {
    if (!engine.steps.length) return;
    advance();
    if (engine.running) renderPlayer();
  }

  function finishWorkout() {
    stopTimer();
    var secs = 0;
    // Count the work step durations as the logged effort.
    for (var i = 0; i < engine.steps.length; i += 1) {
      if (engine.steps[i].type === "work") secs += engine.steps[i].secs;
    }
    state.log.push({
      date: dayISO(),
      name: engine.routine.name,
      secs: secs,
      at: Date.now()
    });
    save();
    beep("done");
    renderHistory();
    renderPlayer();
    setText("player-note", "Workout complete \u2014 " + engine.routine.name + " \u2665");
  }

  /* ---------- small DOM helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = String(value);
  }

  /* ---------- rendering ---------- */

  function exerciseSummary(e) {
    if (e.secs > 0) return e.secs + "s";
    if (e.reps > 0) return e.reps + " reps";
    return "\u2014";
  }

  function renderRoutines() {
    var host = $("routine-list");
    if (!host) return;
    host.textContent = "";
    ROUTINES.forEach(function (r) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "routine-card" + (r.id === engine.routine.id ? " is-active" : "");
      card.setAttribute("data-id", r.id);

      var emoji = document.createElement("span");
      emoji.className = "routine-emoji";
      emoji.textContent = r.emoji;
      card.appendChild(emoji);

      var name = document.createElement("span");
      name.className = "routine-name";
      name.textContent = r.name;
      card.appendChild(name);

      var meta = document.createElement("span");
      meta.className = "routine-meta";
      meta.textContent = r.exercises.length + " moves \u00B7 " + fmtTime(routineDuration(r));
      card.appendChild(meta);

      card.addEventListener("click", function () {
        loadRoutine(r.id);
        renderRoutines();
        renderExercises();
        renderPlayer();
        renderPlayerFocus();
        setText("player-note", r.name + " \u2014 " + r.note);
      });

      host.appendChild(card);
    });
  }

  function renderExercises() {
    var host = $("exercise-list");
    if (!host) return;
    host.textContent = "";
    engine.routine.exercises.forEach(function (e, i) {
      var row = document.createElement("li");
      row.className = "exercise-row";

      var num = document.createElement("span");
      num.className = "exercise-num";
      num.textContent = String(i + 1);
      row.appendChild(num);

      var nm = document.createElement("span");
      nm.className = "exercise-name";
      nm.textContent = e.name;
      row.appendChild(nm);

      var val = document.createElement("span");
      val.className = "exercise-val";
      val.textContent = exerciseSummary(e);
      row.appendChild(val);

      var rest = document.createElement("span");
      rest.className = "exercise-rest";
      rest.textContent = e.rest > 0 ? "rest " + e.rest + "s" : "";
      row.appendChild(rest);

      host.appendChild(row);
    });
  }

  function renderPlayer() {
    var step = currentStep();
    var total = engine.steps.length;

    if (!step) {
      setText("timer-display", "0:00");
      setText("timer-phase", "Ready");
      setText("timer-exercise", engine.routine.name);
      setText("timer-next", "");
      setVar("progress-width", "0%");
      return;
    }

    setText("timer-display", fmtTime(engine.remaining));
    setText("timer-phase", step.type === "rest" ? "Rest" : "Work");
    setText("timer-exercise", step.name);

    var next = stepAt(engine.steps, engine.index + 1);
    var reps = step.reps > 0 ? " \u00B7 " + step.reps + " reps" : "";
    setText("timer-next", next ? "Next: " + next.name + " (" + fmtTime(next.secs) + ")" : "Last one \u2014 finish strong" + reps);

    var done = engine.index;
    setVar("progress-width", progressPct(done, total).toFixed(1) + "%");

    var phaseEl = $("timer-phase");
    if (phaseEl) phaseEl.className = "timer-phase " + (step.type === "rest" ? "is-rest" : "is-work");

    setText("step-label", "Step " + (engine.index + 1) + " of " + total);

    var start = $("btn-start");
    if (start) start.textContent = engine.running ? "Pause" : "Start";
  }

  function renderPlayerFocus() {
    var el = $("timer-card");
    if (!el) return;
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
  }

  function setVar(name, value) {
    var bar = $("progress-fill");
    if (bar && name === "progress-width") bar.style.width = value;
  }

  function renderHistory() {
    var host = $("history-list");
    var list = sortedLog(state.log);
    if (host) {
      host.textContent = "";
      if (!list.length) {
        var empty = document.createElement("li");
        empty.className = "history-empty";
        empty.textContent = "No workouts logged yet \u2014 your first one starts today \u2665";
        host.appendChild(empty);
      } else {
        list.slice(0, 60).forEach(function (e) {
          var li = document.createElement("li");
          li.className = "history-row";

          var name = document.createElement("span");
          name.className = "history-name";
          name.textContent = e.name;
          li.appendChild(name);

          var when = document.createElement("span");
          when.className = "history-date";
          when.textContent = e.date;
          li.appendChild(when);

          var dur = document.createElement("span");
          dur.className = "history-secs";
          dur.textContent = fmtTime(e.secs);
          li.appendChild(dur);

          host.appendChild(li);
        });
      }
    }

    var stats = summarize(state.log);
    setText("stat-count", stats.count);
    setText("stat-streak", stats.streak);
    setText("stat-total", fmtTime(stats.secs));
    setText("stat-last", stats.last || "never");
  }

  function render() {
    renderRoutines();
    renderExercises();
    renderPlayer();
    renderHistory();
  }

  /* ---------- events ---------- */

  function wire() {
    var start = $("btn-start");
    if (start) start.addEventListener("click", function () {
      if (engine.running) pauseTimer();
      else startTimer();
    });

    var skip = $("btn-skip");
    if (skip) skip.addEventListener("click", skipStep);

    var reset = $("btn-reset");
    if (reset) reset.addEventListener("click", resetTimer);

    var beeps = $("toggle-beeps");
    if (beeps) {
      beeps.checked = state.beeps;
      beeps.addEventListener("change", function () {
        state.beeps = !!beeps.checked;
        save();
      });
    }

    var clear = $("clear-log");
    if (clear) clear.addEventListener("click", function () {
      state.log = [];
      save();
      renderHistory();
      setText("player-note", "History cleared \u2014 a fresh start \u2665");
    });

    var share = $("share-button");
    if (share) share.addEventListener("click", function () {
      var url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: document.title, url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          setText("save-note", "Link copied \u2665");
        }).catch(function () { setText("save-note", url); });
        return;
      }
      setText("save-note", url);
    });
  }

  function boot() {
    load();
    engine.routine = findRoutine(state.lastRoutine);
    engine.steps = buildSteps(engine.routine.exercises);
    engine.remaining = engine.steps.length ? engine.steps[0].secs : 0;
    render();
    wire();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      });
    }
  }

  /* ---------- namespace ---------- */

  window.MenaWorkout = {
    ROUTINES: ROUTINES,
    STORE: STORE,
    pad2: pad2,
    fmtTime: fmtTime,
    dayISO: dayISO,
    shiftDay: shiftDay,
    workSecs: workSecs,
    buildSteps: buildSteps,
    routineDuration: routineDuration,
    stepAt: stepAt,
    progressPct: progressPct,
    findRoutine: findRoutine,
    computeStreak: computeStreak,
    summarize: summarize,
    sortedLog: sortedLog
  };

  document.addEventListener("DOMContentLoaded", boot);
})();
