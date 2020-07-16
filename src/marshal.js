/*
 * Helpers for marshalling data
 */
const {
  createImageDetail,
  extractLocaleDate,
  getImageKey,
} = require("./utils.js");
const {
  extractCalories,
  extractProtein,
  extractFat,
  extractCarbs,
  sumNutrients,
} = require("./nutrients.js");

// Marshall data to use datestamps as top level keys
// Note: This is currently the "top-level" marshalling, as the other marshal functions use data
// outputted from this function
const entriesToDateMap = (entries) => {
  return entries.reduce((xs, x) => {
    const dateKey = extractLocaleDate(x.eatenAtUTC);
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
    .reduce((xs, x) => xs.concat(x), []) // flatten
    .reduce((xs, x) => {
      // Get imageKey
      const key = getImageKey(x.imageURL, x.mealID);
      xs[key] = xs[key] || createImageDetail(key, x.imageURL, x.eatenAtUTC);

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

module.exports = {
  entriesToDateMap,
  imageDetailMap,
  nutrientsToDailyTotalsMap,
};
