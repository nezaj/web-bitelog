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
  const date = new Date(dateStr);
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

// Extract local date from utc timestamp: '2020-06-28T22:06:39.171Z' -> '6/28/2020'
const extractLocalDate = (utcTimeStamp) =>
  new Date(utcTimeStamp).toLocaleDateString();

// Extract local time from utc timestamp: '2020-06-28T22:06:39.171Z' -> '6/28/2020'
const extractLocalTime = (utcTimeStamp) =>
  new Date(utcTimeStamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

// Image Helpers
// ---------------------------------------------------------------------------
// 'https://storage.googleapis.com/media.getbitesnap.com/prod/media/ad/94/b9e0231e449987c56f15aaa7701b.jpeg'
// Becomes
// ad94b9e0231e449987c56f15aaa7701b.jpeg
const getImageId = (url) => url.split("/media/")[1].replace(/\//g, "");

// (TODO): Implement a key shortener
const getImageKey = (url, utcTimestamp) =>
  `${url ? getImageId(url).replace(".jpeg", "") : ""}-${utcTimestamp}`;

const createImageDetail = (key, imageURL, utcTimestamp) => ({
  key,
  imageURL,
  utcTimestamp,
  time: extractLocalTime(utcTimestamp),
  date: extractLocalDate(utcTimestamp),
  macros: { calories: 0, protein: 0, fat: 0, carbs: 0 },
  items: [],
});

module.exports = {
  addDays,
  createImageDetail,
  extractLocalDate,
  extractLocalTime,
  friendlyDate,
  getImageId,
  getImageKey,
};
