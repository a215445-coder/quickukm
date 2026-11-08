# QuickUKM — Project Brief

## Problem

New international students at UKM Bangi often struggle with the campus bus
system. Bus routes, live positions and timetables are scattered or hard to find;
stops are not obvious; and missing a bus can make students late for class.

## Target users

- International students living in UKM hostels (Kolej Kediaman)
- Students travelling between hostels, faculties, the library, Pusanika and the
  main gate
- New students who do not yet know the campus geography

## Solution

QuickUKM is a mobile campus bus companion that puts the map, planner, timetable
and arrival reminders in one place. The prototype focuses on a clear, friendly
mobile experience that works on the web and as an installed iPhone app.

## Core features

1. **Live campus map** — simulated buses moving on a stylised UKM map, with every
   bus stop marked and tappable for next arrivals.
2. **Trip planner** — choose origin and destination, compare direct/transfer
   options, see walking time and the next bus.
3. **Step-by-step navigation** — walk to the stop, board, ride stop-by-stop and
   walk to the destination, with remaining time and a progress map.
4. **Timetable** — Zon A–D services, next departures and stop-by-stop schedules.
5. **Favourites** — save frequent trips such as hostel → faculty or
   hostel → library; stored locally.
6. **Arrival reminders** — simulated arrival and service notifications with a
   master alert switch.
7. **iPhone app** — the same frontend bundled offline in a SwiftUI/WKWebView
   shell, installed through Xcode.

## Demo flow (for the presentation)

1. Open QuickUKM on the phone; the home map shows live (simulated) buses.
2. Tap **Plan a trip**, choose a hostel (e.g. FFAR) and a destination (e.g. FST).
3. Review the route options, next bus and walking times.
4. Start navigation and show the step-by-step ride.
5. Open the bell to show an arrival alert.
6. Switch to Favourites and show a saved hostel → faculty trip.
7. Open Timetable and compare Zon A–D departures.

## Technology

- **Web:** React 18 + Vite 6, custom CSS, lucide-react icons
- **Data:** local simulated routes/stops/schedules (`src/data/`)
- **Persistence:** `localStorage` for favourites and alert preference
- **iPhone:** SwiftUI + WKWebView; the built web app is inlined into one HTML file
  so it works offline
- **PWA:** manifest, icons and add-to-home metadata for the hosted web version

## Limitations

- Bus locations, ETAs and notifications are simulated; there is no real GPS or
  UKM bus API.
- No login, backend, push notifications or live disruption feed.
- Walking times and stop positions are approximate for demonstration.
- The iPhone build uses free personal-team signing, which expires after 7 days.

## Possible next steps

- Integrate real UKM shuttle GPS/ETA data or a crowd-sourced feed.
- Add proper push notifications and background location.
- Support English/Bahasa Melayu/Chinese UI.
- Add accessibility improvements and offline map tiles.
- Publish through TestFlight with a paid Apple Developer account.

## Design reference

The visual direction was informed by Malaysian transit apps such as MyRapid
(large indigo surfaces, white rounded sheets, yellow route codes and green
arrival times). QuickUKM's layout, copy and assets are original. Third-party
reference screenshots are not included in this repository.

## Repository

<https://github.com/a215445-coder/quickukm>

Live web demo: <https://a215445-coder.github.io/quickukm/>
