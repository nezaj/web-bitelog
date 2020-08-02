import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import { entriesToDateMap, imageDetailMap } from "./marshal.js";
import foodData from "./data/food.json";

// (TODO) These can just be json files of marshalled data
import { healthData } from "./data/healthData.js";
import { notesData } from "./data/notesData.js";

// (TODO) Generate this data as part of new-food step
const entries = entriesToDateMap(foodData.entries);
const entryDetailMap = imageDetailMap(entries);

ReactDOM.render(
  <React.StrictMode>
    <App
      entriesToDateMap={entries}
      entryDetailMap={entryDetailMap}
      notesData={notesData}
      healthData={healthData}
    />
  </React.StrictMode>,
  document.getElementById("root")
);
