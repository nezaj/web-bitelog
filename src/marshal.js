/*
 * Helpers for marshalling data
 */
const { HEALTH_WATER_KEY, HEALTH_BODY_MASS_KEY } = require("./constants.js");
const {
  createImageDetail,
  extractDate,
  getImageKey,
  localTimeToDate,
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
  const getMealLabel = (calories, mealCount, snackCount) => {
    if (isFast(calories)) {
      return "Fast";
    } else if (isSnack(calories)) {
      return `Snack ${snackCount}`;
    } else if (isMeal(calories)) {
      return `Meal ${mealCount}`;
    } else if (isLargeMeal(calories)) {
      return `Meal ${mealCount} (large)`;
    } else {
      return "Unknown";
    }
  };

  return partitionedFoods.reduce(
    ({ labeledFoods, mealCount, snackCount }, foods, partitionIdx) => {
      const mealCalories = partionedCalories[partitionIdx];
      const mealLabel = getMealLabel(mealCalories, mealCount, snackCount);
      // (XXX): Webpack won't build in production if I do foods.map((food) => ({...food, mealLabel}))
      // due to an issue with the spread operator. Instead we use Object.assign
      const newFoods = foods.map((food) =>
        Object.assign({}, food, { mealLabel })
      );
      return {
        labeledFoods: newFoods.concat(labeledFoods), // Similarly Webpack won't build in production if we do [...newFoods, ...labelFoods]
        mealCount:
          isMeal(mealCalories) || isLargeMeal(mealCalories)
            ? mealCount + 1
            : mealCount,
        snackCount: isSnack(mealCalories) ? snackCount + 1 : snackCount,
      };
    },
    { labeledFoods: [], mealCount: 1, snackCount: 1 }
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
