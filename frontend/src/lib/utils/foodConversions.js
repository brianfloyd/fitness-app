/**
 * Unit conversion utilities for food tracking.
 * Converts various units to grams (base unit for USDA data).
 *
 * MacroFactor alignment: Use reported calories only. MacroFactor uses Atwater-specific factors;
 * calories often differ from 4*P + 9*F + 4*C. For custom/MacroFactor-imported foods we never
 * recompute calories from macros—we scale stored per-serving values by amount.
 */

/**
 * Convert amount from various units to grams
 * @param {number} amount - Amount to convert
 * @param {string} unit - Unit of the amount (g, oz, cup, serving, etc.)
 * @param {Object} foodData - USDA food data object (for portion-specific conversions)
 * @returns {number} Amount in grams
 */
export function convertToGrams(amount, unit, foodData = null) {
  if (!amount || isNaN(amount)) return 0;
  
  const unitLower = unit.toLowerCase().trim();
  
  // Direct conversions
  if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') {
    return parseFloat(amount);
  }
  
  if (unitLower === 'oz' || unitLower === 'ounce' || unitLower === 'ounces') {
    return parseFloat(amount) * 28.3495;
  }
  
  // Serving-based conversions
  if (unitLower === 'serving' || unitLower === 'servings') {
    if (foodData && foodData.servingSize && foodData.servingSizeUnit) {
      const servingSizeGrams = convertToGrams(foodData.servingSize, foodData.servingSizeUnit, foodData);
      return parseFloat(amount) * servingSizeGrams;
    }
    // Fallback: assume 100g per serving if no serving size data
    return parseFloat(amount) * 100;
  }
  
  // Portion-based conversions (cups, etc.)
  if (foodData && foodData.foodPortions && Array.isArray(foodData.foodPortions)) {
    const portion = foodData.foodPortions.find(p => {
      const measureName = p.measureUnit?.name?.toLowerCase() || '';
      return measureName === unitLower || measureName.includes(unitLower);
    });
    
    if (portion && portion.gramWeight) {
      return parseFloat(amount) * portion.gramWeight;
    }
  }
  
  // Common volume conversions (approximate, food-specific)
  const volumeConversions = {
    'cup': 240, // Approximate grams for 1 cup (varies by food)
    'cups': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tablespoons': 15,
    'tsp': 5,
    'teaspoon': 5,
    'teaspoons': 5,
    'ml': 1, // For water-like density
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000,
    'fl oz': 29.5735,
    'fluid ounce': 29.5735,
    'fluid ounces': 29.5735,
  };
  
  if (volumeConversions[unitLower]) {
    // For volume units, we need food density - use a rough estimate
    // This is approximate and may not be accurate for all foods
    return parseFloat(amount) * volumeConversions[unitLower];
  }
  
  // Unknown unit - return as-is (assume grams)
  console.warn(`Unknown unit "${unit}", assuming grams`);
  return parseFloat(amount);
}

/**
 * Get available units for a food based on its data
 * @param {Object} foodData - USDA food data object
 * @returns {Array} Array of available unit strings
 */
export function getAvailableUnits(foodData) {
  const units = ['g', 'oz']; // Always available
  
  if (!foodData) return units;
  
  // Add serving size if available
  if (foodData.servingSize && foodData.servingSizeUnit) {
    const servingUnit = foodData.servingSizeUnit.toLowerCase();
    if (!units.includes(servingUnit)) {
      units.push(servingUnit);
    }
    if (!units.includes('serving')) {
      units.push('serving');
    }
  }
  
  // Add food portions
  if (foodData.foodPortions && Array.isArray(foodData.foodPortions)) {
    foodData.foodPortions.forEach(portion => {
      if (portion.measureUnit && portion.measureUnit.name) {
        const unitName = portion.measureUnit.name.toLowerCase();
        if (!units.includes(unitName)) {
          units.push(unitName);
        }
      }
    });
  }
  
  return units;
}

/**
 * Calculate macros for a food item based on amount and unit
 * @param {Object} foodData - USDA food data object
 * @param {number} amount - Amount of food
 * @param {string} unit - Unit of the amount
 * @returns {Object} Object with protein, fat, carbs, calories
 */
