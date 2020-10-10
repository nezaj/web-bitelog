/*
 * Helpers for marshalling data
 */
const { HEALTH_WATER_KEY, HEALTH_BODY_MASS_KEY } = require("./constants.js");
const {
  createImageDetail,
  extractDate,
  getImageKey,
  localTimeToDate,
  maxDate,
  mostRecentWeekDayDate,
  isMorning,
  isAfternoon,
  isEvening,
  isLateNight,
  addDays,
  max,
  min,
  avg,
  round,
} = require("./utils.js");
const {
  extractCalories,
  extractProtein,
  extractFat,
  extractCarbs,
  sumNutrients,
} = require("./nutrients.js");

// 236.59ml is 1 US cup
const ML_TO_CUPS_DIVISOR = 236.59;

// 1000ms -> second, 60 second -> min
const MS_TO_MIN = 1000 * 60;

// Used for weekly trend data
const WEEK_ENDING_ON_DAYNAME = "Sunday";
const GROUP_SIZE = 7;

// Hueristics for labeling meals
const GROUPING_CUTOFF_MIN = 45;
const MEAL_CALORIES_CUTOFF = 500;
const LARGE_MEAL_CALORIES_CUTOFF = 1000;

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

// Marshall data to use datestamps as top level keys
// Note: This is currently the "top-level" marshalling, as the other marshal functions use data
// outputted from this function. If data format every changes you should only need to update this function
// and the other marshall functions should work as is
const entriesToDateMap = (entries) => {
  return entries.reduce((xs, x) => {
    const dateKey = extractDate(localTimeToDate(x.eatenAtLocalTime));
    xs[dateKey] = xs[dateKey] || [];
    xs[dateKey] = xs[dateKey].concat(x);
    return xs;
  }, {});
};

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

// Groups date value tuples by cut-off dates. Takes in an updater function for flexibility in defining how successive
// cuttoffs can be updated (e.g. addDays(dateCutoff, -7) to decrement the cutoff by a week)
const _groupByDateCutoff = (fnCutoffUpdater, dateValueTuples, initialDate) => {
  return dateValueTuples.reduce(
    ({ groups, dateCutoff }, tuple) => {
      const date = tuple[0];
      if (new Date(dateCutoff) < new Date(date)) {
        const previousGroups = groups.slice(0, -1);
        const newGroup = [groups.slice(-1)[0].concat([tuple])]; // intent: append the new tuple the last list of tuples
        return { groups: previousGroups.concat(newGroup), dateCutoff };
      } else {
        const newGroup = [[tuple]];
        return {
          groups: groups.concat(newGroup),
          dateCutoff: fnCutoffUpdater(dateCutoff),
        };
      }
    },
    { groups: [[]], dateCutoff: initialDate }
  ).groups;
};

// Transforms tuples of daily values into a map of weekly statistics
const _buildWeeklyStats = (dailyTuples) => {
  const latestDate = maxDate(dailyTuples.map(([date, _]) => date));
  const filterDate = mostRecentWeekDayDate(latestDate, WEEK_ENDING_ON_DAYNAME);
  const filtered = dailyTuples
    .filter(([date, _]) => new Date(date) <= new Date(filterDate))
    .sort((second, first) =>
      new Date(first[0]) < new Date(second[0]) ? -1 : 1
    ); // latest dates first

  const grouped = _groupByDateCutoff(
    (dateCutoff) => addDays(dateCutoff, -1 * GROUP_SIZE),
    filtered,
    addDays(filterDate, -1 * GROUP_SIZE)
  ).filter((x) => x.length); // remove empty groups

  const minValues = grouped.map((group) => [
    maxDate(group.map((c) => c[0])),
    min(group.map((c) => c[1])),
  ]);
  const maxValues = grouped.map((group) => [
    maxDate(group.map((c) => c[0])),
    max(group.map((c) => c[1])),
  ]);
  const averageValues = grouped.map((group) => [
    maxDate(group.map((c) => c[0])),
    round(avg(group.map((c) => c[1])), 2),
  ]);
  return { minValues, maxValues, averageValues };
};

