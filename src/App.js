import React from "react";

import { Bar, Line } from "react-chartjs-2";

import "./App.css";
import DEFAULT_PHOTO from "./images/missing_photo.svg";
import COMPRESSED_LIST from "./data/compressed.js";
import {
  extractCalories,
  extractProtein,
  extractFat,
  extractCarbs,
} from "./nutrients.js";
import { nutrientsToDailyTotalsMap, imageDetailMap } from "./marshal.js";
import { addDays, friendlyDate, getImageId } from "./utils.js";

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

// Compressed Images
const COMPRESSED_SET = new Set(COMPRESSED_LIST);

// Utils
// ---------------------------------------------------------------------------
const sum = (items) => items.reduce((xs, x) => (xs += x), 0);
const avg = (items) => (items.length ? sum(items) / items.length : null);
const roundedAvg = (items) => Math.round(avg(items));
const descSort = (a, b) => b - a;
const descSortChartDate = (a, b) => new Date(a[0]) - new Date(b[0]);

// Returns local compressed image or loads directly from url if we haven't compressed it yet
const getImage = (url) => {
  if (!url) {
    return DEFAULT_PHOTO;
  }
  const id = getImageId(url);

  // (TODO): Webpack is unhappy when I try to interpolate a constant for the image path
  // this is annoying since if I ever change the image path for food images
  // I'll need to remember to update it here too
  return COMPRESSED_SET.has(id) ? require(`./images/food/${id}`) : url;
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
const getLocationDetailKey = (queryString) => {
  return new URLSearchParams(queryString).get("detailKey");
};

// Functional Components
// ---------------------------------------------------------------------------
const Entry = ({ ds, items, detailMap, onShowDetail }) => {
  const rawTotals = items.reduce(
    (xs, x) => {
      xs["cal"] += extractCalories(x.nutrients);
      xs["protein"] += extractProtein(x.nutrients);
      xs["fat"] += extractFat(x.nutrients);
      xs["carbs"] += extractCarbs(x.nutrients);
      return xs;
    },
    { cal: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const label = {
    cal: Math.round(rawTotals.cal),
    protein: Math.round(rawTotals.protein),
    fat: Math.round(rawTotals.fat),
    carbs: Math.round(rawTotals.carbs),
  };

  const entryDate = friendlyDate(ds);

  // Ensure earliest photos are first
  const images = Object.keys(detailMap)
    .map((key) => detailMap[key])
    .sort((a, b) => (a.utcTimestamp > b.utcTimestamp ? 1 : -1));

  return (
    <div className="day">
      <div className="day-title">
        <div className="day-date">{entryDate}</div>
        <div className="day-macros">
          <span role="img" aria-label="calories" className="day-macro">
            🔥{label.cal}
          </span>
          <span role="img" aria-label="protein" className="day-macro">
            🍗{label.protein}g
          </span>
          <span role="img" aria-label="fat" className="day-macro">
            🥑️{label.fat}g
          </span>
          <span role="img" aria-label="carbs" className="day-macro">
            🍎{label.carbs}g
          </span>
        </div>
      </div>
      <div className="day-images">
        {images.map((x, idx) => (
          <img
            alt=""
            key={idx}
            className="day-image"
            src={getImage(x.imageURL)}
            onClick={() => onShowDetail(x.key)}
          ></img>
        ))}
      </div>
    </div>
  );
};

const EntryDetailItem = ({
  title,
  subtitle,
  servingQuantity,
  servingUnits,
  calories,
}) => (
  <div className="detail-item">
    <div className="detail-item-name">
      <div className="detail-item-title">{title}</div>
      <div className="detail-item-subtitle">{subtitle}</div>
    </div>
    <div className="detail-item-info">
      <div className="detail-item-servings">
        <div className="detail-item-servings-quantity">{servingQuantity}</div>
        <div className="detail-item-servings-units">{servingUnits}</div>
      </div>
      <div className="detail-item-calories">
        <div className="detail-item-calories-amount">
          {Math.round(calories)}
        </div>
        <div className="detail-item-calories-label">cal</div>
      </div>
    </div>
  </div>
);

const EntryDetail = ({ detail, onClose, onPrev, onNext }) => {
  const closeIcon = "X";
  const prevIcon = "<";
  const nextIcon = ">";
  const { imageURL, time, date, macros, items } = detail;
  return (
    <div className="detail">
      <div className="detail-content">
        <div className="detail-close" onClick={onClose}>
          {closeIcon}
        </div>
        <img className="detail-image" alt="" src={getImage(imageURL)}></img>
        <div className="detail-info">
          <div className="detail-info-header">
            <div className="detail-info-time">{time}</div>
            <div className="detail-info-date">{friendlyDate(date)}</div>
            <hr className="detail-info-separator"></hr>
          </div>
          <div className="detail-macros">
            <span role="img" aria-label="calories" className="detail-macro">
              🔥{Math.round(macros.calories)}
            </span>
            <span role="img" aria-label="protein" className="detail-macro">
              🍗{Math.round(macros.protein)}g
            </span>
            <span role="img" aria-label="fat" className="detail-macro">
              🥑️{Math.round(macros.fat)}g
            </span>
            <span role="img" aria-label="carbs" className="detail-macro">
              🍎{Math.round(macros.carbs)}g
            </span>
          </div>
          <div className="detail-items">
            {items.map((i, idx) => (
              <EntryDetailItem key={idx} {...i} />
            ))}
          </div>
        </div>
        <div className="detail-navs">
          <div
            className="detail-nav"
            onClick={onPrev}
            style={{ visibility: onPrev ? "visible" : "hidden" }}
          >
            {prevIcon}
          </div>
          <div
            className="detail-nav"
            onClick={onNext}
            style={{ visibility: onNext ? "visible" : "hidden" }}
          >
            {nextIcon}
          </div>
        </div>
      </div>
    </div>
  );
};

const LineChart = ({ title, macroData }) => {
  // Earliest entries first
  const cleanCopy = [...macroData].sort(descSortChartDate);
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
  const cleanFatCopy = [...fatData].sort(descSortChartDate);
  const cleanCarbsCopy = [...carbsData].sort(descSortChartDate);

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
      detailKey: getLocationDetailKey(window.location.search),
    };
  }

  closeDetail = () => {
    const currentPath = new URLSearchParams(window.location.search);
    currentPath.delete("detailKey");
    const newUrl = window.location.pathname + "?" + currentPath.toString();
    window.history.pushState(null, "", newUrl);
    this.setState({ detailKey: null });
  };

  updateDateRange = (dateRange) => {
    const currentPath = new URLSearchParams(window.location.search);
    currentPath.set("tdr", dateRange);
    const newUrl = window.location.pathname + "?" + currentPath.toString();
    window.history.pushState(null, "", newUrl);
    this.setState({ dateRange });
  };

  updateDetail = (detailKey) => {
    const currentPath = new URLSearchParams(window.location.search);
    currentPath.set("detailKey", detailKey);
    const newUrl = window.location.pathname + "?" + currentPath.toString();
    window.history.pushState(null, "", newUrl);
    this.setState({ detailKey });
  };

  updateTab = (tab) => {
    const currentPath = new URLSearchParams(window.location.search);
    currentPath.set("tab", tab);
    const newUrl = window.location.pathname + "?" + currentPath.toString();
    window.history.pushState(null, "", newUrl);
    this.setState({ tab });
  };

  render() {
    const { entriesToDateMap, entryDetailMap } = this.props;
    const { dateRange, detailKey, tab } = this.state;

    // Latest entries first
    const renderedEntries = Object.keys(entriesToDateMap)
      .sort(descSort)
      .map((ds, idx) => {
        const items = entriesToDateMap[ds];
        const detailMap = imageDetailMap({ [ds]: items });
        return (
          <Entry
            key={idx}
            ds={ds}
            items={entriesToDateMap[ds]}
            detailMap={detailMap}
            onShowDetail={this.updateDetail}
          />
        );
      });

    const trendData = nutrientsToDailyTotalsMap(
      filterEntriesToDateMap(dateRange, entriesToDateMap)
    );

    const entryDetail = entryDetailMap[detailKey];

    // (TODO): Hacky, clean this up
    // To render previous/next links we convert our detail map to an array and find the previous / next indices
    // We order details from oldest -> newest, ensure we are in bounds, and only allow scrolling through details for the same day
    const entryDetailArray =
      entryDetail &&
      Object.keys(entryDetailMap)
        .map((key) => entryDetailMap[key])
        .sort((a, b) => (a.utcTimestamp > b.utcTimestamp ? 1 : -1));
    const entryDetailIndex =
      entryDetailArray &&
      entryDetailArray.findIndex((x) => x.key === detailKey);
    const prevKey =
      entryDetailIndex &&
      entryDetailIndex > 0 &&
      entryDetail.date === entryDetailArray[entryDetailIndex - 1].date &&
      entryDetailArray[entryDetailIndex - 1].key;
    const nextKey =
      entryDetailIndex &&
      entryDetailIndex < entryDetailArray.length - 1 &&
      entryDetail.date === entryDetailArray[entryDetailIndex + 1].date &&
      entryDetailArray[entryDetailIndex + 1].key;

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

        {detailKey && (
          <EntryDetail
            detail={entryDetail}
            onClose={this.closeDetail}
            onPrev={prevKey ? () => this.updateDetail(prevKey) : null}
            onNext={nextKey ? () => this.updateDetail(nextKey) : null}
          />
        )}
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
