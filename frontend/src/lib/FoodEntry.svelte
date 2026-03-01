<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { calculateMacros, getAvailableUnits, calculateMacrosForCustom, getAvailableUnitsForCustom } from './utils/foodConversions.js';

  export let food = null; // { fdcId?, customFoodId?, name, amount, unit, foodData?, customFood?, protein, fat, carbs, calories }
  export let entryId = ''; // unique key for this log entry (for expand tracking)

  const dispatch = createEventDispatcher();

  let amount = food?.amount || 100;
  let unit = food?.unit || 'g';
  let availableUnits = ['g', 'oz'];
  let lastFoodId = null;
  let updateTimeout = null;
  let lastSyncedAmount = null;
  let lastSyncedUnit = null;
  let expanded = false;

  $: isCustom = food?.customFoodId != null;

  onDestroy(() => {
    if (updateTimeout) clearTimeout(updateTimeout);
  });

  $: if (food && (food.fdcId !== lastFoodId || (isCustom && food.customFoodId !== lastFoodId))) {
    lastFoodId = isCustom ? food.customFoodId : food.fdcId;
    availableUnits = isCustom && food.customFood
      ? getAvailableUnitsForCustom(food.customFood)
      : (food.foodData ? getAvailableUnits(food.foodData) : ['g', 'oz']);
    amount = food.amount ?? (food.customFood ? food.customFood.serving_size : 100);
    unit = food.unit || (food.customFood ? food.customFood.serving_unit : 'g') || availableUnits[0] || 'g';
    lastSyncedAmount = amount;
    lastSyncedUnit = unit;
  }

  $: if (food && (food.fdcId === lastFoodId || (isCustom && food.customFoodId === lastFoodId))) {
    const amountDiff = food.amount !== undefined && Math.abs((food.amount || 0) - (lastSyncedAmount || 0)) > 0.001;
    const unitDiff = food.unit !== undefined && food.unit && food.unit !== lastSyncedUnit;
    if (amountDiff || unitDiff) {
      if (amountDiff) { amount = food.amount; lastSyncedAmount = amount; }
      if (unitDiff) { unit = food.unit; lastSyncedUnit = unit; }
    }
  }

  function dispatchUpdate() {
    if (!food || (isCustom ? food.customFoodId !== lastFoodId : food.fdcId !== lastFoodId)) return;
    if (updateTimeout) { clearTimeout(updateTimeout); updateTimeout = null; }
    updateTimeout = setTimeout(() => {
      try {
        const numAmount = parseFloat(amount) || 0;
        const macros = isCustom && food.customFood
          ? calculateMacrosForCustom(food.customFood, numAmount, unit)
          : (food.foodData ? calculateMacros(food.foodData, numAmount, unit) : { protein: 0, fat: 0, carbs: 0, calories: 0 });
        const updatedFood = { ...food, amount: numAmount, unit: unit, protein: macros.protein, fat: macros.fat, carbs: macros.carbs, calories: macros.calories };
        lastSyncedAmount = numAmount;
        lastSyncedUnit = unit;
        dispatch('update', updatedFood);
      } catch (e) {
        console.error('Error calculating macros:', e);
      } finally {
        updateTimeout = null;
      }
    }, 150);
  }

  function handleAmountInput() { dispatchUpdate(); }
  function handleUnitChange() { dispatchUpdate(); }

  function handleRemove(e) {
    e?.stopPropagation?.();
    if (!food) return;
    const payload = { entryId };
    if (food.customFoodId != null) payload.customFoodId = food.customFoodId;
    if (food.fdcId != null) payload.fdcId = food.fdcId;
    dispatch('remove', payload);
  }

  function toggleExpand(e) {
    if (e?.target?.closest?.('.remove-btn')) return;
    expanded = !expanded;
  }

  $: currentMacros = (() => {
    if (!food) return { protein: 0, fat: 0, carbs: 0, calories: 0 };
    if (isCustom && food.customFood) return calculateMacrosForCustom(food.customFood, amount, unit);
    if (food.foodData) return calculateMacros(food.foodData, amount, unit);
    return { protein: food.protein || 0, fat: food.fat || 0, carbs: food.carbs || 0, calories: food.calories || 0 };
  })();

</script>

