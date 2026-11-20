// Scheduled origin departures transcribed from the linked Moovit tables.
// Keep the midday and evening breaks explicit rather than generating intervals.
const localMorning = '07:30 08:00 08:30 09:00 09:30 10:00 10:30 11:00 11:30 12:00 12:30';
const localAfternoon = '14:30 15:00 15:30 16:00 16:30 17:00 17:30 18:00 18:30 19:00 19:45 20:00 20:30 21:00 21:30 22:00 22:30 23:00 23:30';
const local = {
  weekday: `${localMorning} 13:00 14:00 ${localAfternoon}`.split(' '),
  friday: `${localMorning} ${localAfternoon}`.split(' '),
  weekend: [],
};

const komuterMorning = '07:30 08:00 08:30 09:00 09:30 10:00 10:30 11:00 11:30 12:00';
const komuterAfternoon = '14:30 15:00 15:30 16:00 16:30 17:00 17:30 18:00 18:30 19:00 20:00 20:30 21:00 21:30 22:00';
const komuterStandard = `${komuterMorning} 12:30 13:00 14:00 ${komuterAfternoon}`.split(' ');
const komuter = {
  weekday: komuterStandard,
  friday: `${komuterMorning} ${komuterAfternoon}`.split(' '),
  weekend: komuterStandard,
};

export const PUBLISHED_DEPARTURES = {
  // Moovit timetable IDs: 8010908 (1), 7938938 (2), 8010909 (3), 8027146 (4).
  1: { days: local, publisher: 'Moovit' },
  2: { days: local, publisher: 'Moovit' },
  3: { days: komuter, publisher: 'Moovit' },
  4: { days: komuter, publisher: 'Moovit' },
};
