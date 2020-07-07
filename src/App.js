import React from "react";

import { Bar, Line } from "react-chartjs-2";

import "./App.css";

const ENTRIES_TAB = "entries";
const TRENDS_TAB = "trends";
const DEFAULT_TAB = ENTRIES_TAB;

// Corresponds to CSS color scheme
const PRIMARY_COLOR = "rgba(68, 65, 106, 1)";
const SECONDARY_COLOR = "rgba(0, 0, 0, 0.75)";
const INFO_COLOR = "rgba(64, 50, 50, 0.75)";
const FONT_FAMILY = "Montserrat, Helvetica, sans-serif";

// Chart options
const CHART_FONT_SIZE = 14;

// Helpers
// ---------------------------------------------------------------------------
const extractNutrient = (nutrients, name) =>
  nutrients.find((x) => x.name === name);

const getLocationTab = (queryString) => {
  const rawValue = new URLSearchParams(queryString).get("tab");
  return [ENTRIES_TAB, TRENDS_TAB].find((x) => x === rawValue) || DEFAULT_TAB;
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
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
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

  // Multiple items can have the same image so we de-dupe and remove missing data
  const images = [...new Set(items.map((i) => i.imageURL).filter((x) => x))];

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
        {images.map((i, idx) => (
          <img alt="" key={idx} className="day-image" src={i}></img>
        ))}
      </div>
    </div>
  );
};

const LineChart = ({ title }) => {
  const data = {
    labels: ["Jan", "Feb", "Mar"],
    datasets: [
      {
        borderColor: PRIMARY_COLOR,
        borderWidth: 1,
        pointRadius: 2,
        pointBorderWidth: 2,
        pointBackgroundColor: PRIMARY_COLOR,
        fill: false,
        data: [65, 59, 80],
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
    responsive: true,
    scales: {
      xAxes: [
        {
          gridLines: { display: false },
          ticks: {
            fontFamily: FONT_FAMILY,
            fontColor: INFO_COLOR,
            fontSize: CHART_FONT_SIZE,
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

const FatCarbsChart = () => {
  const data = {
    labels: ["Jan", "Feb", "Mar"],
    datasets: [
      {
        label: "Fat",
        backgroundColor: PRIMARY_COLOR,
        borderColor: PRIMARY_COLOR,
        borderWidth: 1,
        data: [65, 59, 80],
      },
      {
        label: "Carbs",
        backgroundColor: SECONDARY_COLOR,
        borderColor: SECONDARY_COLOR,
        borderWidth: 1,
        data: [80, 59, 65],
      },
    ],
  };
  const options = {
    responsive: true,
    legend: {
      position: "bottom",
      fontFamily: FONT_FAMILY,
      fontColor: INFO_COLOR,
      fontSize: CHART_FONT_SIZE,
    },
    scales: {
      xAxes: [
        {
          gridLines: { display: false },
          ticks: {
            fontFamily: FONT_FAMILY,
            fontColor: INFO_COLOR,
            fontSize: CHART_FONT_SIZE,
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
          },
        },
      ],
    },
  };

  return (
    <div className="trends-chart">
      <div className="trends-chart-title">Fat and Carbs</div>
      <div className="trends-chart-data">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

const Trends = () => {
  return (
    <div className="trends">
      <div className="trends-date-selector">
        <div className="trends-date-option">Last 7 Days</div>
        <div className="trends-date-option">Last 30 Days</div>
        <div className="trends-date-option">Last 90 Days</div>
        <div className="trends-date-option">This Year</div>
      </div>

      <div className="trends-summary">
        <div className="trends-summary-calories">
          <div className="trends-summary-calories-title">2000</div>
          <div className="trends-summary-calories-subtitle">cal / day</div>
        </div>
        <div className="trends-summary-macros">
          <div className="trends-summary-macro">
            <div className="trends-summary-macro-title">Protein</div>
            <div className="trends-summary-macro-amount">110g</div>
            <div className="trends-summary-macro-pct">33%</div>
          </div>
          <div className="trends-summary-macro">
            <div className="trends-summary-macro-title">Fat</div>
            <div className="trends-summary-macro-amount">110g</div>
            <div className="trends-summary-macro-pct">33%</div>
          </div>
          <div className="trends-summary-macro">
            <div className="trends-summary-macro-title">Carbs</div>
            <div className="trends-summary-macro-amount">110g</div>
            <div className="trends-summary-macro-pct">24%</div>
          </div>
        </div>
      </div>
      <div className="trends-charts-container">
        <LineChart title="Calories" />
        <LineChart title="Protein" />
        <FatCarbsChart title="Fat and Carbs" />
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
    };
  }

  updateTab = (tabName) => {
    const currentPath = new URLSearchParams(window.location.search);
    currentPath.set("tab", tabName);
    const newUrl = window.location.pathname + "?" + currentPath.toString();
    window.history.pushState(null, "", newUrl);
    this.setState({ tab: getLocationTab(window.location.search) });
  };

  render() {
    const { entries } = this.props;
    const { tab } = this.state;
    const renderedEntries = Object.keys(entries).map((ds) => (
      <Entry ds={ds} items={entries[ds]} />
    ));

    return (
      <div className="app">
        <div className="header">
          <div className="header-avatar"></div>
          <div className="header-title">Heya I'm Joe!</div>
          <div className="header-subtitle">This is where I track my food</div>
          <div className="separator"></div>
        </div>

        <div className="nav">
          <div
            className={`nav-item ${
              tab === ENTRIES_TAB ? "nav-item-active" : "nav-item-inactive"
            }`}
            onClick={() => this.updateTab(ENTRIES_TAB)}
          >
            ENTRIES
          </div>
          <div
            className={`nav-item ${
              tab === TRENDS_TAB ? "nav-item-active" : "nav-item-inactive"
            }`}
            onClick={() => this.updateTab(TRENDS_TAB)}
          >
            TRENDS
          </div>
        </div>

        {tab === ENTRIES_TAB && <div className="feed">{renderedEntries}</div>}
        {tab === TRENDS_TAB && <Trends />}
      </div>
    );
  }
}

export default App;
