<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import FoodSearch from './FoodSearch.svelte';
  import FoodEntry from './FoodEntry.svelte';
  import CommonFoods from './CommonFoods.svelte';
  import { getFoodDetails } from './api.js';
  import { getCommonFoods, trackFoodUsage } from './utils/foodStorage.js';
  import { calculateMacros, calculateMacrosForCustom } from './utils/foodConversions.js';
  
  export let foods = []; // Array of food entries
  
  const dispatch = createEventDispatcher();
  
  let commonFoods = [];
  let totalMacros = { protein: 0, fat: 0, carbs: 0, calories: 0 };
  
  // Load common foods on mount
  onMount(() => {
    commonFoods = getCommonFoods();
  });
  
  // Reload common foods whenever foods array reference changes (new date/page loaded)
  // This ensures recent foods are always visible on every page
  $: if (foods !== undefined) {
    const currentFoods = getCommonFoods();
    // Update if the data actually changed (avoid unnecessary re-renders)
    if (currentFoods.length !== commonFoods.length || 
        currentFoods.some((f, i) => !commonFoods[i] || f.fdcId !== commonFoods[i].fdcId || 
        f.usageCount !== commonFoods[i]?.usageCount)) {
      commonFoods = currentFoods;
    }
  }
  
  // Calculate total macros from foods
  $: totalMacros = foods.reduce((acc, food) => ({
    protein: acc.protein + (food.protein || 0),
    fat: acc.fat + (food.fat || 0),
    carbs: acc.carbs + (food.carbs || 0),
    calories: acc.calories + (food.calories || 0),
  }), { protein: 0, fat: 0, carbs: 0, calories: 0 });
  
  // Dispatch totals to parent
  $: dispatch('totals', totalMacros);

  async function handleFoodSelected(event) {
    const food = event.detail;
    const isCustom = food.customFoodId != null || food.source === 'custom';

    const existingIndex = foods.findIndex(f => {
      if (!f) return false;
      if (isCustom) return f.customFoodId === food.customFoodId;
      return f.fdcId === food.fdcId;
    });
    if (existingIndex >= 0) return;

    if (isCustom) {
      const customFood = {
        serving_size: food.serving_size ?? food.servingSize ?? 100,
        serving_unit: food.serving_unit || food.servingSizeUnit || 'g',
        calories: food.calories ?? 0,
        protein: food.protein ?? null,
        fat: food.fat ?? null,
        carbs: food.carbs ?? null,
      };
      const defaultAmount = customFood.serving_size;
      const defaultUnit = customFood.serving_unit;
      const macros = calculateMacrosForCustom(customFood, defaultAmount, defaultUnit);
      const foodEntry = {
        id: `custom-${food.customFoodId}-${Date.now()}-${Math.random()}`,
        customFoodId: food.customFoodId,
        name: food.name || food.description || 'Custom food',
        brand: food.brand ?? food.brandOwner ?? null,
        amount: defaultAmount,
        unit: defaultUnit,
        customFood: customFood,
        protein: macros.protein,
        fat: macros.fat,
        carbs: macros.carbs,
        calories: macros.calories,
      };
      const newFoods = [...foods, foodEntry];
      foods = newFoods;
      dispatch('change', newFoods);
      return;
    }

    const commonFood = commonFoods.find(cf => cf.fdcId === food.fdcId);
    let foodData;
    if (commonFood && commonFood.foodData) {
      foodData = commonFood.foodData;
    } else {
      try {
        foodData = await getFoodDetails(food.fdcId, 'full');
      } catch (error) {
        console.error('Error fetching food details:', error);
        alert('Failed to load food details. Please try again.');
        return;
      }
    }
    const defaultAmount = commonFood?.lastAmount || 100;
    const defaultUnit = commonFood?.lastUnit || 'g';
    const macros = calculateMacros(foodData, defaultAmount, defaultUnit);
    const foodEntry = {
      id: `${foodData.fdcId}-${Date.now()}-${Math.random()}`,
      fdcId: foodData.fdcId,
      name: foodData.description || foodData.brandOwner || 'Unknown Food',
      brand: foodData.brandOwner || null,
      amount: defaultAmount,
      unit: defaultUnit,
      foodData: foodData,
      protein: macros.protein,
      fat: macros.fat,
      carbs: macros.carbs,
      calories: macros.calories,
    };
    const newFoods = [...foods, foodEntry];
    foods = newFoods;
    dispatch('change', newFoods);
    const updated = trackFoodUsage(foodData, defaultAmount, defaultUnit);
    commonFoods = updated;
  }
  
  function handleFoodAdded(event) {
    const foodEntry = event.detail;
    const key = (f) => (f?.customFoodId != null ? `c-${f.customFoodId}` : f?.fdcId != null ? `f-${f.fdcId}` : null);
    const entryKey = key(foodEntry);
    const existingIndex = entryKey ? foods.findIndex(f => key(f) === entryKey) : -1;
    if (existingIndex >= 0) {
      const updatedFoods = foods.map((f, i) =>
        i === existingIndex ? { ...foodEntry, id: f.id || (foodEntry.customFoodId ? `custom-${foodEntry.customFoodId}` : `${foodEntry.fdcId}`) + `-${Date.now()}` } : f
      );
      foods = updatedFoods;
      dispatch('change', updatedFoods);
    } else {
      if (!foodEntry.id) {
        foodEntry.id = foodEntry.customFoodId
          ? `custom-${foodEntry.customFoodId}-${Date.now()}-${Math.random()}`
          : `${foodEntry.fdcId}-${Date.now()}-${Math.random()}`;
      }
      const newFoods = [...foods, foodEntry];
      foods = newFoods;
      dispatch('change', newFoods);
    }
    if (foodEntry.foodData) {
      const updated = trackFoodUsage(foodEntry.foodData, foodEntry.amount, foodEntry.unit);
      commonFoods = updated;
    }
  }
  
  function handleFoodUpdate(event) {
    const updatedFood = event.detail;
    if (!updatedFood) return;
    const match = (f) =>
      (updatedFood.customFoodId != null && f?.customFoodId === updatedFood.customFoodId) ||
      (updatedFood.fdcId != null && f?.fdcId === updatedFood.fdcId);

    const newFoods = foods.map(f => {
      if (match(f)) {
        return { ...updatedFood, id: f.id || (updatedFood.customFoodId ? `custom-${updatedFood.customFoodId}` : `${updatedFood.fdcId}`) + `-${Date.now()}` };
      }
      return f;
    });

    const seen = new Set();
    const deduplicated = newFoods.filter(f => {
      if (!f) return false;
      const k = f.id || (f.customFoodId != null ? `c-${f.customFoodId}` : `f-${f.fdcId}`);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    foods = deduplicated;
    dispatch('change', deduplicated);
  }

  function handleFoodRemove(event) {
    const { entryId, fdcId, customFoodId } = event.detail || {};
    const index = foods.findIndex((f, i) => {
      if (!f) return false;
      const id = f.id || (f.customFoodId != null ? `custom-${f.customFoodId}` : String(f.fdcId)) || `food-${i}`;
      return entryId ? id === entryId : (customFoodId != null ? f.customFoodId === customFoodId : f.fdcId === fdcId);
    });
    if (index >= 0) {
      const newFoods = foods.filter((_, i) => i !== index);
      foods = newFoods;
      dispatch('change', newFoods);
    }
  }
  
  function handleCommonFoodsUpdate(event) {
    commonFoods = event.detail;
  }
</script>

<div class="food-tracker">
  <CommonFoods
    {commonFoods}
    on:update={handleCommonFoodsUpdate}
    on:foodAdded={handleFoodAdded}
  />
  
  <FoodSearch on:foodSelected={handleFoodSelected} />
  
  {#if foods.length > 0}
    <div class="foods-list">
      <div class="foods-list-header">
        <h4>Added Foods ({foods.length})</h4>
        <div class="food-totals">
          <span class="total-label">Total:</span>
          <span class="total-macro protein">{totalMacros.protein.toFixed(1)}g</span>
          <span class="total-macro fat">{totalMacros.fat.toFixed(1)}g</span>
          <span class="total-macro carbs">{totalMacros.carbs.toFixed(1)}g</span>
          <span class="total-macro calories">{totalMacros.calories} cal</span>
        </div>
      </div>
      
      <div class="food-entries">
        {#each foods as food (food.id || (food.customFoodId != null ? `custom-${food.customFoodId}` : food.fdcId) || `food-${foods.indexOf(food)}`)}
          {@const entryId = food.id || (food.customFoodId != null ? `custom-${food.customFoodId}` : String(food.fdcId)) || `food-${foods.indexOf(food)}`}
          <div class="food-entry-cell">
            <FoodEntry
              {food}
              {entryId}
              on:update={handleFoodUpdate}
              on:remove={handleFoodRemove}
            />
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>No foods added yet. Search for foods above or use common foods.</p>
    </div>
  {/if}
</div>

<style>
  .food-tracker {
    margin-bottom: var(--spacing-md);
  }
  
  .foods-list {
    margin-top: var(--spacing-lg);
  }
  
  .foods-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
  
  .foods-list-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .food-totals {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.875rem;
  }
  
  .total-label {
    color: var(--text-secondary);
    font-weight: 600;
  }
  
  .total-macro {
    font-weight: 600;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    background-color: var(--surface);
    border: 1px solid var(--border);
  }
  
  .total-macro.protein {
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.3);
  }
  
  .total-macro.fat {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
  }
  
  .total-macro.carbs {
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.3);
  }
  
  .total-macro.calories {
    color: var(--text-primary);
  }
  
  .food-entries {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-xs);
    align-items: start;
  }

  .food-entry-cell {
    min-width: 0;
  }

  @media (max-width: 900px) {
    .food-entries {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .food-entries {
      grid-template-columns: 1fr;
    }
  }
  
  .empty-state {
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .empty-state p {
    margin: 0;
  }
</style>
