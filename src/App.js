import React from "react";

import ReactMarkdown from "react-markdown";
import Mousetrap from "mousetrap";
import { Line } from "react-chartjs-2";
import ApexChart from "react-apexcharts";
import SwipeableViews from "react-swipeable-views";
import { virtualize } from "react-swipeable-views-utils";
import { mod } from "react-swipeable-views-core";

import "./App.css";
import DEFAULT_PHOTO from "./images/missing_photo.svg";
import COMPRESSED_LIST from "./data/compressed.js";
import { HEALTH_BODY_MASS_KEY, HEALTH_WATER_KEY } from "./constants.js";
import {
  extractCalories,
  extractProtein,
  extractFat,
  extractCarbs,
} from "./nutrients.js";
import {
  healthToDailyTotalsMap,
  nutrientsToDailyTotalsMap,
  imageDetailMap,
  weeklyNutrientsStatsMap,
  weeklyHealthStatsMap,
  hourlyNutrientsStatsMap,
} from "./marshal.js";
import {
  addDays,
  eatingWindow,
  extractDate,
  friendlyDate,
  getImageId,
  round,
  sum,
  avg,
  SHORT_MONTHS,
  removeNonAlphaFromString,
  isAlphaString,
  numWords,
} from "./utils.js";

const VirtualizeSwipeableViews = virtualize(SwipeableViews);

// Tab options
const ENTRIES_TAB = "entries";
const TRENDS_TAB = "trends";
const REFLECTIONS_TAB = "reflections";
const DEFAULT_TAB = ENTRIES_TAB;

// Entries
const MIN_ENTRY_PAGE = 1;
const ENTRIES_PER_PAGE = 7;

// Trends date range options
const LAST_7_DAYS = "lastWeek";
const LAST_30_DAYS = "last30Days";
const LAST_90_DAYS = "last90Days";
const THIS_YEAR = "thisYear";
const ALL_TIME = "allTime";
const YEAR_2020 = "year2020";
const DEFAULT_TRENDS_DATE_RANGE = LAST_7_DAYS;

// Heatmap Options
const HOURLY_HEATMAP_HEIGHT = window.screen.width > 800 ? 200 : 125;
const MAX_X_AXIS_HOURLY_TICKS = 8;

// Calorie Heatmp
const LOW_CALORIES_THRESHOLD_START = 0;
const LOW_CALORIES_THRESHOLD_END = 1600;
const TARGET_CALORIES_THRESHOLD_START = LOW_CALORIES_THRESHOLD_END + 1;
const TARGET_CALORIES_THRESHOLD_END = 2400;
const EXCESS_CALORIES_THRESHOLD_START = TARGET_CALORIES_THRESHOLD_END + 1;
const EXCESS_CALORIES_THRESHOLD_END = 9999;
const LOW_RANGE_COLOR = "#3D99AC";
const TARGET_RANGE_COLOR = "#47AA35";
const EXCESS_RANGE_COLOR = "#DE281F";

// Water Heatmap
const GOAL_WATER_THRESHOLD = 8;
const BELOW_GOAL_WATER_COLOR = "#CFCCCC";
const GOAL_WATER_COLOR = "#2DC7FF";

// Corresponds to CSS color scheme
// (TODO): Would be nicer to just define these in one place (either in js or css) and re-use
const PRIMARY_COLOR = "rgba(68, 65, 106, 1)";
// eslint-disable-next-line
const SECONDARY_COLOR = "rgba(0, 0, 0, 0.75)";
const INFO_COLOR = "rgba(64, 50, 50, 0.75)";
const FONT_FAMILY = "Montserrat, Helvetica, sans-serif";

// Chart options
// 800px is cut-off in the css for desktop styling
const CHART_FONT_SIZE = window.screen.width > 800 ? 18 : 14;
const AXIS_PADDING = 5;
const MAX_X_AXIS_ROTATION = 0; // Don't rotate dates, we want them to be easy to read :D
const MAX_TICKS = 5; // Don't crowd the axis
const STATS_BACKGROUND_COLOR = "rgba(68, 65, 106, 0.3)";
const NO_DATA_TOOLTIP_VALUE = "N/A";
const NO_DATA_COLOR = "#fff";

// Reflections
const REFLECTION_THRESHOLD = 80;

