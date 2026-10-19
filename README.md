# Our Workout — Love for Mena

Preset **bodyweight routines** with a workout + rest timer, gentle Web Audio
beeps, a completion log, a day streak and a history. No gym, no kit — just the
two of us moving. Part of the **Love for Mena** collection.

**Live:** https://menaammarpro.github.io/love-workout/

## What it does

- **Six preset routines** — a gentle wake-up, a cardio burst, core, legs, a
  full-body plan, and a stretch to finish.
- Each exercise is **timed (seconds) or rep-based (reps)** with a rest after.
- A **workout timer** counts each set down and beeps you in (`3·2·1` ticks,
  a rest tone, a finish chime) via the Web Audio API — no audio files.
- A **rest timer** between sets, and a progress bar across the routine.
- Every finished session is **logged** with its duration.
- A **day streak** and a **history** of recent sessions, plus total time.
- Everything is stored on the device only — no tracking, no network calls.
- Installable PWA with offline support.

## How it works

Pick a routine, press **Start**, and the timer walks you through it. Rep-based
exercises are estimated at ~3 s per rep for the timer but show the rep target.
Toggle **Beeps** on or off at any time.

Data lives in `localStorage` under `mena-workout`:
`{ routines: [], log: [{ date, name, secs, at }], beeps, lastRoutine }`.
To edit the routines, change the `ROUTINES` array at the top of `js/app.js`.

Pure logic (timer maths, routine building, streak, summary) is exposed on
`window.MenaWorkout` and covered by `test/harness.js`:

```powershell
node test/harness.js
```

## Files

- `index.html` — the page
- `css/theme.css` — shared love-theme (copied from `_love-theme/`)
- `css/app.css` — page-specific styles
- `js/theme-main.js`, `js/effects.js` — shared behaviour/effects
- `js/app.js` — workout logic (`window.MenaWorkout`)
- `tools/make-icons.js` — dependency-free icon generator
- `manifest.webmanifest`, `sw.js` — PWA
- `assets/` — favicon and icons

## Run locally

```powershell
py -m http.server 8000
```

Then visit http://localhost:8000.

## Deploy

Static site, deployed with GitHub Pages from `main`.

## License

Creative Commons BY-NC-ND 4.0 — see [`LICENSE`](LICENSE).
© 2026 Ammar (MenaAmmarPro). Made with care for Mena.
