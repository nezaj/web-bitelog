const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  entriesToDateMap,
  imageDetailMap,
  nutrientsToDailyTotalsMap,
} = require("./src/marshal.js");

// Main
// ----------------------------------------------------------------------------
try {
  // Import data
  const dataPath = path.resolve(__dirname, "src", "data", "temp_sample.json");
  const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const entriesData = entriesToDateMap(rawData.entries);
  const trendsData = nutrientsToDailyTotalsMap(entriesData);
  const entryDetailMap = imageDetailMap(entriesData);

  // Raw data should have a key for entries
  assert(rawData.entries);

  // All entries should have local eaten at time
  assert(
    Object.keys(entriesData)
      .map((key) => entriesData[key])
      .reduce((xs, x) => xs.concat(x), [])
      .every((x) => x.eatenAtLocalTime)
  );

  // Trends data has macros
  assert(trendsData.calories);
  assert(trendsData.protein);
  assert(trendsData.fat);
  assert(trendsData.carbs);

  // All image details should have a key
  assert(
    Object.keys(entryDetailMap)
      .map((key) => entryDetailMap[key])
      .every((x) => x.key)
  );
} catch (error) {
  console.log("Error while validaitng data!");
  console.log(error);
  process.exit(1);
}

console.log("Data validated! All looks well :)");
process.exit(0);