{#if food}
  <div class="food-entry food-result-card" class:expanded role="button" tabindex="0" on:click={toggleExpand} on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), toggleExpand(e)) : null}>
    <div class="food-result-info">
      <div class="food-result-header">
        <span class="food-result-name" title={food.name}>{food.name}</span>
        <span class="food-result-badge logged-badge">Logged</span>
      </div>
      {#if food.brand}
        <div class="food-result-brand">{food.brand}</div>
      {/if}
      <div class="food-result-macros">
        <span class="macro-cal">{Math.round(currentMacros.calories)} cal</span>
        <span class="macro-sep">·</span>
        <span class="macro-serving">{amount}{unit}</span>
        <span class="macro-sep">·</span>
        <span class="macro-p">P {currentMacros.protein.toFixed(1)}g</span>
        <span class="macro-sep">·</span>
        <span class="macro-f">F {currentMacros.fat.toFixed(1)}g</span>
        <span class="macro-sep">·</span>
        <span class="macro-c">C {currentMacros.carbs.toFixed(1)}g</span>
      </div>
      {#if expanded}
        <div class="food-entry-edit" on:click|stopPropagation role="presentation">
          <label class="edit-label" for="amount-{entryId}">Amount</label>
          <div class="food-amount-unit">
            <input
              id="amount-{entryId}"
              type="number"
              class="amount-input"
              bind:value={amount}
              on:input={handleAmountInput}
              on:click|stopPropagation
              step="0.1"
              min="0"
              placeholder="Amount"
            />
            <select class="unit-select" bind:value={unit} on:change={handleUnitChange} on:click|stopPropagation>
              {#each availableUnits as u}
                <option value={u}>{u}</option>
              {/each}
            </select>
          </div>
        </div>
      {/if}
    </div>
    <button
      type="button"
      class="remove-food-btn"
      on:click={(e) => { e.stopPropagation(); handleRemove(e); }}
      title="Remove food"
      aria-label="Remove {food.name}"
    >×</button>
  </div>
{/if}

<style>
  /* Match FoodSearch .food-result card styling */
  .food-entry.food-result-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.15s;
  }

  .food-entry.food-result-card:hover {
    background-color: var(--surface-elevated);
    border-color: var(--primary-color);
  }

  .food-entry.food-result-card:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--primary-color);
  }

  .food-result-info {
    flex: 1;
    min-width: 0;
  }

  .food-result-header {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-sm);
    margin-bottom: 2px;
  }

  .food-result-name {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--text-primary);
    word-break: break-word;
    line-height: 1.3;
  }

  .food-result-brand {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }

  .food-result-macros {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .macro-cal {
    font-weight: 600;
    color: var(--text-secondary);
  }

  .macro-sep {
    color: var(--border);
    margin: 0 1px;
  }

  .macro-p { color: #3b82f6; }
  .macro-f { color: #f59e0b; }
  .macro-c { color: #10b981; }

  .macro-serving {
    color: var(--text-muted);
  }

  .food-result-badge.logged-badge {
    padding: 2px 6px;
    border-radius: var(--border-radius-sm);
    font-size: 0.65rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
    background-color: rgba(16, 185, 129, 0.2);
    color: #10b981;
  }

  .remove-food-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    border-radius: 50%;
    transition: background-color 0.15s, color 0.15s;
    line-height: 1;
  }

  .remove-food-btn:hover {
    background-color: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .food-entry-edit {
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--border);
    cursor: default;
  }

  .edit-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: var(--spacing-xs);
  }

  .food-amount-unit {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .amount-input {
    flex: 2;
    min-width: 80px;
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background-color: var(--surface-elevated);
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .amount-input:focus {
    border-color: var(--primary-color);
    outline: none;
  }

  .unit-select {
    flex: 0 0 auto;
    min-width: 56px;
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background-color: var(--surface-elevated);
    color: var(--text-primary);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .unit-select:focus {
    border-color: var(--primary-color);
    outline: none;
  }

  @media (max-width: 767px) {
    .food-result-name {
      font-size: 1rem;
    }
    .food-result-macros {
      font-size: 0.875rem;
    }
    .amount-input,
    .unit-select {
      font-size: 1.125rem;
      padding: var(--spacing-md);
      min-height: 2.75rem;
    }
  }
</style>