export function calculateMacros(foodData, amount, unit) {
  if (!foodData || !foodData.foodNutrients) {
    return { protein: 0, fat: 0, carbs: 0, calories: 0 };
  }
  
  // Convert to grams
  const grams = convertToGrams(amount, unit, foodData);
  const multiplier = grams / 100; // USDA data is per 100g
  
  // Find nutrients (nutrient IDs from USDA)
  // Protein: 1003, Fat: 1004, Carbs: 1005, Calories: 1008
  const nutrients = {
    protein: null,
    fat: null,
    carbs: null,
    calories: null,
  };
  
  foodData.foodNutrients.forEach(nutrient => {
    const nutrientId = nutrient.nutrient?.id || nutrient.nutrientId;
    const value = nutrient.amount || nutrient.value || 0;
    
    if (nutrientId === 1003) nutrients.protein = value; // Protein
    if (nutrientId === 1004) nutrients.fat = value; // Total lipid (fat)
    if (nutrientId === 1005) nutrients.carbs = value; // Carbohydrate, by difference
    if (nutrientId === 1008) nutrients.calories = value; // Energy (kcal)
  });
  
  // Calculate macros for the amount
  const protein = (nutrients.protein || 0) * multiplier;
  const fat = (nutrients.fat || 0) * multiplier;
  const carbs = (nutrients.carbs || 0) * multiplier;
  
  // Calculate calories if not available, or use provided
  let calories = (nutrients.calories || 0) * multiplier;
  if (!nutrients.calories || calories === 0) {
    // Fallback calculation: protein*4 + fat*9 + carbs*4
    calories = (protein * 4) + (fat * 9) + (carbs * 4);
  }
  
  return {
    protein: Math.round(protein * 10) / 10, // Round to 1 decimal
    fat: Math.round(fat * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    calories: Math.round(calories),
  };
}

/** Units supported for custom foods (no USDA portions). */
const CUSTOM_FOOD_UNITS = ['g', 'oz', 'serving', 'servings'];

/**
 * Get available units for a custom food.
 * @param {Object} customFood - { serving_size, serving_unit }
 * @returns {string[]}
 */
export function getAvailableUnitsForCustom(customFood) {
  const u = [...CUSTOM_FOOD_UNITS];
  const su = (customFood?.serving_unit || 'g').toLowerCase();
  if (su && !u.includes(su)) u.push(su);
  return u;
}

/**
 * Calculate macros for a custom food. Scales linearly by amount relative to serving.
 * Uses stored per-serving values only; never recomputes calories from 4*P+9*F+4*C
 * (MacroFactor and others use reported / Atwater-specific values).
 *
 * Scaling (MacroFactor-style): factor = (amount in servings) or (amount in g / serving size in g).
 * Result = per-serving value * factor; round at end.
 *
 * @param {Object} customFood - { serving_size, serving_unit, calories, protein?, fat?, carbs? }
 * @param {number} amount
 * @param {string} unit
 * @returns {Object} { protein, fat, carbs, calories }
 */
export function calculateMacrosForCustom(customFood, amount, unit) {
  if (!customFood || customFood.calories == null) {
    return { protein: 0, fat: 0, carbs: 0, calories: 0 };
  }
  const numAmount = parseFloat(amount) || 0;
  const serving = parseFloat(customFood.serving_size) || 100;
  const servingUnit = (customFood.serving_unit || 'g').toLowerCase();
  const u = (unit || 'g').toLowerCase().trim();

  let factor;
  if (u === 'serving' || u === 'servings') {
    factor = numAmount;
  } else {
    const amountG = convertToGrams(numAmount, u, null);
    const servingG = convertToGrams(serving, servingUnit, null);
    factor = servingG > 0 ? amountG / servingG : 0;
  }

  const perCal = parseFloat(customFood.calories) || 0;
  const perProt = (customFood.protein != null && !isNaN(parseFloat(customFood.protein))) ? parseFloat(customFood.protein) : 0;
  const perFat = (customFood.fat != null && !isNaN(parseFloat(customFood.fat))) ? parseFloat(customFood.fat) : 0;
  const perCarb = (customFood.carbs != null && !isNaN(parseFloat(customFood.carbs))) ? parseFloat(customFood.carbs) : 0;

  const cal = perCal * factor;
  const prot = perProt * factor;
  const fatVal = perFat * factor;
  const carb = perCarb * factor;

  return {
    protein: Math.round(prot * 10) / 10,
    fat: Math.round(fatVal * 10) / 10,
    carbs: Math.round(carb * 10) / 10,
    calories: Math.round(cal),
  };
}
