/*
 * Nutrient helpers
 */
const extractNutrient = (nutrients, name) => {
  const { amount } = nutrients.find((x) => x.name === name) || { amount: 0 };
  return amount;
};
const extractCalories = (nutrients) => extractNutrient(nutrients, "calories");
const extractProtein = (nutrients) => extractNutrient(nutrients, "protein");
const extractFat = (nutrients) => extractNutrient(nutrients, "totalFat");
const extractCarbs = (nutrients) => extractNutrient(nutrients, "totalCarb");

const sumNutrients = (items, name) =>
  Math.round(
    items.reduce((xs, x) => (xs += extractNutrient(x.nutrients, name)), 0)
  );

module.exports.extractNutrient = extractNutrient;
module.exports.extractCalories = extractCalories;
module.exports.extractProtein = extractProtein;
module.exports.extractFat = extractFat;
module.exports.extractCarbs = extractCarbs;
module.exports.sumNutrients = sumNutrients;
