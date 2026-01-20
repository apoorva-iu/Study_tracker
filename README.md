Assignments & Study Tracker

A lightweight frontend app for tracking assignments, timetables, badges and gamification features.

- Files: core pages under the project root (index.html, script.js, style.css, sw.js)
- UI assets: css/ and js/ folders contain modular styles and scripts for pages
- Pages: pages/ contains per-page HTML (login, signup, profile, timetable, badges, gamification)

Quick start
- Open index.html in a browser (no build step required).

Dark theme search-bar fix
- Fixed an issue where search input text became unreadable in dark mode by:
  - Setting `--text-light` to the light text value in dark mode (`--text-dark`).
  - Making the `.search-bar` background use `--card-light` so it follows the current theme.

If you'd like, I can also:
- Add a theme toggle persistence (localStorage)
- Improve contrast for specific components

Enjoy — tell me if you want the README extended with usage or contributor notes.
