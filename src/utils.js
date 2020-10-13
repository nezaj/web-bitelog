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
];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MS_TO_MS = 1;
const MS_TO_SEC = MS_TO_MS * 1000;
const MS_TO_MIN = MS_TO_SEC * 60;
const MS_TO_HOURS = MS_TO_MIN * 60;
const MS_TO_DAYS = MS_TO_HOURS * 24;
const MS_TO_WEEKS = MS_TO_DAYS * 7;
const MS_TO_UNIT_MAP = {
  ms: MS_TO_MS,
  sec: MS_TO_SEC,
  min: MS_TO_MIN,
  hours: MS_TO_HOURS,
  days: MS_TO_DAYS,
  weeks: MS_TO_WEEKS,
};

const maxDate = (dates) =>
  dates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
const minDate = (dates) =>
  dates.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const addWeeks = (date, weeks) => {
  return addDays(date, 7 * weeks);
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

// getWeekDayName("10/11/2020") -> "Sunday"
const getWeekyDayName = (date) => WEEKDAYS[new Date(date).getDay()];

// getWeekDayName("10/11/2020") -> "Sun"
const getShortWeekyDayName = (date) => SHORT_WEEKDAYS[new Date(date).getDay()];

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

//
const _timeBetween = (d1, d2, label) => {
  const den = MS_TO_UNIT_MAP[label] || MS_TO_MS;
  return Math.abs((new Date(d1) - new Date(d2)) / den);
};
const msBetween = (d1, d2) => _timeBetween(d1, d2, "ms");
const secondsBetween = (d1, d2) => _timeBetween(d1, d2, "sec");
const minutesBetween = (d1, d2) => _timeBetween(d1, d2, "min");
const hoursBetween = (d1, d2) => _timeBetween(d1, d2, "hours");
const daysBetween = (d1, d2) => _timeBetween(d1, d2, "days");
const weeksBetween = (d1, d2) => _timeBetween(d1, d2, "weeks");

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
  return Math.ceil(hoursBetween(start, end)) || 1;
};

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

