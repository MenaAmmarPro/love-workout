"use strict";

/*
 * love-workout — Node harness (no dependencies).
 *
 * Loads js/app.js inside a fake-DOM sandbox and asserts the pure logic
 * (timer maths, routine building, streak, summary). Run with:
 *
 *   node test/harness.js
 */

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const store = {};

const el = () => ({
  style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  dataset: {},
  appendChild() {},
  addEventListener() {},
  setAttribute() {},
  removeAttribute() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  focus() {},
  remove() {},
  innerHTML: "",
  textContent: "",
  value: ""
});

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  JSON,
  Intl,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => el(),
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    documentElement: { classList: { add() {}, remove() {}, toggle() {} } }
  },
  navigator: { language: "en", clipboard: { writeText: async () => {} } },
  requestAnimationFrame: (fn) => setTimeout(fn, 0)
};

sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const files = process.argv.slice(2);
for (const f of (files.length ? files : [path.join("js", "app.js")])) {
  vm.runInContext(fs.readFileSync(f, "utf8"), sandbox, { filename: f });
}

/* ---------------- assertions ---------------- */

const W = sandbox.window.MenaWorkout;

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL: " + msg);
    failures += 1;
    process.exitCode = 1;
  } else {
    console.log("ok - " + msg);
  }
}

assert(!!W, "namespace exposed");

/* fmtTime */
assert(W.fmtTime(0) === "0:00", "fmtTime(0) is 0:00");
assert(W.fmtTime(65) === "1:05", "fmtTime(65) is 1:05");
assert(W.fmtTime(600) === "10:00", "fmtTime(600) is 10:00");
assert(W.fmtTime(-4) === "0:00", "fmtTime clamps negatives");

/* workSecs */
assert(W.workSecs({ secs: 30, reps: 0 }) === 30, "timed exercise uses secs");
assert(W.workSecs({ secs: 0, reps: 15 }) === 45, "rep exercise estimates 3s/rep");
assert(W.workSecs({ secs: 0, reps: 0 }) === 10, "rep exercise floors at 10s");

/* buildSteps */
const steps = W.buildSteps([
  { name: "A", secs: 10, reps: 0, rest: 5 },
  { name: "B", secs: 0, reps: 10, rest: 0 }
]);
assert(steps.length === 3, "buildSteps expands work + rest");
assert(steps[0].type === "work" && steps[1].type === "rest" && steps[2].type === "work", "step types in order");
assert(steps[2].secs === 30, "rep step converted to seconds");
assert(W.routineDuration({ exercises: [
  { name: "A", secs: 10, reps: 0, rest: 5 },
  { name: "B", secs: 0, reps: 10, rest: 0 }
] }) === 45, "routineDuration sums work + rest");

/* stepAt */
assert(W.stepAt(steps, 0).name === "A", "stepAt(0)");
assert(W.stepAt(steps, 99).name === "B", "stepAt clamps high");
assert(W.stepAt(steps, -5).name === "A", "stepAt clamps low");
assert(W.stepAt([], 0) === null, "stepAt on empty is null");

/* progressPct */
assert(W.progressPct(0, 10) === 0, "progress 0");
assert(W.progressPct(5, 10) === 50, "progress 50");
assert(W.progressPct(20, 10) === 100, "progress clamps at 100");
assert(W.progressPct(3, 0) === 0, "progress guards zero total");

/* findRoutine */
assert(W.findRoutine("cardio").id === "cardio", "findRoutine by id");
assert(W.findRoutine("nope").id === W.ROUTINES[0].id, "findRoutine falls back to first");
assert(W.ROUTINES.length >= 5, "several preset routines ship");

/* computeStreak */
const today = W.dayISO();
const yest = W.shiftDay(today, -1);
const before = W.shiftDay(today, -2);
const old = W.shiftDay(today, -5);
assert(W.computeStreak([{ date: today }, { date: yest }, { date: before }], today) === 3, "streak counts consecutive days");
assert(W.computeStreak([{ date: today }, { date: before }], today) === 1, "streak stops at a gap");
assert(W.computeStreak([{ date: yest }, { date: before }], today) === 2, "streak may start yesterday");
assert(W.computeStreak([], today) === 0, "empty log has no streak");
assert(W.computeStreak([{ date: old }], today) === 0, "old-only log has no streak");

/* summarize */
const sum = W.summarize([
  { date: today, name: "A", secs: 100, at: 2 },
  { date: yest, name: "B", secs: 50, at: 1 }
], today);
assert(sum.count === 2, "summary counts entries");
assert(sum.secs === 150, "summary sums seconds");
assert(sum.streak === 2, "summary streak");
assert(sum.last === today, "summary finds latest date");

/* sortedLog */
const sl = W.sortedLog([
  { date: today, at: 1, name: "old" },
  { date: today, at: 9, name: "new" }
]);
assert(sl[0].name === "new", "sortedLog puts newest first");

console.log(failures ? ("\n" + failures + " failing assertion(s)") : "\nAll love-workout harness checks passed.");
