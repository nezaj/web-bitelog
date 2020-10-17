/*
 * Helpers for marshalling data
 */
const { HEALTH_WATER_KEY, HEALTH_BODY_MASS_KEY } = require("./constants.js");
const {
  createImageDetail,
  extractDate,
  getImageKey,
  localTimeToDate,
  addDays,
  max,
  min,
  avg,
  round,
  mostRecentWeekDayDate,
  getShortWeekyDayName,
  rotateArrayToVal,
  SHORT_WEEKDAYS,
  range,
  transformMap,
  collect,
  defaultMap,
  sum,
  addPartition,
  extendPartition,
  extractPartitionHead,
  extractLastPartition,
  replaceLastPartition,
  minutesBetween,
  weeksBetween,
  addWeeks,
  tuplesToMap,
  daysBetween,
} = require("./utils.js");
const {
  extractCalories,
  extractProtein,
  extractFat,
  extractCarbs,
  sumNutrients,
  extractNutrient,
} = require("./nutrients.js");

// 236.59ml is 1 US cup
const ML_TO_CUPS_DIVISOR = 236.59;

// Used for weekly trend data
// (TODO): Week start/end needs to match the start of the heatmap week days. May want to clean this up so just
// need to update one value instead of three
const WEEK_ENDING_ON_DAYNAME = "Monday";
const WEEK_STARTING_ON_DAYNAME = "Monday";
const HEATMAP_WEEK_DAYS = rotateArrayToVal(SHORT_WEEKDAYS, "Mon").reverse(); // We reverse so Monday will be top series

// Hours of the day: 12am -> 11pm
const HOUR_HEATMAP_LABELS = rotateArrayToVal(
  (() => {
    const am = ["12am"].concat(range(11).map((x) => `${x}am`));
    const pm = ["12pm"].concat(range(11).map((x) => `${x}pm`));
    return am.concat(pm);
  })(),
  "5am"
);

// Hueristics for labeling meals
const GROUPING_CUTOFF_MIN = 45;
const MEAL_CALORIES_CUTOFF = 500;
const LARGE_MEAL_CALORIES_CUTOFF = 1000;
const MORNING_START = 6;
const AFTERNOON_START = 12;
const EVENING_START = 17;
const LATE_NIGHT_START = 20;

// Used by health.js to export map of health data
const buildHealthMap = (healthData) => {
  return Object.keys(healthData).reduce((healthMap, healthKey) => {
    const samples = healthData[healthKey];
    samples.forEach((sample) => {
      const amount = sample["value"];
      const ds = extractDate(new Date(sample["date"]));
      healthMap[ds] = healthMap[ds] || {};
      healthMap[ds][healthKey] = healthMap[ds][healthKey] || 0;
      switch (healthKey) {
        // Use latest entry for weight
        case HEALTH_BODY_MASS_KEY:
          healthMap[ds][healthKey] = parseFloat(amount);
          break;
        // Convert amounts (in ml) to cups
        case HEALTH_WATER_KEY:
          healthMap[ds][healthKey] += parseFloat(amount) / ML_TO_CUPS_DIVISOR;
          break;
        default:
          healthMap[ds][healthKey] += parseFloat(amount);
      }
    });

    return healthMap;
  }, {});
};

// Marshall data from BiteSnap to use datestamps as top level keys
// This is used as the "top-level" data structure for food-related data
const entriesToDateMap = (entries) => {
  return entries.reduce((xs, x) => {
    const dateKey = extractDate(localTimeToDate(x.eatenAtLocalTime));
    xs[dateKey] = xs[dateKey] || [];
    xs[dateKey] = xs[dateKey].concat(x);
    return xs;
  }, {});
};

// Trends
// ----------------------------------------------------------------

