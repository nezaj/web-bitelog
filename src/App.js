import React from "react";
import "./App.css";

// Helpers
// ---------------------------------------------------------------------------
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

const App = ({ entries }) => {
  const dates = Object.keys(entries).map((ds) => renderDay(ds, entries[ds]));
  return <div>{dates}</div>;
};

export default App;
