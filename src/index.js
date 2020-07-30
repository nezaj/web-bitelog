import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import { entriesToDateMap, imageDetailMap } from "./marshal.js";
import foodData from "./data/food.json";
import { notesData } from "./data/notesData.js";

const entries = entriesToDateMap(foodData.entries);
const entryDetailMap = imageDetailMap(entries);

ReactDOM.render(
  <React.StrictMode>
    <App
      entriesToDateMap={entries}
      entryDetailMap={entryDetailMap}
      notesData={notesData}
    />
  </React.StrictMode>,
  document.getElementById("root")
);