/*
Marshall "nutrients" data from BiteSnap into tuples of date values.
We use this format for roll-ups in our trends screen

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
const nutrientsToDailyTotalsMap = (dateToEntriesMap) => {
  return Object.keys(dateToEntriesMap).reduce(
    (xs, ds) => {
      xs["calories"].push([ds, sumNutrients(dateToEntriesMap[ds], "calories")]);
      xs["protein"].push([ds, sumNutrients(dateToEntriesMap[ds], "protein")]);
      xs["fat"].push([ds, sumNutrients(dateToEntriesMap[ds], "totalFat")]);
      xs["carbs"].push([ds, sumNutrients(dateToEntriesMap[ds], "totalCarb")]);
      return xs;
    },
    { calories: [], protein: [], fat: [], carbs: [] }
  );
};

// Similar concept as daily nutrients map, but for data exported from Apple health
const healthToDailyTotalsMap = (healthMap) => {
  return Object.keys(healthMap).reduce(
    (xs, ds) => {
      xs["weight"].push([ds, healthMap[ds][HEALTH_BODY_MASS_KEY]]);
      xs["water"].push([ds, healthMap[ds][HEALTH_WATER_KEY]]);
      return xs;
    },
    { weight: [], water: [] }
  );
};

// Transforms daily nutrient data into weekly statistics
const weeklyNutrientsStatsMap = (dailyNutrientMap) => {
  return _buildWeeklyStatsMap(dailyNutrientMap, [
    "calories",
    "protein",
    "fat",
    "carbs",
  ]);
};

// Transforms daily heath data into weekly statistics
const weeklyHealthStatsMap = (dailyHealthMap) => {
  return _buildWeeklyStatsMap(dailyHealthMap, ["weight", "water"]);
};

// Transforms daily nutrients data into hourly statistics
const hourlyNutrientsStatsMap = (dateToEntriesMap) => {
  const flattenedEntries = Object.keys(dateToEntriesMap).reduce(
    (flat, ds) => flat.concat(dateToEntriesMap[ds]),
    []
  );
  return ["calories", "protein", "fat", "carbs"].reduce((res, key) => {
    res[key] = {
      labels: HOUR_HEATMAP_LABELS,
      heatMapSeries: _buildHourlyNutrientHeatMapSeries(flattenedEntries, key),
    };
    return res;
  }, {});
};

// closedRange(new Date('10/01/20'), new Date('10/19/20')) -> [ '10/1/2020', '10/8/2020', '10/15/2020']
// closedRange(new Date('10/01/20'), new Date('10/22/20')) -> [ '10/1/2020', '10/8/2020', '10/15/2020', '10/22/2020' ]
const _buildClosedWeekRange = (startDate, endDate) => {
  const numWeeks = Math.floor(weeksBetween(startDate, endDate)) + 1;
  return range(numWeeks).map((x) => extractDate(addWeeks(startDate, x - 1)));
};

// closedRange(new Date('10/01/20'), new Date('10/03/20')) -> [ '10/1/2020', '10/02/2020', '10/03/2020']
// closedRange(new Date('10/01/20'), new Date('10/01/20')) -> [ '10/1/2020' ]
const _buildClosedDailyRange = (startDate, endDate) => {
  const numDays = Math.floor(daysBetween(startDate, endDate)) + 1;
  return range(numDays).map((x) => extractDate(addDays(startDate, x - 1)));
};

const _dailyTupleDate = (tup) => tup[0];
const _dailyTupleValue = (tup) => tup[1];
const _groupByWeek = (dateStr) =>
  mostRecentWeekDayDate(dateStr, WEEK_ENDING_ON_DAYNAME);
const _groupDailyTuplesByWeek = (tup) => _groupByWeek(_dailyTupleDate(tup));

// Transforms tuples of daily values into a map of weekly statistics
const _buildWeeklyStats = (dailyTuples) => {
  // Group labels by week (earliest to latest)
  const sorted = dailyTuples
    .slice()
    .sort((second, first) =>
      new Date(_dailyTupleDate(second)) < new Date(_dailyTupleDate(first))
        ? -1
        : 1
    );
  const firstWeek = _groupDailyTuplesByWeek(sorted[0]);
  const lastWeek = _groupDailyTuplesByWeek(sorted[sorted.length - 1]);
  const weekRange = _buildClosedWeekRange(firstWeek, lastWeek);
  const grouped = Object.assign(
    {},
    defaultMap(weekRange, []),
    collect(_groupDailyTuplesByWeek, sorted)
  );

  // Calculate statistics
  const nonEmptyLabels = Object.keys(grouped).filter(
    (label) => grouped[label].length
  );
  const minValues = nonEmptyLabels.map((label) => [
    label,
    min(grouped[label].map(_dailyTupleValue)),
  ]);
  const maxValues = nonEmptyLabels.map((label) => [
    label,
    max(grouped[label].map(_dailyTupleValue)),
  ]);
  const averageValues = nonEmptyLabels.map((label) => [
    label,
    round(avg(grouped[label].map(_dailyTupleValue)), 0),
  ]);

  // HeatMap series
  // Adjusting first day so we have full data for each heatmap series
  const adjustedFirstDay = mostRecentWeekDayDate(
    _dailyTupleDate(sorted[0]),
    WEEK_STARTING_ON_DAYNAME
  );
  const lastDay = _dailyTupleDate(sorted[sorted.length - 1]);
  const dailyRange = _buildClosedDailyRange(adjustedFirstDay, lastDay);

  const dailyMap = tuplesToMap(dailyTuples);
  const weekdayHeatMapValues = HEATMAP_WEEK_DAYS.map((dayName) => {
    const dates = dailyRange.filter(
      (day) => dayName === getShortWeekyDayName(day)
    );
    return {
      name: dayName,
      dates,
      data: dates.map((date) => ({
        x: _groupByWeek(date),
        y: isNaN(dailyMap[date]) ? -1 : round(dailyMap[date], 0),
      })),
    };
  });

  return {
    labels: nonEmptyLabels,
    minValues,
    maxValues,
    averageValues,
    weekdayHeatMapValues,
  };
};

const _buildWeeklyStatsMap = (dailyMap, keys) =>
  transformMap(_buildWeeklyStats, dailyMap, keys);

// _extractHourLabel(20200715182210) -> "6pm" (note: the hour portion is 18)
const _extractHourLabel = (localTimeInt) => {
  const rawHour = localTimeToDate(localTimeInt).getHours();
  if (rawHour === 0) {
    return "12am";
  } else if (rawHour < 12) {
    return `${rawHour}am`;
  } else if (rawHour === 12) {
    return `12pm`;
  } else {
    return `${rawHour - 12}pm`;
  }
};

const _sumFoodsNutrients = (foods, nutrientName) =>
  sum(foods.map((food) => extractNutrient(food.nutrients, nutrientName))) || 0;

const _numFoodsDays = (foods) => {
  return new Set(foods.map((food) => extractDate(new Date(food.eatenAtUTC))))
    .size;
};

const _avgFoodsNutrients = (foods, nutrientName) => {
  const numDays = _numFoodsDays(foods);
  if (!numDays) {
    return 0;
  }
  return _sumFoodsNutrients(foods, nutrientName) / numDays;
};

const _pctFoodNutrients = (totalNutrients, foods, nutrientName) => {
  if (!totalNutrients) {
    return 0;
  }
  return _sumFoodsNutrients(foods, nutrientName) / totalNutrients;
};

const _estimatedFoodNutrients = (
  avgNutrients,
  totalNutrients,
  foods,
  nutrientName
) => {
  return round(
    avgNutrients * _pctFoodNutrients(totalNutrients, foods, nutrientName),
    2
  );
};

const _buildHourlyNutrientHeatMapSeries = (foods, nutrientName) => {
  const avgNutrients = _avgFoodsNutrients(foods, nutrientName);
  const totalNutrients = _sumFoodsNutrients(foods, nutrientName);
  const groupedByHour = Object.assign(
    {},
    defaultMap(HOUR_HEATMAP_LABELS, []), // Ensures values for all labels, even if there are no food entries
    collect((food) => _extractHourLabel(food.eatenAtLocalTime), foods)
  );
  return [
    {
      name: "Hours",
      data: Object.keys(groupedByHour).map((hour) => ({
        x: hour,
        y: _estimatedFoodNutrients(
          avgNutrients,
          totalNutrients,
          groupedByHour[hour],
          nutrientName
        ),
      })),
    },
  ];
};

// Image details
// ----------------------------------------------------------------

/*
Marshall data into a comfortable format for rendering image detail data

Takes in
{
  '6/28/2020' : [ { entry1 }, { entry2 }],
  '6/27/2020' : [ { entry1 }, { entry2 }],
  ...
}

And returns
{
  id: ...,
  time: 2:40pm,
  date: Sunday, July 12th, 2020
  mealLabel: "Afternoon snack",
  macros: {calories: 224, protein: 6, fats: 7, carbs: 35g}
  items: [{name: "Raw Celerey", subtitle: "", servingUnits: 4, servingDetails: "medium stalks", calories: 26}, ...]
}
*/
const imageDetailMap = (dateToEntriesMap) => {
  return Object.keys(dateToEntriesMap)
    .map((ds) => dateToEntriesMap[ds])
    .map((dsFoods) => _labelFoodsWithMealGroup(_mealFoodsPartition(dsFoods))) // add meal labels to foods
    .reduce((xs, x) => xs.concat(x), []) // flatten
    .reduce((xs, x) => {
      // Get imageKey
      const key = getImageKey(x.imageURL, x.mealID);
      xs[key] =
        xs[key] ||
        createImageDetail(key, x.imageURL, x.eatenAtLocalTime, x.mealLabel);

      // Update image macros
      xs[key].macros["calories"] += extractCalories(x.nutrients);
      xs[key].macros["protein"] += extractProtein(x.nutrients);
      xs[key].macros["fat"] += extractFat(x.nutrients);
      xs[key].macros["carbs"] += extractCarbs(x.nutrients);

      // Add food item to image
      xs[key].items.push({
        id: x.entryID,
        title: x.foodItemName,
        subtitle: x.foodItemDetails,
        servingQuantity: x.servingQuantity,
        servingUnits: x.servingUnits.split(" (")[0],
        calories: extractCalories(x.nutrients),
      });
      return xs;
    }, {});
};

