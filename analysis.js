/*
 * Space for analyzing food data
 */
const repl = require("repl");

const fs = require("fs");
const path = require("path");

const ObjectsToCsv = require("objects-to-csv");

const { collect, round } = require("./src/utils.js");
const { sumNutrients } = require("./src/nutrients.js");
const { entriesToDateMap } = require("./src/marshal.js");

const foodPath = path.resolve(__dirname, "src", "data", "food.json");
const foodData = JSON.parse(fs.readFileSync(foodPath, "utf8"));
const entriesData = entriesToDateMap(foodData.entries);

// Analysis
const allFoods = Object.keys(entriesData)
  .map((k) => entriesData[k])
  .reduce((acc, x) => acc.concat(x));

const allFoodsByDate = (dateKey) =>
  allFoods.filter((x) => new Date(x.dateKey) < new Date(dateKey));

const orderedByCalories = (allFoods) => {
  const grouped = collect((x) => x.foodItemName, allFoods);
  const sorted = Object.keys(grouped)
    .map((k) => grouped[k])
    .sort((a, b) => sumNutrients(b, "calories") - sumNutrients(a, "calories"));
  const processed = sorted
    .map((g) => ({
      name: g[0].foodItemName,
      calories: sumNutrients(g, "calories"),
      avgCalories: round(sumNutrients(g, "calories") / g.length, 0),
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

// These 20 foods made up ~80% of my total calories for 2020
const foods2020 = () => {
  const data = allFoodsByDate("12/31/2020");
  const top20 = orderedByCalories(data)
    .map((f) => ({
      rank: f.rank,
      name: f.name,
      totalCalories: f.calories,
      count: f.count,
      avgCalories: f.avgCalories,
      pct: round(100.0 * f.pct, 2),
      runningPct: round(100.0 * f.runningPct, 2),
    }))
    .slice(0, 20);
  const lastItem = top20[top20.length - 1];
  console.log([top20, lastItem.runningPct]);

  const csv = new ObjectsToCsv(top20);
  csv.toDisk("./foods2020.csv");
  console.log("Saved 2020 foods to csv!");
};

function initializeContext(context) {
  context.foods2020 = foods2020;
}

// Start repl
// ---------------------------------------------------------------------------
const r = repl.start({
  prompt: "my-analysis > ",
});
initializeContext(r.context);

r.on("reset", initializeContext);
