import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import { buildHealthMap, entriesToDateMap, imageDetailMap } from "./marshal.js";
import foodData from "./data/food.json";
import healthData from "./data/health.json";
import { notesData } from "./data/notesData.js";

const entries = entriesToDateMap(foodData.entries);
const entryDetailMap = imageDetailMap(entries);
// const healthEntries = buildHealthMap(healthData);

const healthEntries = {
  "7/8/2020": {
    HKQuantityTypeIdentifierDietaryWater: 3,
    HKQuantityTypeIdentifierBodyMass: 157.6,
  },
  "7/9/2020": {
    HKQuantityTypeIdentifierDietaryWater: 3.1039350775603363,
    HKQuantityTypeIdentifierBodyMass: 157,
  },
  "7/10/2020": {
    HKQuantityTypeIdentifierDietaryWater: 4,
    HKQuantityTypeIdentifierBodyMass: 159.4,
  },
  "7/11/2020": {
    HKQuantityTypeIdentifierDietaryWater: 11,
    HKQuantityTypeIdentifierBodyMass: 158.4,
  },
  "7/12/2020": {
    HKQuantityTypeIdentifierDietaryWater: 5,
    HKQuantityTypeIdentifierBodyMass: 156.8,
  },
  "7/13/2020": {
    HKQuantityTypeIdentifierDietaryWater: 6,
    HKQuantityTypeIdentifierBodyMass: 157.6,
  },
  "7/14/2020": { HKQuantityTypeIdentifierDietaryWater: 6 },
  "7/15/2020": { HKQuantityTypeIdentifierDietaryWater: 4 },
  "7/16/2020": { HKQuantityTypeIdentifierDietaryWater: 8 },
  "7/17/2020": {
    HKQuantityTypeIdentifierDietaryWater: 4,
    HKQuantityTypeIdentifierBodyMass: 158.2,
  },
  "7/21/2020": { HKQuantityTypeIdentifierDietaryWater: 3 },
  "7/23/2020": {
    HKQuantityTypeIdentifierDietaryWater: 8,
    HKQuantityTypeIdentifierBodyMass: 156,
  },
  "7/24/2020": { HKQuantityTypeIdentifierDietaryWater: 8 },
  "7/25/2020": {
    HKQuantityTypeIdentifierDietaryWater: 8,
    HKQuantityTypeIdentifierBodyMass: 155.6,
  },
  "7/26/2020": {
    HKQuantityTypeIdentifierDietaryWater: 8,
    HKQuantityTypeIdentifierBodyMass: 154.8,
  },
  "7/27/2020": {
    HKQuantityTypeIdentifierDietaryWater: 8,
    HKQuantityTypeIdentifierBodyMass: 157,
  },
  "7/28/2020": {
    HKQuantityTypeIdentifierDietaryWater: 8,
    HKQuantityTypeIdentifierBodyMass: 155.6,
  },
  "7/29/2020": { HKQuantityTypeIdentifierDietaryWater: 8 },
  "7/30/2020": {
    HKQuantityTypeIdentifierDietaryWater: 5,
    HKQuantityTypeIdentifierBodyMass: 156.6,
  },
  "7/31/2020": {
    HKQuantityTypeIdentifierDietaryWater: 8,
    HKQuantityTypeIdentifierBodyMass: 156.4,
  },
  "6/23/2020": { HKQuantityTypeIdentifierBodyMass: 159.6 },
  "6/24/2020": { HKQuantityTypeIdentifierBodyMass: 157.6 },
  "6/25/2020": { HKQuantityTypeIdentifierBodyMass: 157.6 },
  "6/26/2020": { HKQuantityTypeIdentifierBodyMass: 157 },
  "7/1/2020": { HKQuantityTypeIdentifierBodyMass: 158.6 },
  "7/2/2020": { HKQuantityTypeIdentifierBodyMass: 157.6 },
  "7/6/2020": { HKQuantityTypeIdentifierBodyMass: 159.2 },
  "7/22/2020": { HKQuantityTypeIdentifierBodyMass: 156 },
};

ReactDOM.render(
  <React.StrictMode>
    <App
      entriesToDateMap={entries}
      entryDetailMap={entryDetailMap}
      notesData={notesData}
      healthEntries={healthEntries}
    />
  </React.StrictMode>,
  document.getElementById("root")
);
