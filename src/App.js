import React from "react";

import { Bar, Line } from "react-chartjs-2";

import "./App.css";
import DEFAULT_PHOTO from "./images/missing_photo.svg";
import COMPRESSED_LIST from "./data/compressed.js";

// Tab options
const ENTRIES_TAB = "entries";
const TRENDS_TAB = "trends";
const DEFAULT_TAB = ENTRIES_TAB;

// Trends date range options
const LAST_7_DAYS = "lastWeek";
const LAST_30_DAYS = "last30Days";
const LAST_90_DAYS = "last90Days";
const THIS_YEAR = "thisYear";
const DEFAULT_TRENDS_DATE_RANGE = LAST_7_DAYS;

// Corresponds to CSS color scheme
// (TODO): Would be nicer to just define these in one place (either in js or css) and re-use
const PRIMARY_COLOR = "rgba(68, 65, 106, 1)";
const SECONDARY_COLOR = "rgba(0, 0, 0, 0.75)";
const INFO_COLOR = "rgba(64, 50, 50, 0.75)";
const FONT_FAMILY = "Montserrat, Helvetica, sans-serif";

// Chart options
// 800px is cut-off in the css for desktop styling
const CHART_FONT_SIZE = window.screen.width > 800 ? 18 : 14;
const AXIS_PADDING = 5;
const MAX_X_AXIS_ROTATION = 0; // Don't rotate dates, we want them to be easy to read :D
const MAX_TICKS = 5; // Don't crowd the axis

// Dates
const TODAY = new Date();

// Compressed Images
const COMPRESSED_SET = new Set(COMPRESSED_LIST);

// Utils
// ---------------------------------------------------------------------------
const sum = (items) => items.reduce((xs, x) => (xs += x), 0);
const avg = (items) => (items.length ? sum(items) / items.length : null);
const roundedAvg = (items) => Math.round(avg(items));
const descSort = (a, b) => b - a;

