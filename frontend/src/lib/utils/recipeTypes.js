/**
 * Recipe and ingredient types for food aggregates.
 * @typedef {{ id?: number, profile_id?: number, name: string, brand?: string, servings: number, total_calories: number, total_protein: number, total_fat: number, total_carbs: number, ingredients?: RecipeIngredient[] }} Recipe
 * @typedef {{ id?: number, recipe_id?: number, food_id?: number, amount: number, unit: string, ingredient_json?: IngredientSnapshot }} RecipeIngredient
 * @typedef {{ name?: string, serving_size: number, serving_unit: string, calories: number, protein?: number, fat?: number, carbs?: number }} IngredientSnapshot
 */

export const RECIPE_UNITS = ['g', 'oz', 'serving', 'servings', 'cup', 'cups', 'tbsp', 'tsp'];
