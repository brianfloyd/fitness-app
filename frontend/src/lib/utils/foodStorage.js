/**
 * LocalStorage utilities for managing common/frequently used foods
 * Stores food data to avoid repeated API calls and enable quick-add functionality
 */

const STORAGE_KEY = 'fitness_common_foods';
const MAX_COMMON_FOODS = 30; // Limit to top 30 most used foods

/**
 * Get all common foods from localStorage
 * @returns {Array} Array of common food objects
 */
export function getCommonFoods() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const foods = JSON.parse(stored);
    return Array.isArray(foods) ? foods : [];
  } catch (error) {
    console.error('Error reading common foods from localStorage:', error);
    return [];
  }
}

/**
 * Save common foods to localStorage
 * @param {Array} foods - Array of common food objects
 */
export function saveCommonFoods(foods) {
  try {
    // Limit to top N foods by usage count
    const sorted = foods
      .sort((a, b) => {
        // Favorites first, then by usage count
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return (b.usageCount || 0) - (a.usageCount || 0);
      })
      .slice(0, MAX_COMMON_FOODS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch (error) {
    console.error('Error saving common foods to localStorage:', error);
  }
}

/**
 * Add or update a food in common foods
 * @param {Object} foodData - Full USDA food data object
 * @param {number} amount - Amount used
 * @param {string} unit - Unit used
 */
export function trackFoodUsage(foodData, amount, unit) {
  const commonFoods = getCommonFoods();
  const fdcId = foodData.fdcId;
  const today = new Date().toISOString().split('T')[0];
  
  // Find existing food
  const existingIndex = commonFoods.findIndex(f => f.fdcId === fdcId);
  
  if (existingIndex >= 0) {
    // Update existing
    commonFoods[existingIndex] = {
      ...commonFoods[existingIndex],
      usageCount: (commonFoods[existingIndex].usageCount || 0) + 1,
      lastUsed: today,
      lastAmount: amount,
      lastUnit: unit,
      // Update foodData in case it changed
      foodData: foodData,
    };
  } else {
    // Add new
    commonFoods.push({
      fdcId: fdcId,
      name: foodData.description || foodData.brandOwner || 'Unknown Food',
      brand: foodData.brandOwner || null,
      dataType: foodData.dataType || 'Unknown',
      foodData: foodData,
      usageCount: 1,
      lastUsed: today,
      lastAmount: amount,
      lastUnit: unit,
      isFavorite: false,
      availableUnits: extractAvailableUnits(foodData),
    });
  }
  
  saveCommonFoods(commonFoods);
  return commonFoods;
}

/**
 * Toggle favorite status of a food
 * @param {number} fdcId - FDC ID of the food
 */
export function toggleFavorite(fdcId) {
  const commonFoods = getCommonFoods();
  const food = commonFoods.find(f => f.fdcId === fdcId);
  if (food) {
    food.isFavorite = !food.isFavorite;
    saveCommonFoods(commonFoods);
  }
  return commonFoods;
}

/**
 * Remove a food from common foods
 * @param {number} fdcId - FDC ID of the food
 */
export function removeCommonFood(fdcId) {
  const commonFoods = getCommonFoods().filter(f => f.fdcId !== fdcId);
  saveCommonFoods(commonFoods);
  return commonFoods;
}

/**
 * Get a common food by FDC ID
 * @param {number} fdcId - FDC ID of the food
 * @returns {Object|null} Common food object or null
 */
export function getCommonFood(fdcId) {
  return getCommonFoods().find(f => f.fdcId === fdcId) || null;
}

/**
 * Extract available units from USDA food data
 * @param {Object} foodData - USDA food data object
 * @returns {Array} Array of available unit strings
 */
function extractAvailableUnits(foodData) {
  const units = ['g', 'oz']; // Always available
  
  // Add serving size if available
  if (foodData.servingSize && foodData.servingSizeUnit) {
    if (!units.includes(foodData.servingSizeUnit.toLowerCase())) {
      units.push(foodData.servingSizeUnit.toLowerCase());
    }
    units.push('serving');
  }
  
  // Add food portions (cups, etc.)
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
 * Clear all common foods (for testing/reset)
 */
export function clearCommonFoods() {
  localStorage.removeItem(STORAGE_KEY);
}