// nextWeekDayDate('10/01/2020', 'Sunday') -> '10/4/2020'
// nextWeekDayDate('10/01/2020', 'Monday') -> '10/5/2020'
// nextWeekDayDate('10/05/2020', 'Monday') -> '10/5/2020'
const nextWeekDayDate = (startDate, weekdayName) => {
  return mostRecentWeekDayDate(addDays(startDate, 6), weekdayName);
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
// round(10.23, 0) => 10
const _clean = (items) => items.filter((x) => !isNaN(x));
const min = (items) => Math.min.apply(null, _clean(items)); // work-around for webpack spread-operator issue
const max = (items) => Math.max.apply(null, _clean(items)); // work-around for webpack spread-operator issue
const sum = (items) => _clean(items).reduce((xs, x) => (xs += x), 0);
const avg = (items) => {
  const filtered = _clean(items);
  return filtered.length ? sum(filtered) / filtered.length : null;
};
const round = (num, precision) =>
  Math.round((num + Number.EPSILON) * Math.pow(10, precision)) /
  Math.pow(10, precision);

// chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3) => [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
// Thanks: https://stackoverflow.com/a/50766024
const chunk = (arr, size) => {
  return arr.reduce(
    (acc, _, i) =>
      i % size !== 0 ? acc : acc.concat([arr.slice(i, i + size)]),
    []
  );
};

// rotateArrayToVal([1, 2, 3], 2) => [2, 3, 1]
const rotateArrayToVal = (arr, val) => {
  const idx = arr.indexOf(val);
  // Return array as is if val is not in array
  if (idx === -1) {
    return arr;
  }

  return arr.slice(idx).concat(arr.slice(0, idx));
};

// range(3) -> [1, 2, 3]
const range = (n) => new Array(n).fill(1).map((x, idx) => x + idx);

// transformMap((val) => val + 1, {"a": 1, "b": 2}, ["a"]) => {"a": 2}
const transformMap = (fn, _map, keys) =>
  keys.reduce((res, key) => {
    // (XXX): Another "yarn build" gotcha -- we cannot do the commented line below
    // because interpolating [key] does not work when doing production build  :(
    // Object.assign({}, res, { [key]: _buildWeeklyStats(dailyMap[key])})
    res[key] = fn(_map[key]);
    return res;
  }, {});

// collect((item) => item % 2 === 0 ? "even" : "odd", [1, 2, 3]) => {"odd": [1, 3], "even": [2]}
const collect = (fnCollector, items) =>
  items.reduce((res, item) => {
    const key = fnCollector(item);
    res[key] = res[key] || [];
    res[key].push(item);
    return res;
  }, {});

// defaultMap(["a", "b", "c'"], []) => {"a": [], "b": [], "c": []}
const defaultMap = (keys, defaultVal) =>
  keys.reduce((res, key) => {
    res[key] = res[key] || defaultVal;
    return res;
  }, {});

const tuplesToMap = (tuples) =>
  tuples.reduce((res, [k, v]) => {
    res[k] = v;
    return res;
  }, {});

// Partition helpers
const addPartition = (partitions, newPartition) =>
  partitions.concat([newPartition]);
const dropLastPartition = (partitions) => partitions.slice(0, -1);
const extendPartition = (partition, newValue) => partition.concat(newValue);
const extractPartitionHead = (partition) => partition && partition[0];
const extractLastPartition = (partitions) => partitions.slice(-1)[0];
const replaceLastPartition = (partitions, newPartition) =>
  addPartition(dropLastPartition(partitions), newPartition);

// Doing this so finding references works in VSCode
// See: https://github.com/microsoft/vscode/issues/21507#issuecomment-369118734
module.exports.SHORT_MONTHS = SHORT_MONTHS;
module.exports.SHORT_WEEKDAYS = SHORT_WEEKDAYS;
module.exports.WEEKDAYS = WEEKDAYS;

module.exports.addDays = addDays;
module.exports.addWeeks = addWeeks;

module.exports.eatingWindow = eatingWindow;
module.exports.extractDate = extractDate;
module.exports.extractTime = extractTime;
module.exports.friendlyDate = friendlyDate;
module.exports.maxDate = maxDate;
module.exports.minDate = minDate;
module.exports.getShortWeekyDayName = getShortWeekyDayName;
module.exports.getWeekyDayName = getWeekyDayName;
module.exports.localTimeToDate = localTimeToDate;
module.exports.mostRecentWeekDayDate = mostRecentWeekDayDate;
module.exports.nextWeekDayDate = nextWeekDayDate;

module.exports.msBetween = msBetween;
module.exports.secondsBetween = secondsBetween;
module.exports.minutesBetween = minutesBetween;
module.exports.hoursBetween = hoursBetween;
module.exports.daysBetween = daysBetween;
module.exports.hoursBetween = hoursBetween;
module.exports.weeksBetween = weeksBetween;

module.exports.createImageDetail = createImageDetail;
module.exports.getImageId = getImageId;
module.exports.getImageKey = getImageKey;

module.exports.min = min;
module.exports.max = max;
module.exports.sum = sum;
module.exports.avg = avg;
module.exports.round = round;

module.exports.chunk = chunk;
module.exports.rotateArrayToVal = rotateArrayToVal;
module.exports.range = range;
module.exports.transformMap = transformMap;
module.exports.collect = collect;
module.exports.defaultMap = defaultMap;
module.exports.tuplesToMap = tuplesToMap;

module.exports.addPartition = addPartition;
module.exports.dropLastPartition = dropLastPartition;
module.exports.extendPartition = extendPartition;
module.exports.extractPartitionHead = extractPartitionHead;
module.exports.extractLastPartition = extractLastPartition;
module.exports.replaceLastPartition = replaceLastPartition;
