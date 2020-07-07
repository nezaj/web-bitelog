import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import data from "./data/sample.json";

// Extract local datestamp from utc timestamp: '2020-06-28T22:06:39.171Z' -> '6/28/2020'
const extractLocalDate = (utcTimeStamp) =>
  new Date(utcTimeStamp).toLocaleString().split(",")[0];

// Marshall data to use datestamps as top level keys
const entriesToDateMap = (entries) => {
  return entries.reduce((xs, x) => {
    const dateKey = extractLocalDate(x.eatenAtUTC);
    xs[dateKey] = xs[dateKey] || [];
    xs[dateKey] = xs[dateKey].concat(x);
    return xs;
  }, {});
};

const entries = entriesToDateMap(data.entries);

ReactDOM.render(
  <React.StrictMode>
    <App entriesToDateMap={entries} />
  </React.StrictMode>,
  document.getElementById("root")
);