// Meal grouping
// ----------------------------------------------------------------

/*
Helper function for partioning a list of foods into meal groups and their
corresponding total calories

Start from earliest eaten food and partition like so:
Begin with the first food as the head of the first partition
* Add the next food to the last partition if it was eaten within the cutoff time of the last partition head
* Otherwise create a new partition with the new food as the head
Continue until all foods are partitioned
*/
const _mealFoodsPartition = (foods) => {
  return foods
    .sort((second, first) =>
      second.eatenAtLocalTime <= first.eatenAtLocalTime ? -1 : 1
    )
    .reduce(
      ({ partitionedFoods, partionedCalories, lastPartition }, food) => {
        const partitionHead = extractPartitionHead(lastPartition);
        const foodCalories = extractCalories(food.nutrients);
        if (
          !partitionHead ||
          GROUPING_CUTOFF_MIN <=
            minutesBetween(partitionHead.eatenAtUTC, food.eatenAtUTC)
        ) {
          const newPartition = [food];
          return {
            partitionedFoods: addPartition(partitionedFoods, newPartition),
            partionedCalories: extendPartition(partionedCalories, foodCalories),
            lastPartition: newPartition,
          };
        } else {
          const updatedLastPartition = extendPartition(lastPartition, food);
          const updatedLastCalories =
            extractLastPartition(partionedCalories) + foodCalories;
          return {
            partitionedFoods: replaceLastPartition(
              partitionedFoods,
              updatedLastPartition
            ),
            partionedCalories: replaceLastPartition(
              partionedCalories,
              updatedLastCalories
            ),
            lastPartition: updatedLastPartition,
          };
        }
      },
      { partitionedFoods: [], partionedCalories: [], lastPartition: [] }
    );
};

