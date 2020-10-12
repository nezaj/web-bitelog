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
  nextWeekDayDate,
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
  dropLastPartition,
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

// 1000ms -> second, 60 second -> min
const MS_TO_MIN = 1000 * 60;

// Used for weekly trend data
const WEEK_ENDING_ON_DAYNAME = "Monday"; // Determines week-day of each data point on weekly trends graphs
const GROUP_SIZE = 7;
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
  return _buildWeeklyStatsMap(dailyHealthMap, ["weight"]);
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

// Groups date value tuples by cut-off dates. Takes in an updater function for flexibility in defining how successive
// cuttoffs can be updated (e.g. addDays(dateCutoff, 7) to increment the cutoff by a week)
const _groupByDateCutoff = (fnCutoffUpdater, dateValueTuples, initialDate) => {
  const grouped = dateValueTuples.reduce(
    ({ groups, labels, dateCutoff }, tuple) => {
      const date = tuple[0];
      if (new Date(date) < new Date(dateCutoff)) {
        const previousGroups = dropLastPartition(groups);
        const newValue = [tuple];
        const newGroup = extendPartition(
          extractLastPartition(groups),
          newValue
        );
        return {
          groups: addPartition(previousGroups, newGroup),
          labels,
          dateCutoff,
        };
      } else {
        const newGroup = [tuple];
        const newDateCutoff = fnCutoffUpdater(dateCutoff);
        return {
          groups: addPartition(groups, newGroup),
          labels: extendPartition(labels, extractDate(new Date(newDateCutoff))),
          dateCutoff: newDateCutoff,
        };
      }
    },
    { groups: [[]], labels: [initialDate], dateCutoff: initialDate }
  );

  const { groups, labels } = grouped;
  return labels.reduce((res, label, idx) => {
    res[label] = res[label] || [];
    res[label] = res[label].concat(groups[idx]);
    return res;
  }, {});
};

// Transforms tuples of daily values into a map of weekly statistics
const _buildWeeklyStats = (dailyTuples) => {
  // Group labels starting from earliest to latest date
  const sorted = dailyTuples.sort((second, first) =>
    new Date(first[0]) < new Date(second[0]) ? 1 : -1
  );
  const earliestDate = sorted[0][0];
  const grouped = _groupByDateCutoff(
    (dateCutoff) => addDays(dateCutoff, GROUP_SIZE),
    sorted,
    nextWeekDayDate(earliestDate, WEEK_ENDING_ON_DAYNAME)
  );

  // Calculate statistics
  const nonEmptyLabels = Object.keys(grouped).filter(
    (label) => grouped[label].length
  );
  const minValues = nonEmptyLabels.map((label) => [
    label,
    min(grouped[label].map((tup) => tup[1])),
  ]);
  const maxValues = nonEmptyLabels.map((label) => [
    label,
    max(grouped[label].map((tup) => tup[1])),
  ]);
  const averageValues = nonEmptyLabels.map((label) => [
    label,
    round(avg(grouped[label].map((tup) => tup[1])), 0),
  ]);

  // HeatMap series
  const groupValues = nonEmptyLabels.map((label) => ({
    label,
    dates: grouped[label].map((tup) => tup[0]),
    weekdays: grouped[label].map((tup) => getShortWeekyDayName(tup[0])),
    values: grouped[label].map((tup) => tup[1]),
  }));
  const flatValues = groupValues
    .map((group) =>
      group.values.map((value, idx) => ({
        label: group.label,
        date: group.dates[idx],
        weekday: group.weekdays[idx],
        value,
      }))
    )
    .reduce((xs, x) => xs.concat(x), []);

  const weekdayHeatMapValues = HEATMAP_WEEK_DAYS.map((dayName) => {
    const filtered = flatValues.filter((fv) => fv.weekday === dayName);
    return {
      name: dayName,
      data: filtered.map((fv) => ({ x: fv.label, y: fv.value })),
      dates: filtered.map((fv) => fv.date),
    };
  });

  return {
    labels: nonEmptyLabels,
    minValues,
    maxValues,
    averageValues,
    flatValues,
    groupValues,
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
  const minutesBetween = (ts1, ts2) => {
    return Math.floor(Math.abs(new Date(ts1) - new Date(ts2)) / MS_TO_MIN);
  };

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

/*
Helper function for transforming partions of foods into a flattened list
of foods withs a meal label
*/
const _labelFoodsWithMealGroup = ({ partitionedFoods, partionedCalories }) => {
  // Hueristics
  // ------------------
  const isFast = (calories) => calories === 0;
  const isSnack = (calories) => 0 < calories && calories < MEAL_CALORIES_CUTOFF;
  const isMeal = (calories) =>
    MEAL_CALORIES_CUTOFF <= calories && calories < LARGE_MEAL_CALORIES_CUTOFF;
  const isLargeMeal = (calories) => LARGE_MEAL_CALORIES_CUTOFF <= calories;

  const isMorning = (hour) => MORNING_START <= hour && hour < AFTERNOON_START;
  const isAfternoon = (hour) => AFTERNOON_START <= hour && hour < EVENING_START;
  const isEvening = (hour) => EVENING_START <= hour && hour < LATE_NIGHT_START;
  const isLateNight = (hour) =>
    hour < MORNING_START || LATE_NIGHT_START <= hour;

  // Labels
  // ------------------
  const mealLabel = (mealHour) => {
    if (isMorning(mealHour)) {
      return "Breakfast";
    } else if (isAfternoon(mealHour)) {
      return "Lunch";
    } else if (isEvening(mealHour)) {
      return "Dinner";
    } else if (isLateNight(mealHour)) {
      return "Late night meal";
    }
  };

  const snackLabel = (mealHour) => {
    let prefix;
    if (isMorning(mealHour)) {
      prefix = "Morning";
    } else if (isAfternoon(mealHour)) {
      prefix = "Afternoon";
    } else if (isEvening(mealHour)) {
      prefix = "Evening";
    } else if (isLateNight(mealHour)) {
      prefix = "Late night";
    }

    return `${prefix} snack`;
  };

  // Differentiate between raw and meal labels because we want to increment
  // duplicate label types when we display them in the feed (e.g. Afternoon snack, Afternoon snack (2))
  const getRawLabel = (calories, mealHour) => {
    if (isFast(calories)) {
      return "Fast";
    } else if (isSnack(calories)) {
      return snackLabel(mealHour);
    } else if (isMeal(calories) || isLargeMeal(calories)) {
      return mealLabel(mealHour);
    } else {
      return "Unknown";
    }
  };

  // These labels will be displayed on the feed
  const getMealLabel = (calories, rawLabel, labels) => {
    const numRepeats = labels.filter((l) => l === rawLabel).length;
    const numSuffix = numRepeats === 0 ? "" : ` (${numRepeats + 1})`;
    const largeSuffix = !isLargeMeal(calories) ? "" : " (large)";
    return `${rawLabel}${numSuffix}${largeSuffix}`;
  };

  // Add meal labels to foods (the actual thing we want to do!)
  // ------------------
  return partitionedFoods.reduce(
    ({ labeledFoods, rawLabels }, foods, partitionIdx) => {
      const mealCalories = partionedCalories[partitionIdx];
      const mealTime = localTimeToDate(foods[0].eatenAtLocalTime).getHours();
      const newRawLabel = getRawLabel(mealCalories, mealTime);
      const mealLabel = getMealLabel(mealCalories, newRawLabel, rawLabels);
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
