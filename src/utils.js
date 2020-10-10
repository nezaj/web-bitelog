/*
 * Various helpers shared across modules
 */

// Date Helpers
// ---------------------------------------------------------------------------
const TODAY = new Date();

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const maxDate = (dates) =>
  dates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
const minDate = (dates) =>
  dates.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const isToday = (date) => {
  return (
    date.getDate() === TODAY.getDate() &&
    date.getMonth() === TODAY.getMonth() &&
    date.getFullYear() === TODAY.getFullYear()
  );
};

const isYesterday = (date) => {
  return isToday(addDays(date, 1));
};

// 1 -> 1st, 2 -> 2nd, 12 -> 12th, 23 -> 23rd, 29 -> 29th
const getDateSuffix = (day) => {
  if (day <= 0 || day >= 32) {
    return "";
  } // should not happen
  if (day === 1 || day === 21 || day === 31) {
    return "st";
  }
  if (day === 2 || day === 22) {
    return "nd";
  }
  if (day === 3 || day === 23) {
    return "rd";
  }
  return "th";
};

// '5/19/2020' -> Tuesday, May 19th, 2020
const friendlyDate = (dateStr) => {
  // We get a babel error on `npm run build` when destructing like so:
  // const [dateMonth, dateDay, dateYear] = dateStr.split("/");
  // So instead we break apart the pieces manually below *sigh*
  const datePieces = dateStr.split("/");
  const dateMonth = parseInt(datePieces[0], 10) - 1; // Months start from 0
  const dateDay = datePieces[1];
  const dateYear = datePieces[2];
  const date = new Date(dateYear, dateMonth, dateDay);
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }

  const weekday = WEEKDAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  const day = `${date.getDate()}${getDateSuffix(date.getDate())}`;
  const year = date.getFullYear();

  return `${weekday}, ${month} ${day}, ${year}`;
};

const MORNING_START = 6;
const AFTERNOON_START = 12;
const EVENING_START = 17;
const LATE_NIGHT_START = 20;
const isMorning = (hour) => MORNING_START <= hour && hour < AFTERNOON_START;
const isAfternnon = (hour) => AFTERNOON_START <= hour && hour < EVENING_START;
const isEvening = (hour) => EVENING_START <= hour && hour < LATE_NIGHT_START;
const isLateNight = (hour) => hour < MORNING_START || LATE_NIGHT_START <= hour;

// mostRecentWeekDayDate('10/09/2020', 'Monday') -> '10/5/2020'
// mostRecentWeekDayDate('10/09/2020', 'Sunday') -> '10/4/2020'
// mostRecentWeekDayDate('10/05/2020', 'Monday') -> '10/5/2020'
// Thanks: https://stackoverflow.com/a/63495407
const mostRecentWeekDayDate = (startDate, weekdayName) => {
  const target =
    WEEKDAYS.indexOf(weekdayName) !== -1 ? WEEKDAYS.indexOf(weekdayName) : 0; // default to Sunday if invalid weekday name
  let copy = new Date(startDate);
  copy.setDate(copy.getDate() - ((copy.getDay() + (7 - target)) % 7));
  return extractDate(copy);
};

// Extract date from local time integer: 20200715182210 -> 2020-07-16T01:22:00.000Z
const localTimeToDate = (localTimeInt) => {
  const dateStr = localTimeInt.toString();
  const year = dateStr.slice(0, 4);
  const month = parseInt(dateStr.slice(4, 6), 10) - 1; // Months start from 0
  const day = dateStr.slice(6, 8);
  const hour = dateStr.slice(8, 10);
  const minute = dateStr.slice(10, 12);
  return new Date(year, month, day, hour, minute);
};

