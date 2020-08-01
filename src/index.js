import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import { buildHealthMap, entriesToDateMap, imageDetailMap } from "./marshal.js";
import foodData from "./data/food.json";
import healthData from "./data/health.json";
import { notesData } from "./data/notesData.js";

const entries = entriesToDateMap(foodData.entries);
const entryDetailMap = imageDetailMap(entries);
const healthEntries = buildHealthMap(healthData);

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
