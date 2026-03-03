<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import FoodSearch from './FoodSearch.svelte';
  import FoodEntry from './FoodEntry.svelte';
  import CommonFoods from './CommonFoods.svelte';
  import RecipeEditor from './RecipeEditor.svelte';
  import { getFoodDetails, getRecipes, getRecipeById, deleteRecipe } from './api.js';
  import { getCommonFoods, trackFoodUsage } from './utils/foodStorage.js';
  import { calculateMacros, calculateMacrosForCustom } from './utils/foodConversions.js';
  
  export let foods = []; // Array of food entries
  
  const dispatch = createEventDispatcher();
  
  let commonFoods = [];
  let totalMacros = { protein: 0, fat: 0, carbs: 0, calories: 0 };
  let foodTab = 'foods'; // 'foods' | 'recipes'
  let showRecipeEditor = false;
  let editingRecipe = null;
  let recipesList = [];
  let recipeSearchQuery = '';
  
  $: filteredRecipes = recipeSearchQuery.trim().length >= 1
    ? recipesList.filter((r) => r.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()))
    : recipesList;
  
  async function loadRecipes() {
    try {
      const res = await getRecipes();
      recipesList = res.recipes || [];
    } catch (e) {
      recipesList = [];
    }
  }
  
  // Load common foods on mount
  onMount(() => {
    commonFoods = getCommonFoods();
    loadRecipes();
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
      (updatedFood.id && f?.id === updatedFood.id) ||
      (updatedFood.customFoodId != null && f?.customFoodId === updatedFood.customFoodId) ||
      (updatedFood.fdcId != null && f?.fdcId === updatedFood.fdcId) ||
      (updatedFood.recipeId != null && f?.recipeId === updatedFood.recipeId && f?.id === updatedFood.id);

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
    const { entryId, fdcId, customFoodId, recipeId } = event.detail || {};
    const index = foods.findIndex((f, i) => {
      if (!f) return false;
      const id = f.id || (f.customFoodId != null ? `custom-${f.customFoodId}` : f.recipeId != null ? `recipe-${f.recipeId}` : String(f.fdcId)) || `food-${i}`;
      if (entryId) return id === entryId;
      if (recipeId != null && f.recipeId === recipeId) return true;
      if (customFoodId != null) return f.customFoodId === customFoodId;
      return f.fdcId === fdcId;
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
  
  function addRecipeToDay(recipe) {
    const serv = recipe.servings ?? 1;
    const perCal = (recipe.total_calories ?? 0) / serv;
    const perP = (recipe.total_protein ?? 0) / serv;
    const perF = (recipe.total_fat ?? 0) / serv;
    const perC = (recipe.total_carbs ?? 0) / serv;
    const customFood = {
      serving_size: 1,
      serving_unit: 'serving',
      calories: perCal,
      protein: perP,
      fat: perF,
      carbs: perC,
    };
    const macros = calculateMacrosForCustom(customFood, 1, 'serving');
    const foodEntry = {
      id: `recipe-${recipe.id}-${Date.now()}-${Math.random()}`,
      recipeId: recipe.id,
      name: recipe.name,
      brand: recipe.brand ?? null,
      amount: 1,
      unit: 'serving',
      customFood,
      protein: macros.protein,
      fat: macros.fat,
      carbs: macros.carbs,
      calories: macros.calories,
    };
    const newFoods = [...foods, foodEntry];
    foods = newFoods;
    dispatch('change', newFoods);
  }
  
  function openNewRecipe() {
    editingRecipe = null;
    recipeLoadError = null;
    showRecipeEditor = true;
  }
  
  let recipeLoadError = null;
  async function openEditRecipe(recipe) {
    recipeLoadError = null;
    if (!recipe?.id) return;
    try {
      editingRecipe = await getRecipeById(recipe.id);
      showRecipeEditor = true;
    } catch (e) {
      console.error('Failed to load recipe:', e);
      recipeLoadError = e.message || 'Failed to load recipe';
    }
  }
  
  function handleRecipeSaved() {
    loadRecipes();
  }
  
  function handleRecipeEditorClose() {
    showRecipeEditor = false;
    editingRecipe = null;
    recipeLoadError = null;
  }

  function handleRecipeDeleted() {
    loadRecipes();
  }

  async function deleteRecipeFromCard(r, event) {
    event?.stopPropagation?.();
    if (!r?.id) return;
    if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    try {
      await deleteRecipe(r.id);
      loadRecipes();
    } catch (e) {
      console.error('Failed to delete recipe:', e);
      alert(e.message || 'Failed to delete recipe');
    }
  }
</script>

<div class="food-tracker">
  <div class="food-tracker-tabs">
    <button type="button" class="tab-btn" class:active={foodTab === 'foods'} on:click={() => foodTab = 'foods'}>Foods</button>
    <button type="button" class="tab-btn" class:active={foodTab === 'recipes'} on:click={() => foodTab = 'recipes'}>Recipes</button>
  </div>
  
  {#if foodTab === 'foods'}
    <FoodSearch on:foodSelected={handleFoodSelected} />
      <CommonFoods
      {commonFoods}
      on:update={handleCommonFoodsUpdate}
      on:foodAdded={handleFoodAdded}
    />
  {:else}
    <div class="recipe-picker">
      <div class="recipe-picker-actions">
        <button type="button" class="new-recipe-btn" on:click={openNewRecipe}>New recipe</button>
        <input type="text" class="recipe-search-input" placeholder="Search recipes by name..." bind:value={recipeSearchQuery} />
      </div>
      {#if recipeLoadError}
        <p class="recipe-load-error">{recipeLoadError}</p>
      {/if}
      <div class="recipe-cards">
        {#each filteredRecipes as r}
          {@const perCal = r.servings > 0 ? (r.total_calories / r.servings) : 0}
          {@const perP = r.servings > 0 ? (r.total_protein / r.servings) : 0}
          <div class="recipe-card" role="button" tabindex="0" on:click={() => addRecipeToDay(r)} on:keydown={(e) => e.key === 'Enter' && addRecipeToDay(r)}>
            <div class="recipe-card-name">{r.name}</div>
            {#if r.brand}<div class="recipe-card-brand">{r.brand}</div>{/if}
            <div class="recipe-card-macros">Per serving: {Math.round(perCal)} cal · P {Math.round(perP * 10) / 10}g</div>
            <div class="recipe-card-buttons">
              <button type="button" class="recipe-card-add-btn" on:click|stopPropagation={() => addRecipeToDay(r)}>+</button>
              <button type="button" class="recipe-card-edit-btn" on:click|stopPropagation={() => openEditRecipe(r)} title="Edit recipe">Edit</button>
              <button type="button" class="recipe-card-delete-btn" on:click|stopPropagation={(e) => deleteRecipeFromCard(r, e)} title="Delete recipe">Delete</button>
            </div>
          </div>
        {/each}
      </div>
      {#if filteredRecipes.length === 0 && (recipeSearchQuery.trim() || recipesList.length === 0)}
        <p class="recipe-picker-empty">No recipes yet. Create one with &quot;New recipe&quot;.</p>
      {:else if filteredRecipes.length === 0}
        <p class="recipe-picker-empty">No recipes match &quot;{recipeSearchQuery}&quot;.</p>
      {/if}
    </div>
  {/if}
  
  {#if foods.length > 0}
    <div class="foods-list">
      <div class="foods-list-header">
        <span class="added-foods-count">Added Foods ({foods.length})</span>
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
      <p>No foods added yet. Search above or use recent foods.</p>
    </div>
  {/if}
</div>

<RecipeEditor
  visible={showRecipeEditor}
  recipe={editingRecipe}
  on:saved={handleRecipeSaved}
  on:deleted={handleRecipeDeleted}
  on:close={handleRecipeEditorClose}
/>

<style>
  .food-tracker {
    margin-bottom: var(--spacing-md);
  }
  
  .foods-list {
    margin-top: var(--spacing-lg);
  }

  .foods-list-header {
    margin-bottom: var(--spacing-md);
  }

  .added-foods-count {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
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
  
  .food-tracker-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: var(--spacing-md);
  }
  .tab-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .tab-btn.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  .recipe-picker {
    margin-bottom: var(--spacing-md);
  }
  .recipe-picker-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    align-items: center;
    margin-bottom: var(--spacing-md);
  }
  .new-recipe-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  .recipe-load-error {
    margin: 0 0 var(--spacing-sm);
    padding: var(--spacing-sm);
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
  }
  .recipe-search-input {
    flex: 1;
    min-width: 160px;
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    background: var(--input-background);
    color: var(--text-primary);
    font-size: 1rem;
  }
  .recipe-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--spacing-sm);
  }
  .recipe-card {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    cursor: pointer;
    text-align: left;
    position: relative;
  }
  .recipe-card:hover {
    border-color: var(--primary-color);
  }
  .recipe-card-name {
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
  }
  .recipe-card-brand {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    width: 100%;
  }
  .recipe-card-macros {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    width: 100%;
  }
  .recipe-card-buttons {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .recipe-card-add-btn {
    padding: 4px 10px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    font-size: 1rem;
    cursor: pointer;
    line-height: 1;
  }
  .recipe-card-edit-btn {
    padding: 2px 8px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    cursor: pointer;
  }
  .recipe-card-edit-btn:hover {
    color: var(--text-primary);
  }
  .recipe-card-delete-btn {
    padding: 2px 8px;
    background: transparent;
    border: 1px solid #dc2626;
    color: #f87171;
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    cursor: pointer;
  }
  .recipe-card-delete-btn:hover {
    background: rgba(220, 38, 38, 0.15);
    color: #fca5a5;
  }
  .recipe-picker-empty {
    margin: var(--spacing-md) 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
</style>