// 2020-08-16T01:22:00.000Z -> '8/16/2020'
const extractDate = (date) =>
  `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

// 2020-08-16T01:22:00.000Z -> '1:22 AM'
const extractTime = (date) => {
  const rawHours = date.getHours();
  const suffix = rawHours > 11 ? "PM" : "AM";
  const hours = rawHours % 12 ? rawHours % 12 : 12; // convert to 12 hour time format, also 0 hour -> 12
  const minutes =
    date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes(); // minutes look weird without zero-padding
  return `${hours}:${minutes} ${suffix}`;
};

// Order doesnt mater
const getHoursBetween = (d1, d2) => {
  return Math.abs((new Date(d1) - new Date(d2)) / (1000 * 60 * 60));
};

// Eating window is just time between starting our first and finishing our last meal rounded up to the nearest whole hour
// We round up because the last timestamp is when we "started" eating and not when we actually "finished"
// As a result we round-up to account for "eating" time
// Note: For days with only one meal will return 1
const eatingWindow = (dates) => {
  if (dates.length === 0) {
    return 0;
  }
  let copy = dates;
  copy.sort((a, b) => new Date(a) - new Date(b));
  const start = copy[0];
  const end = copy[copy.length - 1];
  return Math.ceil(getHoursBetween(start, end)) || 1;
};

// Image Helpers
// ---------------------------------------------------------------------------
// 'https://storage.googleapis.com/media.getbitesnap.com/prod/media/ad/94/b9e0231e449987c56f15aaa7701b.jpeg'
// Becomes
// ad94b9e0231e449987c56f15aaa7701b.jpeg
const getImageId = (url) => url.split("/media/")[1].replace(/\//g, "");

// Generated identifiers for imageDetail map / detail view
// We use both imageURL and mealID to handle cases like when the same photo is used multiple times in a day
// (for example two missing photos, or the same photo used twice to show the same food was eaten at different times)
const getImageKey = (url, mealID) =>
  `${url ? getImageId(url).replace(".jpeg", "") : ""}${mealID}`;

const createImageDetail = (key, imageURL, localTimeInt, mealLabel) => ({
  key,
  imageURL,
  localTimeInt,
  mealLabel,
  time: extractTime(localTimeToDate(localTimeInt)),
  date: extractDate(localTimeToDate(localTimeInt)),
  macros: { calories: 0, protein: 0, fat: 0, carbs: 0 },
  items: [],
});

// Misc
// ---------------------------------------------------------------------------
const round = (num, precision) =>
  Math.round((num + Number.EPSILON) * Math.pow(10, precision)) /
  Math.pow(10, precision);
const _clean = (items) => items.filter((x) => x);
const sum = (items) => _clean(items).reduce((xs, x) => (xs += x), 0);
const avg = (items) => {
  const filtered = _clean(items);
  return filtered.length ? sum(filtered) / filtered.length : null;
};
const max = (items) => Math.max.apply(null, _clean(items)); // work-around for webpack spread-operator issue
const min = (items) => Math.min.apply(null, _clean(items)); // work-around for webpack spread-operator issue

// chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3) => [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
// Thanks: https://stackoverflow.com/a/50766024
const chunk = (arr, size) => {
  return arr.reduce(
    (acc, _, i) =>
      i % size !== 0 ? acc : acc.concat([arr.slice(i, i + size)]),
    []
  );
};

// Doing this so finding references works in VSCode
// See: https://github.com/microsoft/vscode/issues/21507#issuecomment-369118734
module.exports.addDays = addDays;
module.exports.chunk = chunk;
module.exports.createImageDetail = createImageDetail;
module.exports.eatingWindow = eatingWindow;
module.exports.extractDate = extractDate;
module.exports.extractTime = extractTime;
module.exports.friendlyDate = friendlyDate;
module.exports.getImageId = getImageId;
module.exports.getImageKey = getImageKey;
module.exports.localTimeToDate = localTimeToDate;
module.exports.maxDate = maxDate;
module.exports.minDate = minDate;
module.exports.mostRecentWeekDayDate = mostRecentWeekDayDate;
module.exports.round = round;
module.exports.sum = sum;
module.exports.max = max;
module.exports.min = min;
module.exports.avg = avg;
module.exports.isMorning = isMorning;
module.exports.isAfternoon = isAfternnon;
module.exports.isEvening = isEvening;
module.exports.isLateNight = isLateNight;
