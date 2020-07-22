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
  const [dateMonth, dateDay, dateYear] = dateStr.split("/");
  const date = new Date(dateYear, parseInt(dateMonth, 10) - 1, dateDay); // Months start from 0
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
  const suffix = rawHours > 12 ? "PM" : "AM";
  const hours = rawHours % 12 ? rawHours % 12 : 12; // convert to 12 hour time format, also 0 hour -> 12
  const minutes =
    date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes(); // minutes look weird without zero-padding
  return `${hours}:${minutes} ${suffix}`;
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

const createImageDetail = (key, imageURL, localTimeInt) => ({
  key,
  imageURL,
  localTimeInt,
  time: extractTime(localTimeToDate(localTimeInt)),
  date: extractDate(localTimeToDate(localTimeInt)),
  macros: { calories: 0, protein: 0, fat: 0, carbs: 0 },
  items: [],
});

// Doing this so finding references works in VSCode
// See: https://github.com/microsoft/vscode/issues/21507#issuecomment-369118734
module.exports.addDays = addDays;
module.exports.createImageDetail = createImageDetail;
module.exports.extractDate = extractDate;
module.exports.extractTime = extractTime;
module.exports.friendlyDate = friendlyDate;
module.exports.getImageId = getImageId;
module.exports.getImageKey = getImageKey;
module.exports.localTimeToDate = localTimeToDate;
