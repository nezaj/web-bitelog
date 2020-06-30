import React from "react";
import "./App.css";

import data from "./data/sample.json";

// Helpers
// ---------------------------------------------------------------------------

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

const extractNutrient = (nutrients, name) =>
  nutrients.find((x) => x.name === name);

// Functional Components
// ---------------------------------------------------------------------------
const renderItem = (item) => {
  const cal = extractNutrient(item.nutrients, "calories");
  const protein = extractNutrient(item.nutrients, "protein");
  const fat = extractNutrient(item.nutrients, "totalFat");
  const carb = extractNutrient(item.nutrients, "totalCarb");

  const label = {
    name: `${item.foodItemName}`,
    cal: `${Math.round(cal.amount)}${cal.unit}`,
    protein: `${Math.round(protein.amount)}${protein.unit}`,
    fat: `${Math.round(fat.amount)}${fat.unit}`,
    carb: `${Math.round(carb.amount)}${carb.unit}`,
  };

  return (
    <li className="item">
      {label.name}: {label.cal}, Protein: {label.protein}, Fat {label.fat},
      Carbs {label.carb}
    </li>
  );
};

const renderDay = (title, items) => {
  const rawTotals = items.reduce(
    (xs, x) => {
      xs["cal"] += extractNutrient(x.nutrients, "calories").amount;
      xs["protein"] += extractNutrient(x.nutrients, "protein").amount;
      xs["fat"] += extractNutrient(x.nutrients, "totalFat").amount;
      xs["carb"] += extractNutrient(x.nutrients, "totalCarb").amount;
      return xs;
    },
    { cal: 0, protein: 0, fat: 0, carb: 0 }
  );

  const label = {
    cal: Math.round(rawTotals.cal),
    protein: Math.round(rawTotals.protein),
    fat: Math.round(rawTotals.fat),
    carb: Math.round(rawTotals.carb),
  };

  return (
    <div className="day">
      <h2>
        {title}: {label.cal}cal, Protein: {label.protein}g, Fat: {label.fat}g,
        Carbs: {label.carb}g
      </h2>
      <ul>{items.map((i) => renderItem(i))}</ul>
    </div>
  );
};

// Stateful Components
// ---------------------------------------------------------------------------
class App extends React.Component {
  constructor(props) {
    super(props);

    const entries = entriesToDateMap(data.entries);

    this.state = { entries };
  }

  render() {
    const { entries } = this.state;
    const dates = Object.keys(entries).map((ds) => renderDay(ds, entries[ds]));

    return <div>{dates}</div>;
  }
}

export default App;
