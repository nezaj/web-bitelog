/*
 * Space for analyzing food data
 */
const repl = require("repl");

const fs = require("fs");
const path = require("path");

const ObjectsToCsv = require("objects-to-csv");

const utils = require("./src/utils.js");
const {
  extractCalories,
  extractProtein,
  extractFat,
  extractCarbs,
  sumNutrients,
} = require("./src/nutrients.js");
const { entriesToDateMap } = require("./src/marshal.js");

const foodPath = path.resolve(__dirname, "src", "data", "food.json");
const foodData = JSON.parse(fs.readFileSync(foodPath, "utf8"));
const entriesData = entriesToDateMap(foodData.entries);

// Analysis
const allFoods = Object.keys(entriesData)
  .map((k) => entriesData[k])
  .reduce((acc, x) => acc.concat(x));

// start/end in the form of MM/DD/YYYY -- not inclusive of end
const allFoodsBetween = ({ start, end }) =>
  allFoods.filter(
    (x) =>
      (end ? new Date(x.dateKey) < new Date(end) : true) &&
      (start ? new Date(x.dateKey) >= new Date(start) : true)
  );

const macroSummary = ({ start, end }) => {
  const foods = allFoodsBetween({ start, end }).reduce(
    (xs, { dateKey, nutrients }) => {
      xs["calories"] = xs["calories"] += utils.round(
        extractCalories(nutrients),
        0
      );
      xs["proteins"] = xs["proteins"] += utils.round(
        extractProtein(nutrients),
        0
      );
      xs["carbs"] = xs["carbs"] += utils.round(extractCarbs(nutrients), 0);
      xs["fats"] = xs["fats"] += utils.round(extractFat(nutrients), 0);
      xs["days"].add(dateKey);
      return xs;
    },
    { calories: 0, proteins: 0, carbs: 0, fats: 0, days: new Set() }
  );

  const temp = {
    start: utils.minDate([...foods.days]),
    end: utils.maxDate([...foods.days]),
    numDays: foods.days.size,
    calories: foods.calories,
    avgCals: utils.round(foods.calories / (1.0 * foods.days.size), 0),
    avgCarbs: utils.round(foods.carbs / (1.0 * foods.days.size), 0),
    avgFats: utils.round(foods.fats / (1.0 * foods.days.size), 0),
    avgProteins: utils.round(foods.proteins / (1.0 * foods.days.size), 0),
  };

  return {
    ...temp,
    pctCarbs: utils.perc(temp.avgCarbs * 4, temp.avgCals),
    pctFats: utils.perc(temp.avgFats * 9, temp.avgCals),
    pctProteins: utils.perc(temp.avgProteins * 4, temp.avgCals),
    numDaysMissing: utils.round(
      utils.daysBetween(temp.start, end || temp.end) - foods.days.size,
      0
    ),
  };
};

const orderedByCalories = (allFoods) => {
  const grouped = utils.collect((x) => x.foodItemName, allFoods);
  const sorted = Object.keys(grouped)
    .map((k) => grouped[k])
    .sort((a, b) => sumNutrients(b, "calories") - sumNutrients(a, "calories"));
  const processed = sorted
    .map((g) => ({
      name: g[0].foodItemName,
      calories: sumNutrients(g, "calories"),
      avgCalories: utils.round(sumNutrients(g, "calories") / g.length, 0),
      count: g.length,
    }))
    .filter((x) => x.count >= 5); // Remove in-frequent foods

  const allCals = processed.reduce((total, x) => (total += x.calories), 0);

  const withPct = processed.map((x) => ({
    pct: (1.0 * x.calories) / allCals,
    ...x,
  }));
  const withRunningPct = withPct.map((x, idx) => ({
    rank: idx + 1,
    runningPct:
      x.pct +
      (idx > 0
        ? withPct
            .filter((_, idx2) => idx2 < idx)
            .reduce((total, g) => (total += g.pct), 0)
        : 0),
    ...x,
  }));

  return withRunningPct;
};

function topFoods({ num, start, end }) {
  const data = allFoodsBetween({ start, end });
  const top = orderedByCalories(data)
    .map((f) => ({
      rank: f.rank,
      name: f.name,
      totalCalories: f.calories,
      count: f.count,
      avgCalories: f.avgCalories,
      pct: utils.round(100.0 * f.pct, 2),
      runningPct: utils.round(100.0 * f.runningPct, 2),
    }))
    .slice(0, num);
  const lastItem = top[top.length - 1];
  console.log([top, "Total % of calories ", lastItem.runningPct]);
  return top;
}

function topFoodsCSV({ num, start, end, filename }) {
  if (!filename) {
    console.log("Must have a filename!");
    return;
  }
  const top = topFoods({ num, start, end });
  const csv = new ObjectsToCsv(top);
  csv.toDisk(`./${filename}.csv`);
  console.log(`Saved top ${num} foods to ${filename}.csv!`);
}

const foods2020 = () => {
  topFoodsCSV({
    num: 20,
    start: "01/01/2020",
    end: "12/31/2020",
    filename: "foods2020",
  });
};

const macroSummaries = () => {
  return [
    { start: "06/01/2020", end: "09/01/2020" },
    { start: "09/01/2020", end: "12/01/2020" },
    { start: "12/01/2020", end: "03/01/2021" },
    { start: "03/01/2021", end: "06/01/2021" },
    { start: "06/01/2021" },
  ].map((args) => macroSummary(args));
};

function initializeContext(context) {
  context.allFoods = allFoods;
  context.allFoodsBetween = allFoodsBetween;
  context.orderedByCalories = orderedByCalories;
  context.topFoods = topFoods;
  context.topFoodsCSV = topFoodsCSV;
  context.foods2020 = foods2020;
  context.macroSummary = macroSummary;
  context.macroSummaries = macroSummaries;
  context.utils = utils;
}

// Start repl
// ---------------------------------------------------------------------------
const r = repl.start({
  prompt: "my-analysis > ",
});
initializeContext(r.context);

r.on("reset", initializeContext);
