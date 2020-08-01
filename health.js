/*
 * Script for importing apple health export, filtering for relevant data, and outputing
 * json of filtered results
 *
 * Usage: node heath.js
 */
const fs = require("fs");
const path = require("path");

// const {
//   HEALTH_BODY_MASS_KEY,
//   HEALTH_WATER_KEY,
// } = require("./src/constants.js");

const BODY_MASS_KEY = "HKQuantityTypeIdentifierBodyMass";
const WATER_KEY = "HKQuantityTypeIdentifierDietaryWater";
const healthKeys = new Set([BODY_MASS_KEY, WATER_KEY]);

// const healthKeys = new Set([HEALTH_BODY_MASS_KEY, HEALTH_WATER_KEY]);

try {
  const dataPath = path.resolve(__dirname, "src", "data", "temp_health.json");
  const healthData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const filteredData = Object.keys(healthData)
    .filter((key) => healthKeys.has(key))
    .reduce((healthMap, key) => {
      let refinedKey;
      switch (key) {
        case BODY_MASS_KEY:
          refinedKey = "bodyMass";
          break;
        case WATER_KEY:
          refinedKey = "water";
          break;
        // Unsupported key
        default:
          return healthMap;
      }

      healthMap[refinedKey] = healthData[key];
      return healthMap;
    }, {});

  const outPath = path.resolve(__dirname, "src", "data", "health.json");
  fs.writeFileSync(outPath, JSON.stringify(filteredData));
} catch (error) {
  console.log("Error while importing health data!");
  console.log(error);
  process.exit(1);
}

console.log("Imported filtered health data!");
process.exit(0);
