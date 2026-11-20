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
and a link to UKM’s live tracker in one place. The prototype focuses on a clear, friendly
mobile experience that works on the web and as an installed iPhone app.

## Core features

1. **Campus map** — real Bangi roads, mapped stops and approximate stop areas.
2. **Trip planner** — compare direct and one-transfer trips based on published stop sequences.
3. **Route preview** — manually step through boarding, stops, transfer and alighting.
4. **Timetable** — Zon 1–4 regular hours, stop orders and source links.
5. **Favourites** — save trips on the device.
6. **Service updates** — link to UKM’s MyUKM Smart Bus for live data.
7. **iPhone app** — the same frontend bundled offline in a SwiftUI/WKWebView shell.

## Presentation flow

1. Open the campus map and tap a shuttle stop.
2. Choose KPZ → FTSM and compare the listed options.
3. Open the route preview and step through the itinerary.
4. Save the trip and open it in Favourites.
5. Open Timetable and compare Zon 1 weekday hours with Zon 3 daily hours.
6. Open the bell to show where to check current bus locations and arrivals.

## Technology

- **Web:** React 18 + Vite 6, custom CSS, lucide-react icons
- **Data:** published stop orders and regular hours with OpenStreetMap geography (`src/data/`)
- **Persistence:** `localStorage` for favourites
- **iPhone:** SwiftUI + WKWebView; the built web app is inlined into one HTML file
  so it works offline
- **PWA:** manifest, icons and add-to-home metadata for the hosted web version

## Limitations

- Live vehicle locations, exact departures and disruptions are available through the linked services.
- Route overlays are approximate. Stops without verified geometry remain visible in the itinerary.
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
