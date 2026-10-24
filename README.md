# QuickUKM — UKM Campus Bus (Prototype)

A mobile-first frontend prototype of a campus bus app for UKM, built with React + Vite.
All data (buses, arrivals, schedules) is **simulated** — no backend, no login, no real GPS.

## Run it

```bash
npm install
npm run dev
```

- **Desktop preview:** http://localhost:5173
- **Phone (same Wi-Fi):** `http://<your-laptop-ip>:5173` — find your IP on macOS with `ipconfig getifaddr en0`

## Features

- **Home** — stylised campus map with animated simulated buses, tap any stop for live
  (simulated) arrivals, floating quick trip planner, nearby stops, popular routes.
- **Routes** — from/to selectors with swap button, quick picks, direct & transfer options,
  per-stop times and walking tips. Pick a route and hit **Start Navigation** for a simulated
  step-by-step journey: walk to the stop, board, ride stop-by-stop, alight and walk to the
  destination, with map progress, remaining time, Next Step and Exit Navigation. Drag the
  handle on the bottom sheet to collapse it or expand it to half/full screen.
- **Timetable** — filter by Zon (A–D), expandable cards with next departures per stop.
- **Favourites** — saved trips persist across page switches (localStorage), tap one to plan it.
- **Arrival Alerts** — simulated notification cards, master on/off switch, "simulate a
  notification" button. Accessed via the bell icon in the top bar.

## Notes

- Prototype only: simulated data, no real API/GPS/push notifications.
- Favourites and the alert toggle persist in `localStorage`.