const _buildWeeklyStatsMap = (dailyMap, keys) => {
  return keys.reduce(
    (res, key) =>
      Object.assign({}, res, {
        [key]: _buildWeeklyStats(dailyMap[key]),
      }),
    {}
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
  macros: {calories: 224, protein: 6, fats: 7, carbs: 35g}
  items: [{name: "Raw Celerey", subtitle: "", servingUnits: 4, servingDetails: "medium stalks", calories: 26}, ...]
}
*/
const imageDetailMap = (dateToEntriesMap) => {
  return Object.keys(dateToEntriesMap)
    .map((ds) => dateToEntriesMap[ds])
    .map((dsFoods) => tagFoodsWithMealGroup(dsFoods))
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

Takes in
[
  {foodItemName: ..., nutrients: {calories: 100, ...}, ...},
  {foodItemName: ..., nutrients: {calories: 200, ...}, ...},
  {foodItemName: ..., nutrients: {calories: 500, ...}, ...},
  ...
[

And returns
{
  items: [
    [
      {foodItemName: ..., nutrients: {calories: 100, ...}, ...},
      {foodItemName: ..., nutrients: {calories: 200, ...}, ...},
    ],
    [
      {foodItemName: ..., nutrients: {calories: 500, ...}, ...}
    ]
    ...
  ],
  calories: [300, 500, ...]
}
*/
const mealFoodsPartition = (foods) => {
  const minutesBetween = (ts1, ts2) => {
    return Math.floor(Math.abs(new Date(ts1) - new Date(ts2)) / MS_TO_MIN);
  };

  return foods
    .sort((second, first) =>
      second.eatenAtLocalTime <= first.eatenAtLocalTime ? -1 : 1
    )
    .reduce(
      ({ partitionedFoods, partionedCalories }, food) => {
        const lastIdx = partitionedFoods.length - 1;
        const lastPartition = partitionedFoods[lastIdx];
        const partitionStart = lastPartition && lastPartition[0];
        const foodCalories = extractCalories(food.nutrients);
        if (
          !partitionStart ||
          GROUPING_CUTOFF_MIN <=
            minutesBetween(partitionStart.eatenAtUTC, food.eatenAtUTC)
        ) {
          return {
            partitionedFoods: partitionedFoods.concat([[food]]),
            partionedCalories: partionedCalories.concat(foodCalories),
          };
        } else {
          partitionedFoods[lastIdx] = lastPartition.concat(food);
          partionedCalories[lastIdx] =
            partionedCalories[lastIdx] + foodCalories;
          return { partitionedFoods, partionedCalories };
        }
      },
      { partitionedFoods: [], partionedCalories: [] }
    );
};

/*
Helper function for transforming partions of foods into a flattened list
of foods withs a meal label
*/
const labelFoodsWithMealGroup = ({ partitionedFoods, partionedCalories }) => {
  const isFast = (calories) => calories === 0;
  const isSnack = (calories) => 0 < calories && calories < MEAL_CALORIES_CUTOFF;
  const isMeal = (calories) =>
    MEAL_CALORIES_CUTOFF <= calories && calories < LARGE_MEAL_CALORIES_CUTOFF;
  const isLargeMeal = (calories) => LARGE_MEAL_CALORIES_CUTOFF <= calories;

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
  // duplicate label types when we display them (e.g. Afternoon snack, Afternoon snack (2))
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

/* Tags individual foods with their associated meal group */
const tagFoodsWithMealGroup = (foods) =>
  labelFoodsWithMealGroup(mealFoodsPartition(foods));

module.exports.buildHealthMap = buildHealthMap;
module.exports.entriesToDateMap = entriesToDateMap;
module.exports.imageDetailMap = imageDetailMap;
module.exports.nutrientsToDailyTotalsMap = nutrientsToDailyTotalsMap;
module.exports.healthToDailyTotalsMap = healthToDailyTotalsMap;
module.exports.tagFoodsWithMealGroup = tagFoodsWithMealGroup;
module.exports.weeklyNutrientsStatsMap = weeklyNutrientsStatsMap;
module.exports.weeklyHealthStatsMap = weeklyHealthStatsMap;