// Meal/time hueristics
// ------------------
const _isFast = (calories) => calories === 0;
const _isSnack = (calories) => 0 < calories && calories < MEAL_CALORIES_CUTOFF;
const _isMeal = (calories) =>
  MEAL_CALORIES_CUTOFF <= calories && calories < LARGE_MEAL_CALORIES_CUTOFF;
const _isLargeMeal = (calories) => LARGE_MEAL_CALORIES_CUTOFF <= calories;

const _isMorning = (hour) => MORNING_START <= hour && hour < AFTERNOON_START;
const _isAfternoon = (hour) => AFTERNOON_START <= hour && hour < EVENING_START;
const _isEvening = (hour) => EVENING_START <= hour && hour < LATE_NIGHT_START;
const _isLateNight = (hour) => hour < MORNING_START || LATE_NIGHT_START <= hour;

// Meal labels
// ------------------
const _mealLabel = (mealHour) => {
  if (_isMorning(mealHour)) {
    return "Breakfast";
  } else if (_isAfternoon(mealHour)) {
    return "Lunch";
  } else if (_isEvening(mealHour)) {
    return "Dinner";
  } else if (_isLateNight(mealHour)) {
    return "Late Night Meal";
  }
};

const _snackLabel = (mealHour) => {
  let prefix;
  if (_isMorning(mealHour)) {
    prefix = "Morning";
  } else if (_isAfternoon(mealHour)) {
    prefix = "Afternoon";
  } else if (_isEvening(mealHour)) {
    prefix = "Evening";
  } else if (_isLateNight(mealHour)) {
    prefix = "Late Night";
  }

  return `${prefix} Snack`;
};

