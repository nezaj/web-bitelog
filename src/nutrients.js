/*
 * Nutrient helpers
 */
const extractNutrient = (nutrients, name) =>
  nutrients.find((x) => x.name === name) || { amount: 0 };
const extractCalories = (nutrients) =>
  extractNutrient(nutrients, "calories").amount;
const extractProtein = (nutrients) =>
  extractNutrient(nutrients, "protein").amount;
const extractFat = (nutrients) => extractNutrient(nutrients, "totalFat").amount;
const extractCarbs = (nutrients) =>
  extractNutrient(nutrients, "totalCarb").amount;

const sumNutrients = (items, name) =>
  Math.round(
    items.reduce(
      (xs, x) => (xs += extractNutrient(x.nutrients, name).amount),
      0
    )
  );

module.exports = {
  extractNutrient,
  extractCalories,
  extractProtein,
  extractFat,
  extractCarbs,
  sumNutrients,
};
