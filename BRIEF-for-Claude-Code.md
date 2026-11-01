# Brief: turn my gym logger into a phone app (PWA)

## What I want
- A phone app I open from my home screen, with **no Claude, no login and no internet needed** at the gym.
- Data is saved **on the phone only**. No cloud, no accounts.
- It must never lose a workout mid-session (a session takes about 45 minutes).

## What already exists
`reference-gymlog.html` is a working single-file version that runs inside claude.ai. **Reuse its UI, programme data and logic**. Do not redesign it.
- Four day tabs (Push, Pull, Legs, Arms), a Month 1 / Month 2 / Jan switch, a Gym / Home switch, a date picker.
- Each exercise shows sets, reps, rest and cue. Each set has kg, reps and a tick. "Last time" values show under each exercise, with a "Use these" button.
- Supersets are marked. Assisted chin-up logs assistance kg (lower is stronger). Some items are timed (seconds). Some are notes only (Squat Tabata, Finisher: Seven).
- Log and History tabs, "Finish session", and "Copy all history as text".
- The programme data lives in the `PROG` object. Keep it exactly as is. It follows my trainer Gavin's sheets (Month 1) and a same-sets-and-reps variation (Month 2).
- Session ids look like `2026-10-28_push_jan`, with `_home` added for home sessions. Keep that scheme.

## What to change
1. **Replace the claude.ai database.** The reference uses `window.claude.use("db")`. Remove it and every other `window.claude` reference. Store sessions in **IndexedDB** (one object store, keyed by session id), saving about 700ms after each change and immediately when the page is hidden (`visibilitychange`, `pagehide`).
2. Call `navigator.storage.persist()` on first run so iOS and Android do not evict the data.
3. Load `seed-history.json` into the store on first run only. Do not overwrite existing data.
4. Add **Export backup** (downloads a JSON file) and **Import backup** (merges by session id, newest `updated` wins) under History. Show a gentle reminder to export if the last backup is more than 14 days old.
5. Remove the `claude:viewport-fit-sides` meta tag and the artifact-specific code. Keep the safe-area padding and the dark and light theme tokens.
6. **Self-host the fonts** (Barlow and Barlow Condensed). Download the files into the project and use `@font-face`, so it looks right offline. Do not load Google Fonts at runtime.
7. Keep a screen **wake lock** while a session is open (`navigator.wakeLock`), and tolerate it being refused.

## PWA files to add
- `manifest.webmanifest`: name "Lift Log", `display: standalone`, `orientation: portrait`, `start_url: ./`, theme and background colours from the page tokens, 192 and 512 icons, plus a maskable icon.
- `sw.js`: precache every file, cache-first, bump a version string to update. Register it from the page.
- Icons: a simple dumbbell on the steel-blue accent. Include `apple-touch-icon` (180px).
- `<meta name="theme-color">` and the iOS meta tags (`apple-mobile-web-app-capable`, status bar style, title).
- Keep it a plain HTML, CSS and JS project. **No framework and no build step.** It should work when opened from any static host.

## Deploy
Deploy it free on **GitHub Pages** (or Cloudflare Pages). Walk me through each step, since I have not done this before. Use a repo name like `lift-log`. At the end give me the final URL.

## Check before you tell me it is done
- Open it in a headless browser at 400px wide and check there is no horizontal scroll.
- Log sets on Push, switch to Pull and back, reload the page. Everything must still be there.
- Switch the browser offline and reload. It must still open.
- Export a backup, clear the data, import the backup. Everything must come back.
- Test the "Last time" values: log a session today, change the date to tomorrow, check yesterday's numbers appear.
- Run a test that all programme exercises have unique keys per plan and that no plan is empty.

## Tell me at the end (short)
- The URL.
- How to install it on an iPhone and on Android.
- How to back up my data.