// Differentiate between raw and meal labels because we want to increment
// duplicate label types when we display them in the feed (e.g. Afternoon snack, Afternoon snack (2))
const _getRawLabel = (calories, mealHour) => {
  if (_isFast(calories)) {
    return "Fast";
  } else if (_isSnack(calories)) {
    return _snackLabel(mealHour);
  } else if (_isMeal(calories) || _isLargeMeal(calories)) {
    return _mealLabel(mealHour);
  } else {
    return "Unknown";
  }
};

const _numPrefix = (x) => {
  return x < 4 ? ["1st", "2nd", "3rd"][x - 1] : "4th";
};

// These labels will be displayed on the feed
const _getMealLabel = (calories, rawLabel, labels) => {
  const numRepeats = labels.filter((l) => l === rawLabel).length;
  const numPrefix = numRepeats === 0 ? "" : `${_numPrefix(numRepeats + 1)} `;
  const largePrefix = !_isLargeMeal(calories) ? "" : "Large ";
  return `${largePrefix}${numPrefix}${rawLabel}`;
};

/*
Helper function for transforming partions of foods into a flattened list
of foods withs a meal label
*/
const _labelFoodsWithMealGroup = ({ partitionedFoods, partionedCalories }) => {
  return partitionedFoods.reduce(
    ({ labeledFoods, rawLabels }, foods, partitionIdx) => {
      const mealCalories = partionedCalories[partitionIdx];
      const mealTime = localTimeToDate(foods[0].eatenAtLocalTime).getHours();
      const newRawLabel = _getRawLabel(mealCalories, mealTime);
      const mealLabel = _getMealLabel(mealCalories, newRawLabel, rawLabels);
      // (XXX): Webpack won't build in production if I do foods.map((food) => ({...food, mealLabel}))
      // due to an issue with the spread operator. Instead we use Object.assign
      const newFoods = foods.map((food) =>
        Object.assign({}, food, { mealLabel })
      );
      return {
        labeledFoods: newFoods.concat(labeledFoods), // Similarly Webpack won't build in production if we do [...newFoods, ...labelFoods]
        rawLabels: rawLabels.concat(newRawLabel),
      };
    },
    { labeledFoods: [], rawLabels: [] }
  ).labeledFoods;
};

module.exports.buildHealthMap = buildHealthMap;
module.exports.entriesToDateMap = entriesToDateMap;
module.exports.imageDetailMap = imageDetailMap;
module.exports.nutrientsToDailyTotalsMap = nutrientsToDailyTotalsMap;
module.exports.healthToDailyTotalsMap = healthToDailyTotalsMap;
module.exports.weeklyNutrientsStatsMap = weeklyNutrientsStatsMap;
module.exports.weeklyHealthStatsMap = weeklyHealthStatsMap;
module.exports.hourlyNutrientsStatsMap = hourlyNutrientsStatsMap;
