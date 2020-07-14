import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import { entriesToDateMap, imageDetailMap } from "./marshal.js";
import data from "./data/sample.json";

const entries = entriesToDateMap(data.entries);
const entryDetailMap = imageDetailMap(entries);

ReactDOM.render(
  <React.StrictMode>
    <App entriesToDateMap={entries} entryDetailMap={entryDetailMap} />
  </React.StrictMode>,
  document.getElementById("root")
);