// Compressed Images
const COMPRESSED_SET = new Set(COMPRESSED_LIST);

// Utils
// ---------------------------------------------------------------------------
const roundedAvg = (items) => Math.round(avg(items));
const descSort = (second, first) => second - first;
const ascLocalTime = (second, first) =>
  second.localTimeInt <= first.localTimeInt ? -1 : 1;
const descCalorieSort = (second, first) =>
  second.calories < first.calories ? 1 : -1;

// Returns local compressed image or loads directly from url if we haven't compressed it yet
const getImage = (url) => {
  if (!url) {
    return DEFAULT_PHOTO;
  }
  const id = getImageId(url);

  if (COMPRESSED_SET.has(id)) {
    try {
      // (TODO): Webpack is unhappy when I try to interpolate a constant for the image path
      // this is annoying since if I ever change the image path for food images
      // I'll need to remember to update it here too
      return require(`./images/food/${id}`);
    } catch (err) {
      console.log(
        `Error loading compressed image for ${id}, falling back on ${url}`
      );
      return url;
    }
  }

  return url;
};
// Entry Helpers
// ---------------------------------------------------------------------------
const getMaxEntryPage = (numEntries) =>
  Math.ceil(numEntries / ENTRIES_PER_PAGE);

// Trend Helpers
// ---------------------------------------------------------------------------
const filterEntries = (dateRange, entriesToDateMap) => {
  const sortedDate = Object.keys(entriesToDateMap).sort((second, first) =>
    new Date(second) <= new Date(first) ? 1 : -1
  );
  const latestDate = sortedDate[0];
  const earliestDate = sortedDate.slice(-1)[0];
  let minDate;
  switch (dateRange) {
    case LAST_30_DAYS:
      minDate = addDays(latestDate, -30);
      break;
    case LAST_90_DAYS:
      minDate = addDays(latestDate, -90);
      break;
    case THIS_YEAR:
      minDate = new Date(new Date().getFullYear(), 0, 1);
      break;
    case ALL_TIME:
      minDate = addDays(earliestDate, -1);
      break;
    case YEAR_2020:
      minDate = new Date(2020, 0, 1);
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
  return [ENTRIES_TAB, TRENDS_TAB, REFLECTIONS_TAB].find((x) => x === rawValue) || DEFAULT_TAB;
};

const getLocationDateRange = (queryString) => {
  const rawValue = new URLSearchParams(queryString).get("tdr");
  return (
    [
      LAST_7_DAYS,
      LAST_30_DAYS,
      LAST_90_DAYS,
      THIS_YEAR,
      ALL_TIME,
      YEAR_2020,
    ].find((x) => x === rawValue) || DEFAULT_TRENDS_DATE_RANGE
  );
};
const getLocationDetailKey = (queryString) => {
  return new URLSearchParams(queryString).get("detailKey");
};

const getLocationEntryPage = (queryString, numEntries) => {
  const entryPage = new URLSearchParams(queryString).get("entryPage");
  if (!entryPage || entryPage < MIN_ENTRY_PAGE || isNaN(entryPage)) {
    updateLocation("entryPage", MIN_ENTRY_PAGE);
    return 1;
  }

  // Limit entry page to max page
  const maxEntryPage = getMaxEntryPage(numEntries);
  if (entryPage > maxEntryPage) {
    updateLocation("entryPage", maxEntryPage);
    return maxEntryPage;
  }

  return entryPage;
};

const deleteLocation = (key) => {
  const currentPath = new URLSearchParams(window.location.search);
  currentPath.delete(key);
  const newUrl = window.location.pathname + "?" + currentPath.toString();
  window.history.pushState(null, "", newUrl);
};

const updateLocation = (key, value) => {
  const currentPath = new URLSearchParams(window.location.search);
  currentPath.set(key, value);
  const newUrl = window.location.pathname + "?" + currentPath.toString();
  window.history.pushState(null, "", newUrl);
};

// Functional Components
// ---------------------------------------------------------------------------
const _getImageDetailSubtitle = (imageDetail) => {
  // We'll use the food that contributed the most calories as the image's subtitle
  // (TODO): Considering moving this logic into building the image detail instead
  // of doing it ad-hoc here
  const mainFoodName = imageDetail.items.slice().sort(descCalorieSort)[0].title;
  return _getFoodSubtitle(mainFoodName);
};

// We show at most first three words of a food
// Special case: Return empty string if this was a fast
// Special case: There is a non-alphabetical character in the second word,
// in this case we only show the first two words and remove all non-alphabetical
// characters
const _getFoodSubtitle = (foodTitle) => {
  if (foodTitle === "Fast") return "";

  const split = foodTitle.split(" ").slice(0, 3);
  // ["Mixed", "Nuts,", "Dry"] -> "Mixed Nuts"
  if (split.length > 1 && !isAlphaString(split[1])) {
    const trimmed = split.slice(0, 2).join(" ");
    return removeNonAlphaFromString(trimmed);
  } else {
    return removeNonAlphaFromString(split.join(" "));
  }
};

const Entry = ({ ds, items, detailMap, notes, healthItems, onShowDetail }) => {
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

  const foodLabels = {
    cal: Math.round(rawTotals.cal),
    protein: Math.round(rawTotals.protein),
    fat: Math.round(rawTotals.fat),
    carbs: Math.round(rawTotals.carbs),
    eatingWindow: eatingWindow(items.map((x) => x.eatenAtUTC)),
  };

  const healthLabels = {
    water:
      healthItems &&
      healthItems[HEALTH_WATER_KEY] &&
      round(healthItems[HEALTH_WATER_KEY], 2),
    bodyMass: healthItems && healthItems[HEALTH_BODY_MASS_KEY],
  };

  const entryDate = friendlyDate(ds);

  // Ensure earliest photos are first
  const imageDetails = Object.keys(detailMap)
    .map((key) => detailMap[key])
    .sort(ascLocalTime);

  return (
    <div className="day">
      <div className="day-title">
        <div className="day-date">{entryDate}</div>
        <div className="day-macros">
          <span
            role="img"
            title="Calories"
            aria-label="Calories"
            className="day-macro"
          >
            🔥{foodLabels.cal}
          </span>
          <span
            role="img"
            title="Grams of protein"
            aria-label="grams of protein"
            className="day-macro"
          >
            🍗{foodLabels.protein}g
          </span>
          <span
            role="img"
            title="Grams of fat"
            aria-label="Grams of fat"
            className="day-macro"
          >
            🥑{foodLabels.fat}g
          </span>
          <span
            role="img"
            title="Grams of carbs"
            aria-label="Grams of carbs"
            className="day-macro"
          >
            🍎{foodLabels.carbs}g
          </span>
          <span
            role="img"
            title="Eating window in hours"
            aria-label="Eating window in hours"
            className="day-macro"
          >
            ⏱{foodLabels.eatingWindow} hrs
          </span>
          <span className="day-macro-br">
            {healthLabels.water && (
              <span
                role="img"
                title="Cups of water"
                aria-label="Cups of water"
                className="day-macro"
              >
                💧{healthLabels.water} cups
              </span>
            )}
            {healthLabels.bodyMass && (
              <span
                role="img"
                title="Weight in pounds"
                aria-label="weight in pounds"
                className="day-macro"
              >
                ⚖️{healthLabels.bodyMass} lbs
              </span>
            )}
          </span>
        </div>
      </div>
      {notes && <ReactMarkdown className="day-notes">{notes}</ReactMarkdown>}
      <div className="day-images">
        {imageDetails.map((imageDetail, idx) => (
          <div className="day-image" key={idx}>
            <img
              alt=""
              className="day-image-raw"
              src={getImage(imageDetail.imageURL)}
              onClick={() => onShowDetail(imageDetail.key)}
            ></img>
            <span className="day-image-banner">
              <div className="day-image-banner-title">
                {imageDetail.mealLabel}
              </div>
              <div className="day-image-banner-subtitle">
                {_getImageDetailSubtitle(imageDetail)}
              </div>
            </span>
          </div>
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

// MultiLineChart helpers
const _extractStatValues = (stats) => stats.map((x) => x[1]);

const MultiLineChart = ({ title, macroData }) => {
  const { labels } = macroData;
  const minValues = _extractStatValues(macroData.minValues);
  const averageValues = _extractStatValues(macroData.averageValues);
  const maxValues = _extractStatValues(macroData.maxValues);

  const data = {
    labels,
    datasets: [
      {
        borderColor: STATS_BACKGROUND_COLOR,
        borderWidth: 1,
        pointRadius: 0,
        backgroundColor: STATS_BACKGROUND_COLOR,
        pointBackgroundColor: PRIMARY_COLOR,
        fill: "+1",
        label: "Min weight",
        data: minValues,
      },
      {
        borderColor: PRIMARY_COLOR,
        borderWidth: 2,
        pointRadius: 2,
        pointBorderWidth: 2,
        pointBackgroundColor: PRIMARY_COLOR,
        backgroundColor: STATS_BACKGROUND_COLOR,
        fill: "+1",
        label: "Average weight",
        data: averageValues,
      },
      {
        borderColor: STATS_BACKGROUND_COLOR,
        borderWidth: 1,
        pointRadius: 0,
        pointBackgroundColor: PRIMARY_COLOR,
        fill: false,
        label: "Max weight",
        data: maxValues,
      },
    ],
  };
  const options = {
    spanGaps: true,
    legend: {
      display: false,
      fontColor: INFO_COLOR,
      fontFamily: FONT_FAMILY,
      fontSize: CHART_FONT_SIZE,
    },
    tooltips: {
      callbacks: {
        label: (item, _) => {
          const maxInfo = ` Max ${title}: ${maxValues[item.index]}`;
          const avgInfo = ` Average ${title}: ${averageValues[item.index]}`;
          const minInfo = ` Min ${title}: ${minValues[item.index]}`;
          return [maxInfo, avgInfo, minInfo];
        },
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

const HourlyCalorieHeatMap = ({ macroData }) => {
  const { labels, heatMapSeries } = macroData;
  const options = {
    dataLabels: { enabled: false },
    chart: { toolbar: { show: false } },
    title: {
      text: "Average intraday calorie consumption",
      align: "center",
    },
    stroke: { width: 1 },
    tooltip: {
      y: {
        title: {
          formatter: (seriesName) => "",
        },
      },
    },
    plotOptions: {
      heatmap: {
        useFillColorAsStroke: true,
        colors: ["#008FFB"],
      },
    },
    xaxis: {
      type: "category",
      categories: labels,
      tickAmount: MAX_X_AXIS_HOURLY_TICKS,
      tickPlacement: "on",
      labels: {
        rotate: MAX_X_AXIS_ROTATION,
      },
    },
    yaxis: {
      show: false,
    },
  };

  return (
    <div className="trends-chart">
      <div className="trends-chart-data">
        <ApexChart
          series={heatMapSeries}
          options={options}
          type="heatmap"
          height={HOURLY_HEATMAP_HEIGHT}
        />
      </div>
    </div>
  );
};

// WeekdayCalorieHeatmap helpers
const _formatChartDate = (dateStr) => {
  const date = new Date(dateStr);
  const month = SHORT_MONTHS[date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
};
const _extractHeatMapSeries = (heatMapValues) =>
  heatMapValues.map(({ name, data }) => ({ name, data }));
const _extractHeatMapDate = (heatMapValues, seriesIdx, dataPointIdx) =>
  heatMapValues[seriesIdx].dates[dataPointIdx];
const _extractHeatMapValue = (heatMapValues, seriesIdx, dataPointIdx) =>
  heatMapValues[seriesIdx].data[dataPointIdx].y;
const _formatHeatMapTooltip = (
  heatMapValues,
  seriesIdx,
  dataPointIdx,
  suffix = ""
) => {
  const rawValue = _extractHeatMapValue(heatMapValues, seriesIdx, dataPointIdx);
  const formattedValue =
    rawValue === -1 ? NO_DATA_TOOLTIP_VALUE : `${rawValue}${suffix}`;
  const date = _extractHeatMapDate(heatMapValues, seriesIdx, dataPointIdx);
  const formattedDate = _formatChartDate(date);
  return `${formattedDate}: ${formattedValue}`;
};

const WeekdayCalorieHeatMap = ({ title, macroData }) => {
  const { labels, weekdayHeatMapValues } = macroData;

  const series = _extractHeatMapSeries(weekdayHeatMapValues);
  const options = {
    dataLabels: { enabled: false },
    chart: { toolbar: { show: false } },
    stroke: { width: 1 },
    tooltip: {
      y: {
        formatter: (value, { series, seriesIndex, dataPointIndex, w }) =>
          _formatHeatMapTooltip(
            weekdayHeatMapValues,
            seriesIndex,
            dataPointIndex,
            " calories"
          ),
        title: {
          formatter: (seriesName) => "",
        },
      },
    },
    plotOptions: {
      heatmap: {
        useFillColorAsStroke: true,
        enableShades: true,
        colorScale: {
          ranges: [
            {
              from: LOW_CALORIES_THRESHOLD_START,
              to: LOW_CALORIES_THRESHOLD_END,
              name: `<= ${LOW_CALORIES_THRESHOLD_END} (low)`,
              color: LOW_RANGE_COLOR,
            },
            {
              from: TARGET_CALORIES_THRESHOLD_START,
              to: TARGET_CALORIES_THRESHOLD_END,
              name: `${TARGET_CALORIES_THRESHOLD_START} - ${TARGET_CALORIES_THRESHOLD_END} (target)`,
              color: TARGET_RANGE_COLOR,
            },
            {
              from: EXCESS_CALORIES_THRESHOLD_START,
              to: EXCESS_CALORIES_THRESHOLD_END,
              name: `${EXCESS_CALORIES_THRESHOLD_START}+ (high)`,
              color: EXCESS_RANGE_COLOR,
            },
          ],
        },
      },
    },
    xaxis: {
      type: "category",
      categories: labels,
      tickAmount: MAX_TICKS,
      tickPlacement: "on",
      labels: {
        format: "MMM dd",
        formatter: (value) => _formatChartDate(value),
        rotate: MAX_X_AXIS_ROTATION,
      },
      axisBorder: { show: false },
    },
    grid: { show: false },
  };

  return (
    <div className="trends-chart">
      <div className="trends-chart-title">{title}</div>
      <div className="trends-chart-data">
        <ApexChart series={series} options={options} type="heatmap" />
      </div>
    </div>
  );
};

const WeekdayWaterHeatMap = ({ title, macroData }) => {
  const { labels, weekdayHeatMapValues } = macroData;

  const series = _extractHeatMapSeries(weekdayHeatMapValues);
  const options = {
    chart: {
      toolbar: { show: false },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: { width: 1 },
    tooltip: {
      y: {
        formatter: (value, { series, seriesIndex, dataPointIndex, w }) =>
          _formatHeatMapTooltip(
            weekdayHeatMapValues,
            seriesIndex,
            dataPointIndex,
            " cups"
          ),
        title: {
          formatter: (seriesName) => "",
        },
      },
    },
    plotOptions: {
      heatmap: {
        useFillColorAsStroke: true,
        enableShades: true,
        colorScale: {
          ranges: [
            {
              from: -1,
              to: 0,
              name: `No data`,
              color: NO_DATA_COLOR,
            },
            {
              from: 0,
              to: 7.99,
              name: `< ${GOAL_WATER_THRESHOLD} (below goal)`,
              color: BELOW_GOAL_WATER_COLOR,
            },
            {
              from: 8,
              to: 16,
              name: `${GOAL_WATER_THRESHOLD}+ (target)`,
              color: GOAL_WATER_COLOR,
            },
          ],
        },
      },
    },
    xaxis: {
      type: "category",
      categories: labels,
      tickAmount: MAX_TICKS,
      tickPlacement: "on",
      labels: {
        format: "MMM dd",
        formatter: (value) => _formatChartDate(value),
        rotate: MAX_X_AXIS_ROTATION,
      },
      axisBorder: { show: false },
    },
    grid: { show: false },
  };

  return (
    <div className="trends-chart">
      <div className="trends-chart-title">{title}</div>
      <div className="trends-chart-data">
        <ApexChart series={series} options={options} type="heatmap" />
      </div>
    </div>
  );
};

const Trends = ({
  dateRange,
  updateDateRange,
  nutrientsTrendData,
  nutrientsWeeklyStats,
  nutrientsHourlyStats,
  healthWeeklyStats,
}) => {
  const averageCalories = roundedAvg(
    nutrientsTrendData.calories.map((x) => x[1])
  );
  const averageProtein = roundedAvg(
    nutrientsTrendData.protein.map((x) => x[1])
  );
  const averageFat = roundedAvg(nutrientsTrendData.fat.map((x) => x[1]));
  const averageCarbs = roundedAvg(nutrientsTrendData.carbs.map((x) => x[1]));

  // Assumption: Fats are 9cals/g, protein and carbs are 4.5g/cal
  // hence fats macros are doubled
  const totalMacros = sum([averageProtein, averageFat * 2, averageCarbs]);
  const pctProtein = Math.round((averageProtein / totalMacros) * 100);
  const pctFat = Math.round(((averageFat * 2) / totalMacros) * 100);
  const pctCarbs = Math.round((averageCarbs / totalMacros) * 100);

  return (
    <div className="trends">
      <div className="trends-date-selector">
        <div className="trends-date-selector-row">
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
              dateRange === ALL_TIME ? "active" : "inactive"
            }`}
            onClick={() => updateDateRange(ALL_TIME)}
          >
            All Time
          </div>
        </div>
        {/* (TODO:) Uncomment below block in 2021 :) */}
        {/*
        <div className="trends-date-selector-row">
          <div
            className={`trends-date-option ${
              dateRange === THIS_YEAR ? "active" : "inactive"
            }`}
            onClick={() => updateDateRange(THIS_YEAR)}
          >
            This Year
          </div>
          <div
            className={`trends-date-option ${
              dateRange === YEAR_2020 ? "active" : "inactive"
            }`}
            onClick={() => updateDateRange(YEAR_2020)}
          >
            2020
          </div>
        </div>
        */}
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
        <HourlyCalorieHeatMap macroData={nutrientsHourlyStats.calories} />
        <WeekdayCalorieHeatMap
          title="Daily Calories"
          macroData={nutrientsWeeklyStats.calories}
        />
        <WeekdayWaterHeatMap
          title="Daily Water"
          macroData={healthWeeklyStats.water}
        />
        <MultiLineChart title="Weight" macroData={healthWeeklyStats.weight} />
        <MultiLineChart
          title="Weekly Calories"
          macroData={nutrientsWeeklyStats.calories}
        />
        <MultiLineChart
          title="Protein"
          macroData={nutrientsWeeklyStats.protein}
        />
        <MultiLineChart title="Carbs" macroData={nutrientsWeeklyStats.carbs} />
        <MultiLineChart title="Fats" macroData={nutrientsWeeklyStats.fat} />
      </div>
    </div>
  );
};

// Stateful Components
// ---------------------------------------------------------------------------
class EntryDetail extends React.Component {
  constructor(props) {
    super(props);
    const { detailIndex } = this.props;
    this.state = {
      index: detailIndex,
    };
  }

  componentDidMount() {
    const { onClose } = this.props;
    Mousetrap.bind(["left"], this.onPrev);
    Mousetrap.bind(["right"], this.onNext);
    Mousetrap.bind(["esc", "x"], onClose);
  }

  componentWillUnmount() {
    Mousetrap.unbind(["left"]);
    Mousetrap.unbind(["right"]);
    Mousetrap.unbind(["esc", "x"]);
  }

  onChangeIndex = (index) => {
    const { details } = this.props;
    const detailsIndex = mod(index, details.length);
    const detailKey = details[detailsIndex].key;
    updateLocation("detailKey", detailKey);
    this.setState({ index });
  };

  onPrev = () => {
    const { index } = this.state;
    // No-op on first photo
    if (index > 0) {
      this.onChangeIndex(index - 1);
    }
  };

  onNext = () => {
    const { details } = this.props;
    const { index } = this.state;
    // No-op on last photo
    if (index < details.length - 1) {
      this.onChangeIndex(index + 1);
    }
  };

  render() {
    const { details, onClose } = this.props;
    const { index } = this.state;

    // Navigation icons!
    const closeIcon = "╳";
    const prevIcon = "←";
    const nextIcon = "→";

    return (
      <div className="detail" onMouseDown={onClose}>
        {/*
         * We use onMouseDown to address that dragging can sometimes close the modal when you mouseup outside the modal
         * Fun fact, apparently having a "//" style comment below return breaks the minified build in production (but works fine in development)
         * As a result I've moved this comment here
         * See: https://github.com/facebook/create-react-app/issues/8687
         */}
        <div
          className="detail-content"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="detail-close" onClick={onClose}>
            {closeIcon}
          </div>
          <VirtualizeSwipeableViews
            resistance
            index={index}
            style={{
              borderRadius: "20px",
            }}
            onChangeIndex={this.onChangeIndex}
            slideRenderer={this.renderDetail}
            slideCount={details.length}
          />
          <div className="detail-navs">
            <div
              className="detail-nav"
              onClick={this.onPrev}
              style={{ visibility: index > 0 ? "visible" : "hidden" }}
            >
              {prevIcon}
            </div>
            <div
              className="detail-nav"
              onClick={this.onNext}
              style={{
                visibility: index < details.length - 1 ? "visible" : "hidden",
              }}
            >
              {nextIcon}
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderDetail = (params) => {
    const { details } = this.props;
    const { index, key } = params;

    const detail = details[mod(index, details.length)];
    const { imageURL, time, date, macros, items, mealLabel } = detail;
    const sortedItems = items.slice().sort(descCalorieSort);
    const mealSubtitle = _getFoodSubtitle(sortedItems[0].title);
    return (
      <div className="detail-image-info-container" key={key}>
        <div className="detail-image-container">
          <img className="detail-image" alt="" src={getImage(imageURL)}></img>
          <span className="detail-image-banner">
            <div className="detail-image-banner-title">{mealLabel}</div>
            <div className="detail-image-banner-subtitle">{mealSubtitle}</div>
          </span>
        </div>
        <div className="detail-info">
          <div className="detail-info-header">
            <div className="detail-info-time">{time}</div>
            <div className="detail-info-date">{friendlyDate(date)}</div>
            <hr className="detail-info-separator"></hr>
          </div>
          <div className="detail-macros">
            <span
              role="img"
              title="Calories"
              aria-label="Calories"
              className="detail-macro"
            >
              🔥 {Math.round(macros.calories)}
            </span>
            <span
              role="img"
              title="Grams of protein"
              aria-label="Grams of protein"
              className="detail-macro"
            >
              🍗 {Math.round(macros.protein)}g
            </span>
            <span
              role="img"
              title="Grams of fat"
              aria-label="Grams of fat"
              className="detail-macro"
            >
              🥑️ {Math.round(macros.fat)}g
            </span>
            <span
              role="img"
              title="Grams of carbs"
              aria-label="Grams of carbs"
              className="detail-macro"
            >
              🍎 {Math.round(macros.carbs)}g
            </span>
          </div>
          <div className="detail-items">
            {sortedItems.map((i, idx) => (
              <EntryDetailItem key={idx} {...i} />
            ))}
          </div>
        </div>
      </div>
    );
  };
}

class App extends React.Component {
  constructor(props) {
    super(props);
    const { entriesToDateMap } = this.props;
    const numEntries = Object.keys(entriesToDateMap).length;
    this.state = {
      tab: getLocationTab(window.location.search),
      dateRange: getLocationDateRange(window.location.search),
      detailKey: getLocationDetailKey(window.location.search),
      entryPage: getLocationEntryPage(window.location.search, numEntries),
    };
  }

  closeDetail = () => {
    deleteLocation("detailKey");
    this.setState({ detailKey: null });
  };

  updateDateRange = (dateRange) => {
    updateLocation("dateRange", dateRange);
    this.setState({ dateRange });
  };

  updateDetail = (detailKey) => {
    updateLocation("detailKey", detailKey);
    this.setState({ detailKey });
  };

  updateTab = (tab) => {
    updateLocation("tab", tab);
    this.setState({ tab });
  };

  updateEntryPage = (entryPage, doScroll = true) => {
    updateLocation("entryPage", entryPage);
    doScroll && window.scrollTo(0, 0);
    this.setState({ entryPage });
  };

  render() {
    const {
      entriesToDateMap,
      entryDetailMap,
      notesData,
      healthData,
    } = this.props;
    const { dateRange, detailKey, tab, entryPage } = this.state;

    // Pagination helpers
    const numEntries = Object.keys(entriesToDateMap).length;
    const maxEntryPage = getMaxEntryPage(numEntries);
    const entryStart = (entryPage - 1) * ENTRIES_PER_PAGE;
    const entryEnd = entryPage * ENTRIES_PER_PAGE;

    // Entry Feed
    const renderedEntries = Object.keys(entriesToDateMap)
      .sort(descSort)
      .slice(entryStart, entryEnd) // Paginate
      .map((ds, idx) => {
        const items = entriesToDateMap[ds];
        // Notes date format doesn't neccesarily have to be the same as entries date format
        const notesKey = Object.keys(notesData).find(
          (notesDs) =>
            extractDate(new Date(notesDs)) === extractDate(new Date(ds))
        );
        const notes = notesData[notesKey];

        const healthKey = Object.keys(healthData).find(
          (healthDs) => healthDs === ds
        );
        const health = healthData[healthKey];

        const detailMap = imageDetailMap({ [ds]: items });
        return (
          <Entry
            key={idx}
            ds={ds}
            items={entriesToDateMap[ds]}
            detailMap={detailMap}
            healthItems={health}
            notes={notes}
            onShowDetail={this.updateDetail}
          />
        );
      });

    // Trends Feed
    const nutrientsTrendData = nutrientsToDailyTotalsMap(
      filterEntries(dateRange, entriesToDateMap)
    );
    const nutrientsWeeklyStats = weeklyNutrientsStatsMap(
      nutrientsToDailyTotalsMap(entriesToDateMap)
    );
    const nutrientsHourlyStats = hourlyNutrientsStatsMap(
      filterEntries(dateRange, entriesToDateMap)
    );
    const healthWeeklyStats = weeklyHealthStatsMap(
      healthToDailyTotalsMap(healthData)
    );

    // Entry Detail
    const entryDetail = entryDetailMap[detailKey];
    let renderedEntryDetail;
    if (entryDetail) {
      const entryDetailArray = Object.keys(entryDetailMap)
        .map((key) => entryDetailMap[key])
        .filter((x) => x.date === entryDetail.date)
        .sort(ascLocalTime);
      const entryDetailIndex = entryDetailArray.findIndex(
        (x) => x.key === detailKey
      );

      renderedEntryDetail = (
        <EntryDetail
          details={entryDetailArray}
          detailIndex={entryDetailIndex}
          onClose={this.closeDetail}
        />
      );
    }

    return (
      <div className="app">
        <div className="header">
          <a
            href="http://www.joeaverbukh.com"
            title="Visit my personal website"
            className="header-link"
          >
            <img
              src={require("./images/headshot.jpg")}
              alt="Headshot"
              className="header-avatar"
            ></img>
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
          <div
            className={`nav-option ${
              tab === REFLECTIONS_TAB ? "active" : "inactive"
            }`}
            onClick={() => this.updateTab(REFLECTIONS_TAB)}
          >
            REFLECTIONS
          </div>
        </div>

        {entryDetail && renderedEntryDetail}
        {tab === ENTRIES_TAB && (
          <div className="feed">
            {entryPage && entryPage > 1 && (
              <span
                className="feed-home"
                tite="Go back to home page"
                role="img"
                aria-label="Go back to home page"
                onClick={() => this.updateEntryPage(1, false)}
              >
                🏠
              </span>
            )}
            {renderedEntries}
            {/* Pagination navigation  */}
            <div className="entry-navs">
              {entryPage > MIN_ENTRY_PAGE && (
                <div
                  className="entry-nav entry-nav-prev"
                  onClick={() =>
                    this.updateEntryPage(parseInt(entryPage, 10) - 1)
                  }
                >
                  ←
                </div>
              )}
              {entryPage < maxEntryPage && (
                <div
                  className="entry-nav entry-nav-next"
                  onClick={() =>
                    this.updateEntryPage(parseInt(entryPage, 10) + 1)
                  }
                >
                  →
                </div>
              )}
            </div>
          </div>
        )}
        {tab === TRENDS_TAB && (
          <Trends
            dateRange={dateRange}
            updateDateRange={this.updateDateRange}
            nutrientsTrendData={nutrientsTrendData}
            nutrientsWeeklyStats={nutrientsWeeklyStats}
            nutrientsHourlyStats={nutrientsHourlyStats}
            healthWeeklyStats={healthWeeklyStats}
          />
        )}
        {tab === REFLECTIONS_TAB && (
          <div className="reflections">
            {Object.keys(notesData).map(ds => numWords(notesData[ds]) > REFLECTION_THRESHOLD && (
              <div className="reflection">
              <div className="day-date">{friendlyDate(ds)}</div>
<ReactMarkdown className="day-notes">{notesData[ds]}</ReactMarkdown>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default App;