// (TODO): This should match what is in compress.js -- think of a way to share functions
// across ES6 and node modules
const getImageId = (url) => url.split("/media/")[1].replace(/\//g, "");

// Returns local compressed image or loads directly from url if we haven't compressed it yet
const getImage = (url) => {
  if (!url) {
    return DEFAULT_PHOTO;
  }
  const id = getImageId(url);

  return COMPRESSED_SET.has(id) ? require(`./images/food/${id}`) : url;
};

// Nutrient Helpers
// ---------------------------------------------------------------------------
const extractNutrient = (nutrients, name) =>
  nutrients.find((x) => x.name === name) || { amount: 0 };

const sumNutrients = (items, name) =>
  Math.round(
    items.reduce(
      (xs, x) => (xs += extractNutrient(x.nutrients, name).amount),
      0
    )
  );

/*
Marshall data into a comfortable format for rendering trend data

Takes in
{
  '6/28/2020' : [ { entry1 }, { entry2 }],
  '6/27/2020' : [ { entry1 }, { entry2 }],
  ...
}

And returns
{
  calories: [[ds, amount], ...],
  protein: [[ds, amount], ...],
  fat: [[ds, amount], ...]
  carbs: [[ds, amount], ...]
}
*/
const nutrientsToDailyTotalsMap = (entriesToDateMap) => {
  return Object.keys(entriesToDateMap).reduce(
    (xs, ds) => {
      xs["calories"].push([ds, sumNutrients(entriesToDateMap[ds], "calories")]);
      xs["protein"].push([ds, sumNutrients(entriesToDateMap[ds], "protein")]);
      xs["fat"].push([ds, sumNutrients(entriesToDateMap[ds], "totalFat")]);
      xs["carbs"].push([ds, sumNutrients(entriesToDateMap[ds], "totalCarb")]);
      return xs;
    },
    { calories: [], protein: [], fat: [], carbs: [] }
  );
};

// Date Helpers
// ---------------------------------------------------------------------------
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

// Trend Helpers
// ---------------------------------------------------------------------------
const filterEntriesToDateMap = (dateRange, entriesToDateMap) => {
  const latestDate = Object.keys(entriesToDateMap).sort(descSort)[0];
  let minDate;
  switch (dateRange) {
    case LAST_30_DAYS:
      minDate = addDays(latestDate, -30);
      break;
    case LAST_90_DAYS:
      minDate = addDays(latestDate, -90);
      break;
    case THIS_YEAR:
      minDate = new Date(new Date().getFullYear(), 1, 1);
      break;
    case LAST_7_DAYS:
    default:
      minDate = addDays(latestDate, -7);
      break;
  }

  const keep = new Set(
    Object.keys(entriesToDateMap).filter((x) => new Date(x) > minDate)
  );
  return Object.keys(entriesToDateMap)
    .filter((x) => keep.has(x))
    .reduce((xs, x) => {
      xs[x] = entriesToDateMap[x];
      return xs;
    }, {});
};

// Location Helpers
// ---------------------------------------------------------------------------
const getLocationTab = (queryString) => {
  const rawValue = new URLSearchParams(queryString).get("tab");
  return [ENTRIES_TAB, TRENDS_TAB].find((x) => x === rawValue) || DEFAULT_TAB;
};

const getLocationDateRange = (queryString) => {
  const rawValue = new URLSearchParams(queryString).get("tdr");
  return (
    [LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS, THIS_YEAR].find(
      (x) => x === rawValue
    ) || DEFAULT_TRENDS_DATE_RANGE
  );
};

// Functional Components
// ---------------------------------------------------------------------------
const Entry = ({ ds, items }) => {
  const rawTotals = items.reduce(
    (xs, x) => {
      xs["cal"] += extractNutrient(x.nutrients, "calories").amount;
      xs["protein"] += extractNutrient(x.nutrients, "protein").amount;
      xs["fat"] += extractNutrient(x.nutrients, "totalFat").amount;
      xs["carb"] += extractNutrient(x.nutrients, "totalCarb").amount;
      return xs;
    },
    { cal: 0, protein: 0, fat: 0, carb: 0 }
  );

  const label = {
    cal: Math.round(rawTotals.cal),
    protein: Math.round(rawTotals.protein),
    fat: Math.round(rawTotals.fat),
    carb: Math.round(rawTotals.carb),
  };

  const entryDate = friendlyDate(ds);

  // Multiple items can have the same image so we de-dupe and ensure earliest photos are first
  const images = [
    ...new Set(
      items.map((i) => getImage(i.imageURL)).reverse() // earliest photos first!
    ),
  ];

  return (
    <div className="day">
      <div className="day-title">
        <div className="day-date">{entryDate}</div>
        <div className="day-macros">
          {label.cal} (Cal) {label.protein} (P) {label.fat}g (F) {label.carb}g
          (C)
        </div>
      </div>
      <div className="day-images">
        {images.map((url, idx) => (
          <img alt="" key={idx} className="day-image" src={url}></img>
        ))}
      </div>
    </div>
  );
};

const LineChart = ({ title, macroData }) => {
  // Earliest entries first
  const cleanCopy = [...macroData].sort();
  const xVals = cleanCopy.map((x) => new Date(x[0]));
  const yVals = cleanCopy.map((x) => x[1]);

  const data = {
    labels: xVals,
    datasets: [
      {
        borderColor: PRIMARY_COLOR,
        borderWidth: 2,
        pointRadius: 2,
        pointBorderWidth: 2,
        pointBackgroundColor: PRIMARY_COLOR,
        fill: false,
        data: yVals,
      },
    ],
  };
  const options = {
    legend: {
      display: false,
      fontColor: INFO_COLOR,
      fontFamily: FONT_FAMILY,
      fontSize: CHART_FONT_SIZE,
    },
    tooltips: {
      callbacks: {
        label: (item, _) => `${title}: ${item.yLabel}`,
      },
    },
    scales: {
      xAxes: [
        {
          type: "time",
          gridLines: { display: false },
          time: {
            tooltipFormat: "MMM DD YYYY",
            minUnit: "day",
          },
          ticks: {
            fontFamily: FONT_FAMILY,
            fontColor: INFO_COLOR,
            fontSize: CHART_FONT_SIZE,
            maxRotation: MAX_X_AXIS_ROTATION,
            maxTicksLimit: MAX_TICKS,
            padding: AXIS_PADDING,
          },
        },
      ],
      yAxes: [
        {
          gridLines: { display: false },
          ticks: {
            fontFamily: FONT_FAMILY,
            fontColor: INFO_COLOR,
            fontSize: CHART_FONT_SIZE,
            maxTicksLimit: MAX_TICKS,
            padding: AXIS_PADDING,
          },
        },
      ],
    },
  };

  return (
    <div className="trends-chart">
      <div className="trends-chart-title">{title}</div>
      <div className="trends-chart-data">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

const FatCarbsChart = ({ title, fatData, carbsData }) => {
  // Earliest entries first
  const cleanFatCopy = [...fatData].sort();
  const cleanCarbsCopy = [...carbsData].sort();

  const timeSeries = cleanFatCopy.map((x) => new Date(x[0]));
  const fatCalories = cleanFatCopy.map((x) => Math.round(x[1] * 9.0));
  const carbsCalories = cleanCarbsCopy.map((x) => Math.round(x[1] * 4.5));

  const data = {
    labels: timeSeries,
    datasets: [
      {
        label: "Fat",
        backgroundColor: PRIMARY_COLOR,
        borderColor: PRIMARY_COLOR,
        borderWidth: 1,
        data: fatCalories,
      },
      {
        label: "Carbs",
        backgroundColor: SECONDARY_COLOR,
        borderColor: SECONDARY_COLOR,
        borderWidth: 1,
        data: carbsCalories,
      },
    ],
  };
  const options = {
    legend: {
      position: "bottom",
      fontFamily: FONT_FAMILY,
      fontColor: INFO_COLOR,
      fontSize: CHART_FONT_SIZE,
    },
    scales: {
      xAxes: [
        {
          type: "time",
          offset: true, // Fixes issue where first/last data was cut off. Thanks: https://stackoverflow.com/a/53496344
          gridLines: { display: false },
          time: {
            tooltipFormat: "MMM DD YYYY",
            minUnit: "day",
          },
          ticks: {
            fontFamily: FONT_FAMILY,
            fontColor: INFO_COLOR,
            fontSize: CHART_FONT_SIZE,
            maxRotation: MAX_X_AXIS_ROTATION,
            maxTicksLimit: MAX_TICKS,
            padding: AXIS_PADDING,
          },
        },
      ],
      yAxes: [
        {
          gridLines: { display: false },
          ticks: {
            fontFamily: FONT_FAMILY,
            fontColor: INFO_COLOR,
            fontSize: CHART_FONT_SIZE,
            maxTicksLimit: MAX_TICKS,
            padding: AXIS_PADDING,
          },
        },
      ],
    },
  };

  return (
    <div className="trends-chart">
      <div className="trends-chart-title">{title}</div>
      <div className="trends-chart-data">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

const Trends = ({ dateRange, updateDateRange, trendData }) => {
  const averageCalories = roundedAvg(trendData.calories.map((x) => x[1]));
  const averageProtein = roundedAvg(trendData.protein.map((x) => x[1]));
  const averageFat = roundedAvg(trendData.fat.map((x) => x[1]));
  const averageCarbs = roundedAvg(trendData.carbs.map((x) => x[1]));

  // Assumption: Fats are 9cals/g, protein and carbs are 4.5g/cal
  // hence fats macros are doubled
  const totalMacros = sum([averageProtein, averageFat * 2, averageCarbs]);
  const pctProtein = Math.round((averageProtein / totalMacros) * 100);
  const pctFat = Math.round(((averageFat * 2) / totalMacros) * 100);
  const pctCarbs = Math.round((averageCarbs / totalMacros) * 100);

  return (
    <div className="trends">
      <div className="trends-date-selector">
        <div
          className={`trends-date-option ${
            dateRange === LAST_7_DAYS ? "active" : "inactive"
          }`}
          onClick={() => updateDateRange(LAST_7_DAYS)}
        >
          Last 7 Days
        </div>
        <div
          className={`trends-date-option ${
            dateRange === LAST_30_DAYS ? "active" : "inactive"
          }`}
          onClick={() => updateDateRange(LAST_30_DAYS)}
        >
          Last 30 Days
        </div>
        <div
          className={`trends-date-option ${
            dateRange === LAST_90_DAYS ? "active" : "inactive"
          }`}
          onClick={() => updateDateRange(LAST_90_DAYS)}
        >
          Last 90 Days
        </div>
        <div
          className={`trends-date-option ${
            dateRange === THIS_YEAR ? "active" : "inactive"
          }`}
          onClick={() => updateDateRange(THIS_YEAR)}
        >
          This Year
        </div>
      </div>

      <div className="trends-summary">
        <div className="trends-summary-calories">
          <div className="trends-summary-calories-title">{averageCalories}</div>
          <div className="trends-summary-calories-subtitle">cal / day</div>
        </div>
        <div className="trends-summary-macros">
          <div className="trends-summary-macro">
            <div className="trends-summary-macro-title">Protein</div>
            <div className="trends-summary-macro-amount">{averageProtein}g</div>
            <div className="trends-summary-macro-pct">{pctProtein}%</div>
          </div>
          <div className="trends-summary-macro">
            <div className="trends-summary-macro-title">Fat</div>
            <div className="trends-summary-macro-amount">{averageFat}g</div>
            <div className="trends-summary-macro-pct">{pctFat}%</div>
          </div>
          <div className="trends-summary-macro">
            <div className="trends-summary-macro-title">Carbs</div>
            <div className="trends-summary-macro-amount">{averageCarbs}g</div>
            <div className="trends-summary-macro-pct">{pctCarbs}%</div>
          </div>
        </div>
      </div>
      <div className="trends-charts-container">
        <LineChart title="Calories" macroData={trendData.calories} />
        <LineChart title="Protein (g)" macroData={trendData.protein} />
        <FatCarbsChart
          title="Fat and Carbs (cal)"
          fatData={trendData.fat}
          carbsData={trendData.carbs}
        />
      </div>
    </div>
  );
};

// Stateful Components
// ---------------------------------------------------------------------------
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: getLocationTab(window.location.search),
      dateRange: getLocationDateRange(window.location.search),
    };
  }

  updateDateRange = (dateRange) => {
    const currentPath = new URLSearchParams(window.location.search);
    currentPath.set("tdr", dateRange);
    const newUrl = window.location.pathname + "?" + currentPath.toString();
    window.history.pushState(null, "", newUrl);
    this.setState({ dateRange });
  };

  updateTab = (tab) => {
    const currentPath = new URLSearchParams(window.location.search);
    currentPath.set("tab", tab);
    const newUrl = window.location.pathname + "?" + currentPath.toString();
    window.history.pushState(null, "", newUrl);
    this.setState({ tab });
  };

  render() {
    const { entriesToDateMap } = this.props;
    const { dateRange, tab } = this.state;

    // Latest entries first
    const renderedEntries = Object.keys(entriesToDateMap)
      .sort(descSort)
      .map((ds, idx) => (
        <Entry key={idx} ds={ds} items={entriesToDateMap[ds]} />
      ));

    const trendData = nutrientsToDailyTotalsMap(
      filterEntriesToDateMap(dateRange, entriesToDateMap)
    );

    return (
      <div className="app">
        <div className="header">
          <a
            href="http://www.joeaverbukh.com"
            title="Visit my personal website"
            className="header-link"
          >
            <div className="header-avatar"></div>
          </a>
          <div className="header-title">Heya I'm Joe!</div>
          <div className="header-subtitle">This is where I track my food</div>
          <div className="separator"></div>
        </div>

        <div className="nav">
          <div
            className={`nav-option ${
              tab === ENTRIES_TAB ? "active" : "inactive"
            }`}
            onClick={() => this.updateTab(ENTRIES_TAB)}
          >
            ENTRIES
          </div>
          <div
            className={`nav-option ${
              tab === TRENDS_TAB ? "active" : "inactive"
            }`}
            onClick={() => this.updateTab(TRENDS_TAB)}
          >
            TRENDS
          </div>
        </div>

        {tab === ENTRIES_TAB && <div className="feed">{renderedEntries}</div>}
        {tab === TRENDS_TAB && (
          <Trends
            dateRange={dateRange}
            updateDateRange={this.updateDateRange}
            trendData={trendData}
          />
        )}
      </div>
    );
  }
}

export default App;
